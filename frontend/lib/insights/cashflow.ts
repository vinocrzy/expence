import { Transaction } from '../db-types';
import { Insight, AnalysisContext, InsightSummary } from './types';

export function analyzeCashflow(context: AnalysisContext): { insights: Insight[], summary: Partial<InsightSummary> } {
    const { transactions } = context;
    const insights: Insight[] = [];
    
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Filter transactions for current month
    const currentProps = transactions.filter(t => {
       const d = new Date(t.date);
       return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonthKey;
    });

    const income = currentProps.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expense = currentProps.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    
    // Days elapsed in month
    const today = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Simple Burn Rate Projection
    // If today is day 10, and expense is 1000. Avg/day = 100.
    // Projected = 100 * 30 = 3000.
    
    const dailyBurn = today > 0 ? expense / today : 0;
    const projectedExpense = dailyBurn * daysInMonth;
    
    let burnRateStatus: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';

    // Logic: If projected expense > income, warning
    // Only valid if we have income
    if (income > 0) {
        if (projectedExpense > income) {
            burnRateStatus = 'CRITICAL';
            insights.push({
                id: 'burn-rate-critical',
                type: 'WARNING',
                title: 'High Burn Rate',
                message: `At this pace, you might exceed your monthly income by ₹${(projectedExpense - income).toFixed(0)}.`,
                score: 95,
                priority: 'CRITICAL',
                confidence: 0.85
            });
        } else if (projectedExpense > income * 0.9) {
            burnRateStatus = 'WARNING';
            insights.push({
                id: 'burn-rate-warning',
                type: 'WARNING',
                title: 'Tight Month Ahead',
                message: `You're on track to spend 90% of your income. Consider cutting back on discretionary items.`,
                score: 60,
                priority: 'MEDIUM',
                confidence: 0.7
            });
        } else {
            // Safe
             insights.push({
                id: 'burn-rate-safe',
                type: 'ACHIEVEMENT',
                title: 'On Track',
                message: `You're pacing well! Projected savings: ₹${(income - projectedExpense).toFixed(0)}.`,
                score: 50,
                priority: 'LOW',
                confidence: 0.8
            });
        }
    }

    return {
        insights,
        summary: {
            totalIncome: income,
            totalExpense: expense,
            burnRateStatus,
            monthProjection: income - projectedExpense
        }
    };
}
