import { Transaction, Category } from '../db-types';
import { Insight, AnalysisContext } from './types';

export function analyzeAnomalies(context: AnalysisContext): Insight[] {
    const { transactions, categories } = context;
    const insights: Insight[] = [];

    // Helper
    const getCatName = (id: string) => categories.find(c => c.id === id)?.name || id;

    // 1. Large Expense Detector
    // Filter EXPENSE > 5000 (Dynamic in future, static for now as per immediate plan)
    // Better: > 3x Average?
    
    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    if (expenses.length < 10) return [];

    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    const avg = total / expenses.length;
    
    // Threshold: 5x average
    const spikes = expenses.filter(t => t.amount > avg * 5);
    
    spikes.forEach(spike => {
        insights.push({
            id: `spike-${spike.id}`,
            type: 'WARNING',
            title: 'Unusual Large Expense',
            message: `A transaction of ₹${spike.amount} for "${spike.description || getCatName(spike.categoryId || '')}" is significantly higher than your average (₹${avg.toFixed(0)}).`,
            score: 70, // Medium importance
            priority: 'MEDIUM',
            confidence: 0.9,
            relatedCategories: spike.categoryId ? [spike.categoryId] : []
        });
    });

    return insights;
}
