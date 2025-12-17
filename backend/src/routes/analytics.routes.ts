import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

// @ts-ignore
export default async function analyticsRoutes(fastify: FastifyInstance) {
  
  // Monthly Summary (Last 6 Months)
  fastify.get('/analytics/monthly', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    
    try {
        const today = new Date();
        const sixMonthsAgo = subMonths(startOfMonth(today), 5);

        const transactions = await prisma.transaction.findMany({
            where: {
                account: { householdId },
                date: {
                    gte: sixMonthsAgo
                }
            }
        });

        // Aggregate by Month
        const monthlyData = new Map();

        // Initialize last 6 months
        for (let i = 0; i < 6; i++) {
            const d = subMonths(today, i);
            const key = format(d, 'yyyy-MM');
            monthlyData.set(key, { 
                month: format(d, 'MMM'), 
                income: 0, 
                expense: 0 
            });
        }

        transactions.forEach(t => {
            const key = format(new Date(t.date), 'yyyy-MM');
            if (monthlyData.has(key)) {
                const entry = monthlyData.get(key);
                const amt = Number(t.amount);
                if (t.type === 'INCOME') entry.income += amt;
                if (t.type === 'EXPENSE') entry.expense += Math.abs(amt); // Assuming expenses stored as negative or positive based on logic, but let's stick to absolute for charts
                // Wait, in my previous transaction logic: 
                // "if (type === 'EXPENSE') balanceChange = -Math.abs(amount);"
                // "if (type === 'INCOME') balanceChange = Math.abs(amount);"
                // But the transaction record itself stores "amount" as absolute usually or signed?
                // backend/src/routes/transaction.routes.ts says: "amount: { type: 'number' }, // Sent as number, stored as Decimal"
                // It treats input as positive usually. Let's verify DB data.
                // Assuming stored as Positive amount + Type.
            }
        });

        // Convert to array and reverse (oldest first)
        const result = Array.from(monthlyData.values()).reverse();
        return result;

    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to fetch monthly analytics' });
    }
  });

  // Category Breakdown (Current Cycle)
  fastify.get('/analytics/categories', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    
    try {
        const household = await prisma.household.findUnique({ 
            where: { id: householdId } 
        });

        if (!household) return reply.status(404).send({ error: 'Household not found' });

        // Lazy import to avoid circular dep issues if any, or just import at top
        const { getBudgetContext } = require('../lib/budget');
        const { startDate, endDate, description } = getBudgetContext(new Date(), household.budgetMode, household.budgetConfig);

        const transactions = await prisma.transaction.findMany({
            where: {
                account: { householdId },
                date: {
                    gte: startDate,
                    lte: endDate
                },
                type: 'EXPENSE'
            },
            include: { category: true }
        });

        const categoryMap = new Map();

        transactions.forEach(t => {
            const catName = t.category?.name || 'Uncategorized';
            const color = t.category?.color || '#808080';
            const current = categoryMap.get(catName) || { name: catName, value: 0, color };
            current.value += Number(t.amount);
            categoryMap.set(catName, current);
        });

        // Return object-wrapped response to include context, or stick to array?
        // Changing to object { data, context } is cleaner but requires FE change.
        // Let's do it and fix FE.
        return {
            data: Array.from(categoryMap.values()),
            context: {
                description,
                startDate,
                endDate
            }
        };

    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to fetch category analytics' });
    }
  });
}
