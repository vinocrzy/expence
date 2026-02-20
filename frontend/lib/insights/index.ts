import { Transaction, Category } from '../db-types';
import { Insight, InsightResponse, AnalysisContext, InsightSummary } from './types';
import { analyzeSavings } from './savings';
import { analyzeLifestyle } from './lifestyle';
import { analyzeCashflow } from './cashflow';
import { analyzeAnomalies } from './anomalies';

export function generateInsights(
    transactions: Transaction[],
    categories: Category[]
): InsightResponse {
    const context: AnalysisContext = {
        transactions,
        categories,
        currentDate: new Date(),
        historyStart: new Date(0) // TODO: Dynamic
    };

    let allInsights: Insight[] = [];
    
    // 1. Run Engines
    const savingsInsights = analyzeSavings(context);
    const lifestyleInsights = analyzeLifestyle(context);
    const anomaliesInsights = analyzeAnomalies(context);
    const { insights: cashflowInsights, summary: cfSummary } = analyzeCashflow(context);

    allInsights = [
        ...savingsInsights,
        ...lifestyleInsights,
        ...anomaliesInsights,
        ...cashflowInsights
    ];

    // 2. Ranking & Scoring
    // Sort by Priority (CRITICAL > HIGH > MEDIUM > LOW) then Score (desc)
    const priorityMap: Record<string, number> = {
        'CRITICAL': 4,
        'HIGH': 3,
        'MEDIUM': 2,
        'LOW': 1
    };

    allInsights.sort((a, b) => {
        const pA = priorityMap[a.priority];
        const pB = priorityMap[b.priority];
        if (pA !== pB) return pB - pA;
        return b.score - a.score;
    });

    // 3. Construct Summary
    const summary: InsightSummary = {
        totalIncome: cfSummary.totalIncome || 0,
        totalExpense: cfSummary.totalExpense || 0,
        savingsRate: (cfSummary.totalIncome && cfSummary.totalIncome > 0) 
            ? ((cfSummary.totalIncome - (cfSummary.totalExpense || 0)) / cfSummary.totalIncome) 
            : 0,
        burnRateStatus: cfSummary.burnRateStatus || 'SAFE',
        monthProjection: cfSummary.monthProjection || 0
    };

    return {
        insights: allInsights,
        summary,
        generatedAt: new Date().toISOString(),
        version: 'v2'
    };
}
