
import { useTransactions } from './useOfflineData';
import { useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export function useAnalytics() {
    const { transactions, loading } = useTransactions();

    const monthly = useMemo(() => {
        if (!transactions.length) return [];
        
        const months = new Map();
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const key = format(date, 'MMM yyyy'); // e.g., "Dec 2024"
            months.set(key, { month: key, income: 0, expense: 0, sortKey: date.getTime() });
        }

        transactions.forEach(t => {
            const date = new Date(t.date);
            const key = format(date, 'MMM yyyy');
            if (months.has(key)) {
                const entry = months.get(key);
                const amount = Number(t.amount);
                if (t.type === 'INCOME') entry.income += amount;
                if (t.type === 'EXPENSE') entry.expense += amount;
            }
        });

        return Array.from(months.values()).sort((a, b) => a.sortKey - b.sortKey);
    }, [transactions]);

    const categories = useMemo(() => {
        if (!transactions.length) return [];
        
        // Filter for current month
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        
        const currentMonthExpenses = transactions.filter(t => 
            t.type === 'EXPENSE' && 
            isWithinInterval(new Date(t.date), { start, end })
        );

        const catMap = new Map();
        
        currentMonthExpenses.forEach(t => {
            // Group by categoryId or default to 'Uncategorized'
            const catId = t.categoryId || 'uncategorized';
            const catName = t.category?.name || 'Uncategorized'; // We assume category is expanded or we need to look it up.
            // Note: indexedDB stores 'category' object if backend sent it, otherwise if created offline, we might only have ID.
            // For robust offline, we should join with categories store.
            // Simplified: Use whatever is in transaction object for now.
            
            const currentValue = catMap.get(catName)?.value || 0;
            catMap.set(catName, {
                name: catName,
                value: currentValue + Number(t.amount),
                color: t.category?.color || '#808080'
            });
        });

        const result = Array.from(catMap.values());
        // Calculate percentages if needed, but Recharts handles values.
        return result;
    }, [transactions]);

    return { monthly, categories, loading };
}
