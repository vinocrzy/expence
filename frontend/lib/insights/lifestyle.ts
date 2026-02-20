import { Transaction, Category } from '../db-types';
import { Insight, AnalysisContext } from './types';
import { calculateMonthlyAverage } from './utils';

export function analyzeLifestyle(context: AnalysisContext): Insight[] {
    const { transactions, categories } = context;
    const insights: Insight[] = [];

    // Helper
    const getCatName = (id: string, cats: Category[]) => cats.find(c => c.id === id)?.name || id;

    // 1. Weekend Surge
    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    let weekendSpend = 0;
    let weekdaySpend = 0;
    let weekendCount = 0;
    let weekdayCount = 0;
    
    expenses.forEach(t => {
        const day = new Date(t.date).getDay();
        const isWeekend = day === 0 || day === 6;
        if (isWeekend) {
            weekendSpend += t.amount;
            weekendCount++;
        } else {
            weekdaySpend += t.amount;
            weekdayCount++;
        }
    });

    const avgWeekend = weekendCount > 0 ? weekendSpend / weekendCount : 0;
    const avgWeekday = weekdayCount > 0 ? weekdaySpend / weekdayCount : 0;

    if (avgWeekend > avgWeekday * 1.5 && avgWeekend > 500) {
        insights.push({
            id: 'weekend-surge',
            type: 'OBSERVATION',
            title: 'Weekend Warrior',
            message: `Your average weekend transaction is ${(avgWeekend / avgWeekday).toFixed(1)}x higher than weekdays.`,
            score: 40,
            priority: 'LOW',
            confidence: 0.8
        });
    }

    return insights;
}
