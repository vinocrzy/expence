import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { rebuildAnalytics } from '../services/analytics.service';

// @ts-ignore
export default async function analyticsRoutes(fastify: FastifyInstance) {
  
  // 1. Monthly Summary (History)
  // Query: ?limit=6
  fastify.get('/analytics/monthly', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    const { limit = 6 } = request.query;

    try {
        const data = await prisma.analyticsMonthly.findMany({
            where: { householdId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: Number(limit)
        });

        // Return oldest to newest for charts
        const sorted = data.reverse(); 
        
        return {
            labels: sorted.map(d => `${d.year}-${String(d.month).padStart(2, '0')}`), // YYYY-MM
            humanLabels: sorted.map(d => `${d.month}/${d.year}`), // MM/YYYY
            data: sorted.map(d => ({
                month: d.month,
                year: d.year,
                income: Number(d.income),
                expense: Number(d.expense),
                netSavings: Number(d.netSavings)
            })),
            totals: {
                totalIncome: sorted.reduce((sum, d) => sum + Number(d.income), 0),
                totalExpense: sorted.reduce((sum, d) => sum + Number(d.expense), 0)
            }
        };

    } catch (e) {
        request.log.error(e);
        reply.status(500).send({ error: 'Failed to fetch monthly analytics' });
    }
  });

  // 2. Category Breakdown (Specific Range or Month)
  // Query: ?year=2024&month=12  OR defaults to current
  fastify.get('/analytics/categories', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    let { year, month } = request.query;
    
    // Default to current month if not specified
    if (!year || !month) {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
    }

    try {
        const data = await prisma.analyticsCategory.findMany({
            where: { 
                householdId,
                year: Number(year),
                month: Number(month),
                type: 'EXPENSE' // Usually interested in Expense breakdown
            },
            include: { category: true },
            orderBy: { amount: 'desc' }
        });

        const total = data.reduce((sum, d) => sum + Number(d.amount), 0);

        return {
            period: { year, month },
            totalExpense: total,
            chartData: data.map(d => ({
                id: d.categoryId,
                label: d.category.name,
                value: Number(d.amount),
                color: d.category.color || '#888888',
                percentage: total > 0 ? Math.round((Number(d.amount) / total) * 100) : 0
            }))
        };

    } catch (e) {
        request.log.error(e);
        reply.status(500).send({ error: 'Failed to fetch category analytics' });
    }
  });

  // 3. Account Breakdown (Current Month)
  fastify.get('/analytics/accounts', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
        const data = await prisma.analyticsAccount.findMany({
            where: { householdId, year, month },
            include: { account: true }
        });

        return {
            period: { year, month },
            data: data.map(d => ({
                accountId: d.accountId,
                accountName: d.account.name,
                currency: d.account.currency,
                income: Number(d.income),
                expense: Number(d.expense)
            }))
        };
    } catch (e) {
        reply.status(500).send({ error: 'Failed to fetch account analytics' });
    }
  });

  // 4. Manual Rebuild Trigger
  fastify.post('/analytics/rebuild', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    
    // Async trigger
    rebuildAnalytics(householdId).catch(err => {
        request.log.error(err, 'Rebuild failed');
    });

    return { message: 'Analytics rebuild started', status: 'processing' };
  });
}
