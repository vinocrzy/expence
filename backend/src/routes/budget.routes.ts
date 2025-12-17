import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';

// @ts-ignore
export default async function budgetRoutes(fastify: FastifyInstance) {

  // Get All Budgets (Recurring & Event)
  fastify.get('/budgets', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    
    try {
        const budgets = await prisma.budget.findMany({
            where: { 
                householdId,
                isActive: true
            },
            include: {
                category: true,
                transactions: {
                    select: { 
                        id: true, 
                        amount: true, 
                        date: true, 
                        description: true, 
                        type: true,
                        category: { select: { name: true, color: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate progress for Event budgets
        // For Recurring, it's calculated dynamically based on current cycle in frontend or analytics
        const processedBudgets = budgets.map(b => {
            if (b.type === 'EVENT') {
                const spent = b.transactions.reduce((sum, t) => sum + Number(t.amount), 0);
                return { ...b, spent };
            }
            return b;
        });

        return processedBudgets;
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to fetch budgets' });
    }
  });

  // Create Budget
  fastify.post('/budgets', {
    onRequest: [fastify.authenticate],
    schema: {
        body: {
            type: 'object',
            required: ['name', 'type', 'amount'],
            properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['RECURRING', 'EVENT'] },
                amount: { type: 'number' },
                categoryId: { type: 'string' },
                startDate: { type: 'string' }, // ISO date
                endDate: { type: 'string' }    // ISO date
            }
        }
    }
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    const { name, type, amount, categoryId, startDate, endDate } = request.body;

    try {
        const budget = await prisma.budget.create({
            data: {
                householdId,
                name,
                type,
                amount,
                categoryId: categoryId || null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null
            }
        });

        return budget;

    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to create budget' });
    }
  });

  // Get Active Event Budgets (for tagging)
  fastify.get('/budgets/events/active', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    
    try {
        const budgets = await prisma.budget.findMany({
            where: { 
                householdId,
                type: 'EVENT',
                isActive: true
            },
            select: { id: true, name: true }
        });

        return budgets;
    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to fetch active event budgets' });
    }
  });
  // Get Budget Breakdown (Insights)
  fastify.get('/budgets/:id/breakdown', {
    onRequest: [fastify.authenticate]
  }, async (request: any, reply: any) => {
    const { householdId } = request.user;
    const { id } = request.params;

    try {
        const budget = await prisma.budget.findFirst({
            where: { id, householdId },
            include: {
                transactions: {
                    include: { category: true, account: true } // Include detailed relations
                }
            }
        });

        if (!budget) {
            return reply.status(404).send({ error: 'Budget not found' });
        }

        const transactions = budget.transactions;
        const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
        
        // 1. Category-wise Breakdown
        const categoryMap = new Map();
        transactions.forEach(t => {
            if (t.type === 'EXPENSE') { // Only count expenses for breakdown
                const catName = t.category?.name || 'Uncategorized';
                const color = t.category?.color || '#888888';
                const current = categoryMap.get(catName) || { amount: 0, color, count: 0 };
                categoryMap.set(catName, { 
                    amount: current.amount + Number(t.amount), 
                    color,
                    count: current.count + 1
                });
            }
        });

        const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, data]) => ({
            name,
            amount: data.amount,
            percentage: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0,
            color: data.color,
            count: data.count
        })).sort((a, b) => b.amount - a.amount);

        // 2. Day-wise Timeline
        const dayMap = new Map();
        transactions.forEach(t => {
             const dateKey = new Date(t.date).toISOString().split('T')[0];
             const current = dayMap.get(dateKey) || 0;
             if (t.type === 'EXPENSE') {
                dayMap.set(dateKey, current + Number(t.amount));
             }
        });

        // Fill in gaps if event has start/end dates
        let timeline = [];
        if (budget.startDate && budget.endDate) {
            // Logic to fill dates later using a date library, for now, just sparse data
        }
        
        timeline = Array.from(dayMap.entries()).map(([date, amount]) => ({
            date,
            amount
        })).sort((a, b) => a.date.localeCompare(b.date));


        // 3. Payment Method Split (Simple Account Type based)
        const paymentMap = new Map();
        transactions.forEach(t => {
             if (t.type === 'EXPENSE') {
                 // Determine rough method from account name/type if available, else just account name
                 // Since we don't have explicit 'Method' field, we use Account Name
                 const method = t.account?.name || 'Unknown';
                 const current = paymentMap.get(method) || 0;
                 paymentMap.set(method, current + Number(t.amount));
             }
        });

        const paymentBreakdown = Array.from(paymentMap.entries()).map(([name, amount]) => ({
            name,
            amount,
            percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
        }));

        // 4. Smart Insights
        const insights = [];
        
        // Insight: Highest Span Day
        if (timeline.length > 0) {
            const peakDay = timeline.reduce((max, curr) => curr.amount > max.amount ? curr : max, timeline[0]);
            insights.push({
                type: 'PEAK_SPEND',
                title: 'Peak Spending Day',
                description: `You spent ₹${peakDay.amount.toLocaleString()} on ${new Date(peakDay.date).toLocaleDateString()}.`,
                severity: 'info'
            });
        }

        // Insight: Major Category
        if (categoryBreakdown.length > 0) {
            const topCat = categoryBreakdown[0];
            if (topCat.percentage > 40) {
                insights.push({
                    type: 'CATEGORY_SKEW',
                    title: 'High Category Spend',
                    description: `${topCat.name} accounts for ${Math.round(topCat.percentage)}% of your total trip cost.`,
                    severity: 'warning'
                });
            }
        }
        
        // Insight: Budget Status
        const budgetLimit = Number(budget.amount);
        if (totalSpent > budgetLimit) {
             insights.push({
                type: 'OVER_BUDGET',
                title: 'Over Budget',
                description: `You have exceeded your budget by ₹${(totalSpent - budgetLimit).toLocaleString()}.`,
                severity: 'error'
            });
        } else if (totalSpent > budgetLimit * 0.9) {
             insights.push({
                type: 'NEAR_LIMIT',
                title: 'Near Budget Limit',
                description: `You have used ${Math.round((totalSpent / budgetLimit) * 100)}% of your budget.`,
                severity: 'warning'
            });
        }

        return {
            budget,
            analytics: {
                totalSpent,
                remaining: budgetLimit - totalSpent,
                categoryBreakdown,
                timeline,
                paymentBreakdown,
                insights
            }
        };

    } catch (e) {
        fastify.log.error(e);
        reply.status(500).send({ error: 'Failed to generate budget breakdown' });
    }
  });

}
