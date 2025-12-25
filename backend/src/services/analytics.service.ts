import prisma from '../lib/prisma';
import { startOfMonth, endOfMonth, getYear, getMonth, eachMonthOfInterval, min as minDate, max as maxDate } from 'date-fns';

/**
 * Aggregates all transactions for a specific month/year for a household.
 * Is idempotent and rebuilds entire statistics for that period.
 */
export async function aggregateMonth(householdId: string, inputDate: Date) {
    const year = getYear(inputDate);
    const month = getMonth(inputDate) + 1; // 1-indexed for DB
    
    // Define period
    const start = startOfMonth(inputDate);
    const end = endOfMonth(inputDate); // Covers until last ms of month

    // 1. Fetch Raw Transactions
    const transactions = await prisma.transaction.findMany({
        where: {
            account: { householdId },
            date: { gte: start, lte: end }
        },
        include: {
            category: true
        }
    });

    // 2. Compute Aggregates
    let totalIncome = 0;
    let totalExpense = 0;
    
    // Category Breakdown map
    const categoryStats = new Map<string, { amount: number; count: number; type: string }>();
    
    // Account Breakdown map
    const accountStats = new Map<string, { income: number; expense: number; transferIn: number; transferOut: number }>();

    for (const t of transactions) {
        const amt = Number(t.amount); // Keeping as number for simple math, converting back to Decimal implicitly
        const type = t.type;
        
        // Update Monthly Totals
        // Assuming strict types. 
        if (type === 'INCOME') totalIncome += amt;
        if (type === 'EXPENSE') totalExpense += Math.abs(amt);

        // Update Category Stats
        if (t.categoryId) {
            const current = categoryStats.get(t.categoryId) || { amount: 0, count: 0, type: 'EXPENSE' };
             if (type === 'EXPENSE') {
                current.amount += Math.abs(amt);
                current.type = 'EXPENSE';
            } else if (type === 'INCOME') {
                current.amount += amt; 
                current.type = 'INCOME';
            }
            current.count += 1;
            categoryStats.set(t.categoryId, current);
        }

        // Update Account Stats
        const accId = t.accountId;
        const currentAcc = accountStats.get(accId) || { income: 0, expense: 0, transferIn: 0, transferOut: 0 };
        if (type === 'INCOME') currentAcc.income += amt;
        if (type === 'EXPENSE') currentAcc.expense += Math.abs(amt);
        // Transfer logic pending robust implementation, assuming placeholders for now
        accountStats.set(accId, currentAcc);
    }

    // 3. Write to DB (Transactional Replacement)
    await prisma.$transaction(async (tx: any) => {
        // --- Monthly Summary ---
        await tx.analyticsMonthly.upsert({
            where: {
                householdId_year_month: { householdId, year, month }
            },
            update: {
                income: totalIncome,
                expense: totalExpense,
                netSavings: totalIncome - totalExpense
            },
            create: {
                householdId,
                year,
                month,
                income: totalIncome,
                expense: totalExpense,
                netSavings: totalIncome - totalExpense
            }
        });

        // --- Category Breakdown ---
        // Delete existing for this month to ensure clean rebuild
        await tx.analyticsCategory.deleteMany({
            where: { householdId, year, month }
        });
        
        for (const [catId, stats] of categoryStats.entries()) {
            await tx.analyticsCategory.create({
                data: {
                    householdId,
                    year,
                    month,
                    categoryId: catId,
                    type: stats.type,
                    amount: stats.amount,
                    count: stats.count
                }
            });
        }

        // --- Account Breakdown ---
        await tx.analyticsAccount.deleteMany({
            where: { householdId, year, month }
        });
        
        for (const [accId, stats] of accountStats.entries()) {
            await tx.analyticsAccount.create({
                data: {
                    householdId,
                    year,
                    month,
                    accountId: accId,
                    income: stats.income,
                    expense: stats.expense,
                    transfersIn: stats.transferIn,
                    transfersOut: stats.transferOut
                }
            });
        }
    });
}

/**
 * Triggers a full rebuild of analytics for a household.
 * Scans all transactions and aggregates month by month.
 */
export async function rebuildAnalytics(householdId: string) {
    // Find Date Range of all transactions
    const firstTx = await prisma.transaction.findFirst({
        where: { account: { householdId } },
        orderBy: { date: 'asc' }
    });

    if (!firstTx) return; // No data

    const start = firstTx.date;
    const end = new Date();

    const months = eachMonthOfInterval({ start, end });

    // Process sequentially to be safe (or parallel if needed)
    for (const date of months) {
        await aggregateMonth(householdId, date);
    }
}
