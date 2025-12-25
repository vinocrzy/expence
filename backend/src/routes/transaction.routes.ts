import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { aggregateMonth } from '../services/analytics.service';

// @ts-ignore
export default async function transactionRoutes(fastify: FastifyInstance) {
  
  // List Transactions
  fastify.get('/transactions', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    const { limit = 50, offset = 0, accountId, updatedAfter } = request.query;

    const where: any = {
        account: {
            householdId
        }
    };

    if (accountId) {
        where.accountId = accountId;
    }

    if (updatedAfter) {
        where.updatedAt = {
            gt: new Date(updatedAfter)
        };
    }

    try {
        const transactions = await prisma.transaction.findMany({
            where,
            take: Number(limit),
            skip: Number(offset),
            orderBy: { date: 'desc' },
            include: { 
                account: true,
                category: true
            }
        });
        return transactions;
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to fetch transactions' });
    }
  });

  // Create Transaction
  fastify.post('/transactions', {
    onRequest: [fastify.authenticate],
    schema: {
        body: {
            type: 'object',
            required: ['amount', 'date', 'accountId', 'type'],
            properties: {
                id: { type: 'string' }, // Allow client-generated ID
                amount: { type: 'number' }, // Sent as number, stored as Decimal
                date: { type: 'string' },
                accountId: { type: 'string' },
                categoryId: { type: 'string' },
                type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'TRANSFER'] },
                description: { type: 'string' },
                budgetId: { type: 'string' }
            }
        }
    }
  }, async (request: any, reply: any) => {
    const { id, amount, date, accountId, categoryId, type, description, budgetId } = request.body;
    const { id: userId, householdId } = request.user;

    try {
        // Verify account belongs to household
        const account = await prisma.account.findFirst({
            where: { id: accountId, householdId }
        });

        if (!account) {
            return reply.status(400).send({ error: 'Invalid account' });
        }

        // Handle balance update logic
        let balanceChange = amount;
        if (type === 'EXPENSE') balanceChange = -Math.abs(amount);
        if (type === 'INCOME') balanceChange = Math.abs(amount);
        
        const transaction = await prisma.$transaction(async (tx: any) => {
            const t = await tx.transaction.create({
                data: {
                    id, // Use client ID if provided
                    amount,
                    date: new Date(date),
                    accountId,
                    categoryId,
                    type,
                    description,
                    budgetId,
                    createdBy: userId,
                    currency: account.currency // Inherit account currency
                },
                include: { account: true, category: true }
            });

            await tx.account.update({
                where: { id: accountId },
                data: {
                    balance: {
                        increment: balanceChange
                    }
                }
            });

            return t;
        });

        // Trigger Analytics Aggregation
        // We catch errors so we don't block the response if analytics fails
        aggregateMonth(householdId, new Date(date)).catch(err => {
            request.log.error(err, 'Failed to update analytics');
        });

        return transaction;
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to create transaction' });
    }
  });

  // Delete Transaction
  fastify.delete('/transactions/:id', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { id } = request.params;
    const { householdId } = request.user;

    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { account: true }
        });

        if (!transaction || transaction.account.householdId !== householdId) {
            return reply.status(404).send({ error: 'Transaction not found' });
        }

        const date = transaction.date;

        // Revert balance
        let balanceRevert = Number(transaction.amount);
        if (transaction.type === 'EXPENSE') balanceRevert = Math.abs(balanceRevert); // Add back expense
        if (transaction.type === 'INCOME') balanceRevert = -Math.abs(balanceRevert); // Deduct income

        await prisma.$transaction(async (tx: any) => {
            await tx.account.update({
                where: { id: transaction.accountId },
                data: {
                    balance: {
                        increment: balanceRevert
                    }
                }
            });
            await tx.transaction.delete({ where: { id } });
        });

        // Trigger Analytics Aggregation
        aggregateMonth(householdId, date).catch(err => {
            request.log.error(err, 'Failed to update analytics');
        });

        return { message: 'Transaction deleted' };
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to delete transaction' });
    }
  });
}
