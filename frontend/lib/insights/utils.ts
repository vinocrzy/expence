import { Transaction } from '../db-types';

/**
 * Calculate Average Spending for a given type/category over N months
 */
export function calculateMonthlyAverage(
    transactions: Transaction[], 
    monthsToCheck: number = 3,
    filterFn?: (t: Transaction) => boolean
): number {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - monthsToCheck);
    start.setDate(1); // Start of that month

    const relevantTx = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end && (filterFn ? filterFn(t) : true);
    });

    if (relevantTx.length === 0) return 0;

    const total = relevantTx.reduce((sum, t) => sum + t.amount, 0);
    return total / monthsToCheck;
}

/**
 * Get distinct categories from transactions
 */
export function getDistinctCategories(transactions: Transaction[]): string[] {
    const cats = new Set<string>();
    transactions.forEach(t => {
        if (t.categoryId) cats.add(t.categoryId);
    });
    return Array.from(cats);
}

/**
 * Group transactions by month key (YYYY-MM)
 */
export function groupByMonth(transactions: Transaction[]) {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
    });
    return groups;
}
