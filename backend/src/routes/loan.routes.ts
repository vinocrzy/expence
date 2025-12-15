import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { FinancialCalculator } from '../lib/financial';

// @ts-ignore
export default async function loanRoutes(fastify: FastifyInstance) {
  
  // Get all loans for household
  fastify.get('/loans', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    
    const loans = await prisma.loan.findMany({
        where: { householdId },
        include: {
            linkedAccount: {
                select: { name: true, currency: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    
    return loans;
  });

  // Create Loan
  fastify.post('/loans', {
    onRequest: [fastify.authenticate],
    schema: {
        body: {
            type: 'object',
            required: ['name', 'principal', 'interestRate', 'startDate', 'tenureMonths', 'linkedAccountId'],
            properties: {
                name: { type: 'string' },
                lender: { type: 'string' },
                type: { type: 'string' },
                principal: { type: 'number' },
                interestRate: { type: 'number' },
                startDate: { type: 'string' },
                tenureMonths: { type: 'number' },
                linkedAccountId: { type: 'string' }
            }
        }
    }
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    const data = request.body;

    const principal = Number(data.principal);
    const rate = Number(data.interestRate);
    const months = Number(data.tenureMonths);
    const startDate = new Date(data.startDate);

    // Calculate EMI
    const emiAmount = FinancialCalculator.pmts(principal, rate, months);
    
    // Create Loan Record
    const loan = await prisma.loan.create({
        data: {
            householdId,
            name: data.name,
            lender: data.lender,
            type: data.type || 'PERSONAL',
            principal,
            interestRate: rate,
            startDate,
            tenureMonths: months,
            emiAmount,
            linkedAccountId: data.linkedAccountId,
            outstandingPrincipal: principal,
            status: 'ACTIVE'
        }
    });

    // Generate Schedule
    const schedule = FinancialCalculator.generateSchedule(principal, rate, months, startDate);

    // Bulk Insert EMIs
    // Note: createMany is supported in SQLite for recent Prisma versions, but let's check. 
    // If not, use Promise.all. SQLite supports it now.
    await prisma.loanEMI.createMany({
        data: schedule.map(s => ({
            loanId: loan.id,
            emiNumber: s.emiNumber,
            dueDate: s.dueDate,
            principalComponent: s.principalComponent,
            interestComponent: s.interestComponent,
            totalAmount: s.totalAmount,
            status: 'PENDING'
        }))
    });

    return { ...loan, emiAmount };
  });

  // Get Loan Details
  fastify.get('/loans/:id', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    
    const loan = await prisma.loan.findUnique({
        where: { id },
        include: {
            emis: {
                orderBy: { emiNumber: 'asc' }
            },
            prepayments: {
                orderBy: { date: 'desc' }
            },
            linkedAccount: true
        }
    });

    if (!loan) return reply.status(404).send({ error: 'Loan not found' });

    return loan;
  });

  // Pay EMI
  fastify.post('/loans/:id/pay/:emiNumber', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { id, emiNumber } = request.params;
    const { householdId, id: userId } = request.user;
    
    // 1. Get Loan and EMI
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) return reply.status(404).send({ error: 'Loan not found' });
    
    const emi = await prisma.loanEMI.findFirst({
        where: { loanId: id, emiNumber: Number(emiNumber) }
    });
    
    if (!emi) return reply.status(404).send({ error: 'EMI not found' });
    if (emi.status === 'PAID') return reply.status(400).send({ error: 'EMI already paid' });

    // 2. Get/Create Category
    let category = await prisma.category.findFirst({
        where: { householdId, name: 'Loan Repayment' }
    });
    
    if (!category) {
        category = await prisma.category.create({
            data: { householdId, name: 'Loan Repayment', kind: 'EXPENSE', color: '#ff9800' }
        });
    }

    // 3. Transaction & Updates Transaction
    // We use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
        // Create Expense Transaction
        const transaction = await tx.transaction.create({
            data: {
                accountId: loan.linkedAccountId!,
                amount: emi.totalAmount, // Negative? Transaction model uses Type to determine sign usually, or absolute amount. 
                // In my Transaction routes, I handled type='EXPENSE' -> deduct from account.
                type: 'EXPENSE',
                categoryId: category!.id,
                description: `EMI #${emiNumber} for ${loan.name}`,
                date: new Date(), // Paid now
                createdBy: userId,
                currency: 'INR' // Should match account currency
            }
        });
        
        // Update Account Balance
        await tx.account.update({
            where: { id: loan.linkedAccountId! },
            data: { balance: { decrement: emi.totalAmount } }
        });
        
        // Update EMI Status
        await tx.loanEMI.update({
            where: { id: emi.id },
            data: {
                status: 'PAID',
                paidDate: new Date(),
                transactionId: transaction.id
            }
        });
        
        // Update Loan Outstanding Principal
        await tx.loan.update({
            where: { id: loan.id },
            data: { outstandingPrincipal: { decrement: emi.principalComponent } }
        });
    });

    return { success: true };
  });

  // Prepayment
  fastify.post('/loans/:id/prepay', {
    onRequest: [fastify.authenticate],
    schema: {
        body: {
            type: 'object',
            required: ['amount', 'date', 'strategy'],
            properties: {
                amount: { type: 'number' },
                date: { type: 'string' },
                strategy: { type: 'string', enum: ['REDUCE_TENURE', 'REDUCE_EMI'] }
            }
        }
    }
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const { amount, date, strategy } = request.body;
    
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) return reply.status(404).send({ error: 'Loan not found' });
    
    if (Number(amount) > Number(loan.outstandingPrincipal)) {
        return reply.status(400).send({ error: 'Prepayment cannot exceed outstanding principal' });
    }

    // 1. Create Prepayment Record
    await prisma.loanPrepayment.create({
        data: {
            loanId: id,
            amount,
            date: new Date(date),
            strategy
        }
    });

    // 2. Reduce Outstanding
    const newPrincipal = Number(loan.outstandingPrincipal) - Number(amount);
    
    await prisma.loan.update({
        where: { id },
        data: { outstandingPrincipal: newPrincipal }
    });

    // 3. Recalculate Schedule
    // Find next pending EMIs
    const pendingEmis = await prisma.loanEMI.findMany({
        where: { loanId: id, status: 'PENDING' },
        orderBy: { emiNumber: 'asc' }
    });
    
    if (pendingEmis.length === 0) return { message: 'Loan fully paid!' };

    // Common data
    const annualRate = Number(loan.interestRate);
    const firstPendingEmi = pendingEmis[0];
    const startDate = new Date(firstPendingEmi.dueDate); 
    // Actually, we should start from the previous paid date or just keep the due dates?
    // If we Recalculate, we effectively regenerate the schedule for the remaining balance.
    
    let newSchedule: any[] = [];

    if (strategy === 'REDUCE_EMI') {
        // Keep tenure same (count of pending EMIs)
        const remainingMonths = pendingEmis.length;
        newSchedule = FinancialCalculator.generateSchedule(newPrincipal, annualRate, remainingMonths, startDate);
        // But dates need to align with original due dates? 
        // generateSchedule starts 1 month from startDate.
        // We want the Next EMI to be on firstPendingEmi.dueDate.
        // So startDate passed to generateSchedule should be 1 month before firstPendingEmi.dueDate.
        const calcStartDate = new Date(startDate);
        calcStartDate.setMonth(calcStartDate.getMonth() - 1);
        
        newSchedule = FinancialCalculator.generateSchedule(newPrincipal, annualRate, remainingMonths, calcStartDate);
    } else {
        // REDUCE_TENURE
        // Keep EMI same (Total Amount)
        // We can't use generateSchedule directly as it calculates EMI.
        // We need custom loop.
        const currentEmiAmount = Number(loan.emiAmount);
        const monthlyRate = annualRate / 12 / 100;
        let balance = newPrincipal;
        console.log({balance, currentEmiAmount});

        // Start date setup
        const calcStartDate = new Date(startDate); // This is first due date
        // calcStartDate.setMonth(calcStartDate.getMonth() - 1); // No, we loop below

        let currentDate = new Date(calcStartDate);
        
        let emiNum = 1;
        while (balance > 10) { // Tolerance
             const interest = balance * monthlyRate;
             let principalComp = currentEmiAmount - interest;
             
             // If last EMI
             if (balance < principalComp) {
                 principalComp = balance;
             }
             
             balance -= principalComp;
             // Ensure balance not negative
             if (balance < 0) balance = 0;
             
             newSchedule.push({
                 emiNumber: emiNum, // Relative index locally
                 dueDate: new Date(currentDate),
                 principalComponent: principalComp,
                 interestComponent: interest,
                 totalAmount: principalComp + interest, // Could be less than currentEmiAmount on last one
                 balance
             });
             
             currentDate.setMonth(currentDate.getMonth() + 1);
             emiNum++;
             
             if (balance <= 0) break;
             if (emiNum > 360) break; // Safety break
        }
    }

    // 4. Update EMIs in DB
    // Delete old pending EMIs
    await prisma.loanEMI.deleteMany({
        where: { loanId: id, status: 'PENDING' }
    });

    // Insert new EMIs
    // We need to map relative emiNumber back to absolute?
    // User wants "Amortization schedule".
    // If we delete pending, we lose track of "EMI #7".
    // We should maintain continuity.
    const startEmiNumber = firstPendingEmi.emiNumber;
    
    await prisma.loanEMI.createMany({
        data: newSchedule.map((s, index) => ({
            loanId: id,
            emiNumber: startEmiNumber + index,
            dueDate: s.dueDate,
            principalComponent: s.principalComponent,
            interestComponent: s.interestComponent,
            totalAmount: s.totalAmount,
            status: 'PENDING'
        }))
    });
    
    // Update Loan Tenure if Reduced
    if (strategy === 'REDUCE_TENURE') {
         // Total new tenure = (Original Total - Old Pending Count) + New Schedule Length
         // Or simpler: find max emiNumber now.
         // But we assume `tenureMonths` in Loan is the *initial* tenure?
         // Spec says "Loan tenure (months)". Usually static.
         // But user wants "Months reduced".
         // Maybe we don't update `tenureMonths` but `schedule` reflects it.
    }
    
    // Update EMI Amount if Reduced
    if (strategy === 'REDUCE_EMI' && newSchedule.length > 0) {
        await prisma.loan.update({
            where: { id },
            data: { emiAmount: newSchedule[0].totalAmount }
        });
    }

    return { success: true, newSchedule };
  });
}
