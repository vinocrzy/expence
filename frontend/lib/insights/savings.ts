import { Transaction } from '../db-types';
import { Insight, AnalysisContext } from './types';
import { groupByMonth } from './utils';

export function analyzeSavings(context: AnalysisContext): Insight[] {
    const { transactions } = context;
    const insights: Insight[] = [];

    const months = groupByMonth(transactions);
    const monthKeys = Object.keys(months).sort();

    if (monthKeys.length < 2) return [];

    // 1. Savings Rate Trend
    const rates = monthKeys.map(key => {
        const txs = months[key];
        const income = txs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
        const expense = txs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
        return income > 0 ? (income - expense) / income : 0;
    });

    const currentRate = rates[rates.length - 1];
    const prevRate = rates[rates.length - 2];
    const diff = currentRate - prevRate;

    // Positive Trend
    if (diff > 0.05) {
        insights.push({
            id: 'savings-improving',
            type: 'ACHIEVEMENT',
            title: 'Savings Power Up',
            message: `You saved ${(currentRate * 100).toFixed(0)}% of your income this month, up from ${(prevRate * 100).toFixed(0)}% last month.`,
            score: 75,
            priority: 'HIGH',
            confidence: 0.9,
            visualParams: { color: 'emerald' }
        });
    }

    // Negative Trend
    if (diff < -0.10) {
        insights.push({
            id: 'savings-declining',
            type: 'WARNING',
            title: 'Savings Dip',
            message: `Your savings rate dropped by ${(Math.abs(diff) * 100).toFixed(0)}% compared to last month.`,
            score: 80,
            priority: 'HIGH',
            confidence: 0.9,
            visualParams: { color: 'amber' }
        });
    }

    return insights;
}
