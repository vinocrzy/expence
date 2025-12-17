import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { startOfMonth, endOfMonth, addDays, subMonths, isAfter, isBefore } from 'date-fns';

// @ts-ignore
export default async function creditCardRoutes(fastify: FastifyInstance) {
  
  // Get all credit cards
  fastify.get('/credit-cards', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    
    // Find Accounts of type CREDIT_CARD with their CreditCard details
    const cards = await prisma.account.findMany({
        where: { householdId, type: 'CREDIT_CARD' },
        include: {
            creditCard: true
        }
    });
    
    return cards;
  });

  // Create Credit Card
  fastify.post('/credit-cards', {
    onRequest: [fastify.authenticate],
    schema: {
        body: {
            type: 'object',
            required: ['name', 'limit', 'billingDay', 'dueDays', 'apr'],
            properties: {
                name: { type: 'string' },
                issuer: { type: 'string' },
                limit: { type: 'number' },
                billingDay: { type: 'number' },
                dueDays: { type: 'number' },
                apr: { type: 'number' } // Annual Percentage Rate
            }
        }
    }
  }, async (request: any, reply: any) => {
    const { householdId, id: userId } = request.user;
    const data = request.body;

    return await prisma.$transaction(async (tx) => {
        // 1. Create Account
        const account = await tx.account.create({
            data: {
                householdId,
                name: data.name,
                type: 'CREDIT_CARD',
                balance: 0, // Outstanding is tracked in CreditCard or we use negative balance?
                // Convention: Credit Card Balance in Account. 
                // Usually Liability is positive in specialized apps, but in standard accounting:
                // Assets = Positive, Liabilities = Negative.
                // However, user prompt says "Outstanding Amount" in CreditCard model.
                // Let's keep Account.balance as "Current Balance" (usually negative for debt).
                // And CreditCard.outstandingAmount as positive number for UI?
                // Let's stick to: Account.balance is key. A spend makes it negative.
                // But wait, the schema has `outstandingAmount` in `CreditCard` model?
                // Let's check schema: `outstandingAmount` IS in `CreditCard`.
                // So we might sync them.
                currency: 'INR'
            }
        });

        // 2. Create CreditCard details
        const cc = await tx.creditCard.create({
            data: {
                accountId: account.id,
                issuer: data.issuer,
                creditLimit: data.limit,
                billingCycleStartDay: data.billingDay,
                dueDays: data.dueDays,
                interestRateMonthly: data.apr / 12, // Convert APR to Monthly
                status: 'ACTIVE',
                outstandingAmount: 0
            }
        });
        
        return { ...account, creditCard: cc };
    });
  });

  // Get Card Details
  fastify.get('/credit-cards/:id', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    
    // We expect ID to be either AccountID or CreditCardID?
    // Let's assume CreditCardID for specificity, or AccountID.
    // Given the routes structure, if we click from Dashboard (Accounts), we have AccountID.
    // If we click from "Credit Cards" list, we might have CreditCardID.
    // Let's support AccountID lookup first as it's the primary entity.
    
    let card = await prisma.creditCard.findFirst({
        where: { accountId: id },
        include: { account: true, statements: { orderBy: { createdAt: 'desc' }, take: 6 } }
    });
    
    if (!card) {
        // Try finding by CreditCard ID
        card = await prisma.creditCard.findUnique({
            where: { id },
             include: { account: true, statements: { orderBy: { createdAt: 'desc' }, take: 6 } }
        });
    }
    
    if (!card) return reply.status(404).send({ error: 'Credit Card not found' });
    
    return card;
  });

  // Charge (Expense)
  fastify.post('/credit-cards/:id/charge', {
    onRequest: [fastify.authenticate],
    schema: {
        body: {
            type: 'object',
            required: ['amount', 'description', 'categoryId', 'date'],
            properties: {
                 amount: { type: 'number' },
                 description: { type: 'string' },
                 categoryId: { type: 'string' },
                 date: { type: 'string' }
            }
        }
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params; // CreditCard ID
    const { householdId, id: userId } = request.user;
    const { amount, description, categoryId, date } = request.body;
    
    const card = await prisma.creditCard.findUnique({ where: { id } });
    if (!card) return reply.status(404).send({ error: 'Card not found' });
    
    // Check Limit
    if (Number(card.outstandingAmount) + amount > Number(card.creditLimit)) {
        return reply.status(400).send({ error: 'Transaction exceeds credit limit' });
    }

    return await prisma.$transaction(async (tx) => {
        // Create Transaction
        const transaction = await tx.transaction.create({
            data: {
                accountId: card.accountId,
                amount,
                type: 'EXPENSE',
                categoryId,
                description,
                date: new Date(date),
                createdBy: userId,
                currency: 'INR'
            }
        });
        
        // Update Outstanding
        await tx.creditCard.update({
            where: { id },
            data: { outstandingAmount: { increment: amount } }
        });
        
        // Update Account Balance (Negative for Liability)
        await tx.account.update({
             where: { id: card.accountId },
             data: { balance: { decrement: amount } }
        });
        
        return transaction;
    });
  });

  // Payment
  fastify.post('/credit-cards/:id/payment', {
    onRequest: [fastify.authenticate],
    schema: {
        body: {
            type: 'object',
            required: ['amount', 'sourceAccountId', 'date'],
             properties: {
                 amount: { type: 'number' },
                 sourceAccountId: { type: 'string' },
                 date: { type: 'string' },
                 type: { type: 'string', enum: ['FULL', 'PARTIAL', 'MINIMUM'] } // Optional hint
            }
        }
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params; // CreditCard ID
    const { householdId, id: userId } = request.user;
    const { amount, sourceAccountId, date, type } = request.body;

    const card = await prisma.creditCard.findUnique({ where: { id } });
    if (!card) return reply.status(404).send({ error: 'Card not found' });

    // Source validation
    const sourceAccount = await prisma.account.findUnique({ where: { id: sourceAccountId } });
    if (!sourceAccount) return reply.status(404).send({ error: 'Source account not found' });
    if (Number(sourceAccount.balance) < amount) return reply.status(400).send({ error: 'Insufficient funds in source account' });

    return await prisma.$transaction(async (tx) => {
        // 1. Transaction (Transfer)
        // From Source -> To Credit Card
        // We represent this as a Transfer.
        // Debit Source
        const debitTx = await tx.transaction.create({
            data: {
                accountId: sourceAccountId,
                amount,
                type: 'EXPENSE', // Or TRANSFER_OUT
                description: `Payment to ${card.issuer || 'Credit Card'}`,
                date: new Date(date),
                createdBy: userId
            }
        });
        
        // Credit Card Account (This is the payment receiving end)
        const creditTx = await tx.transaction.create({
            data: {
                accountId: card.accountId,
                amount,
                type: 'INCOME', // Or TRANSFER_IN, effectively reduces liability
                description: `Payment Received`,
                date: new Date(date),
                createdBy: userId,
                linkedTransactionId: debitTx.id
            }
        });
        
        // Link them
        await tx.transaction.update({
            where: { id: debitTx.id },
            data: { linkedTransactionId: creditTx.id }
        });

        // 2. Update Balances
        await tx.account.update({
            where: { id: sourceAccountId },
            data: { balance: { decrement: amount } }
        });

        // Credit Card Account Balance increases (becomes less negative)
        await tx.account.update({
            where: { id: card.accountId },
            data: { balance: { increment: amount } }
        });

        // 3. Update Credit Card Outstanding (Decreases)
        await tx.creditCard.update({
            where: { id },
            data: { outstandingAmount: { decrement: amount } }
        });

        // 4. Record Payment metadata
        // Check for open statement?
        const openStatement = await tx.creditCardStatement.findFirst({
            where: { creditCardId: id, status: { in: ['OPEN', 'OVERDUE'] } },
            orderBy: { dueDate: 'asc' }
        });

        await tx.creditCardPayment.create({
            data: {
                creditCardId: id,
                statementId: openStatement?.id,
                amount,
                paymentDate: new Date(date),
                paymentType: type || 'PARTIAL',
                transactionId: creditTx.id
            }
        });
        
        // Update statement status if paid fully?
        // Simple logic: if payment >= statement.closingBalance
        if (openStatement) {
             // We need to track how much paid against THIS statement.
             // This is complex. For now, simplistic check.
        }

        return { success: true };
    });
  });

  // Generate Statement
  fastify.post('/credit-cards/:id/generate-statement', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
      if (process.env.ENABLE_CREDIT_CARD_STATEMENTS !== 'true') {
          return reply.status(403).send({ error: 'Feature disabled' });
      }

      const { id } = request.params;
      const card = await prisma.creditCard.findUnique({ where: { id } });
      if (!card) return reply.status(404).send({ error: 'Card not found' });
      
      // Calculate Cycle
      // Assume we are generating for the month ending now?
      // Logic: Billing Day = 15. Today = 15th Nov.
      // Cycle: 16th Oct to 15th Nov.
      const today = new Date();
      const billingDay = card.billingCycleStartDay; // e.g. 15
      
      // Determine cycle end date (should be close to today)
      let cycleEnd = new Date(today.getFullYear(), today.getMonth(), billingDay);
      if (cycleEnd > today) {
          cycleEnd = subMonths(cycleEnd, 1);
      }
      
      const cycleStart = subMonths(cycleEnd, 1);
      cycleStart.setDate(cycleStart.getDate() + 1); // Day after previous billing day? 
      // Simplified: Start = 15th Prev Month. End = 14th This Month?
      // Let's stick to user inputs.
      
      // Fetch Transactions in this range
      const transactions = await prisma.transaction.findMany({
          where: {
              accountId: card.accountId,
              date: { gte: cycleStart, lte: cycleEnd }
          }
      });
      
      const spends = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
      const payments = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
      // Interest Calculation (Simplistic)
      // If previous statement was not paid, charge interest on Avg Daily Balance?
      // For MVP: Flat interest on Opening Balance if Overdue?
      const interest = 0; // Placeholder
      
      const prevStatement = await prisma.creditCardStatement.findFirst({
          where: { creditCardId: id },
          orderBy: { createdAt: 'desc' }
      });
      
      const openingBalance = prevStatement ? Number(prevStatement.closingBalance) : 0;
      const closingBalance = openingBalance + spends - payments + interest;
      const minDue = closingBalance * (Number(card.minimumDuePercent) / 100);
      const dueDate = addDays(cycleEnd, card.dueDays);
      
      const statement = await prisma.creditCardStatement.create({
          data: {
              creditCardId: id,
              cycleStart,
              cycleEnd,
              statementDate: new Date(),
              openingBalance,
              totalSpends: spends,
              totalPayments: payments,
              interestCharged: interest,
              closingBalance: closingBalance > 0 ? closingBalance : 0, // No negative closing balance for statements usually
              minimumDue: minDue > 0 ? minDue : 0,
              dueDate,
              status: 'OPEN'
          }
      });
      
      return statement;
  });

}
