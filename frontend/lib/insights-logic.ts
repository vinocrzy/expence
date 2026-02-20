import { Transaction, Category } from './db-types';

export interface Insight {
  type: 'WARNING' | 'TIP' | 'ACHIEVEMENT' | 'OBSERVATION';
  title: string;
  message: string;
  score?: number; // 0-100 impact score
  relatedCategories?: string[];
}

// Helper to get category name safely
const getCatName = (id: string, categories: Category[]) => {
    return categories.find(c => c.id === id)?.name || id;
};

/**
 * Analyze transactions and generate insights
 */
export function generateInsights(
  transactions: Transaction[],
  categories: Category[]
): Insight[] {
  const insights: Insight[] = [];

  if (transactions.length === 0) {
    return [{
        type: 'TIP',
        title: 'Start Tracking',
        message: 'Add more transactions to unlock personalized financial insights.',
        score: 0
    }];
  }

  // 1. Weekend vs Weekday Analysis
  const weekendInsight = analyzeWeekendSpends(transactions);
  if (weekendInsight) insights.push(weekendInsight);

  // 2. Spending Spikes (High value transactions)
  const spikeInsight = detectSpendingSpikes(transactions, categories);
  if (spikeInsight) insights.push(spikeInsight);
  
  // 3. Subscription Detection (Recurring patterns)
  const subInsight = detectPotentialSubscriptions(transactions);
  if (subInsight) insights.push(subInsight);

  // 4. Frequent Coffee/Dining (Lifestyle check)
  const lifestyleInsight = checkLifestyleHabits(transactions, categories);
  if (lifestyleInsight) insights.push(lifestyleInsight);

  // 5. Savings Rate Trend
  const savingsInsight = analyzeSavingsTrend(transactions);
  if (savingsInsight) insights.push(savingsInsight);

  // 6. Debt Payoff Projection
  const debtInsight = projectDebtPayoff(transactions, categories);
  if (debtInsight) insights.push(debtInsight);

  return insights;
}

/**
 * Detect significant difference in spending between weekends and weekdays
 */
function analyzeWeekendSpends(transactions: Transaction[]): Insight | null {
    let weekendSpend = 0;
    let weekdaySpend = 0;
    let weekendDays = 0;
    let weekdayDays = 0;

    const processedDates = new Set<string>();

    transactions.forEach(t => {
        if (t.type !== 'EXPENSE') return;
        
        const date = new Date(t.date);
        const dateStr = date.toDateString();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        if (isWeekend) {
            weekendSpend += t.amount;
            if (!processedDates.has(dateStr)) weekendDays++;
        } else {
            weekdaySpend += t.amount;
            if (!processedDates.has(dateStr)) weekdayDays++;
        }
        processedDates.add(dateStr);
    });

    const avgWeekend = weekendDays > 0 ? weekendSpend / weekendDays : 0;
    const avgWeekday = weekdayDays > 0 ? weekdaySpend / weekdayDays : 0;

    if (avgWeekend > avgWeekday * 1.5 && avgWeekend > 100) {
        return {
            type: 'OBSERVATION',
            title: 'Weekend Spender',
            message: `You spend ${(avgWeekend / avgWeekday).toFixed(1)}x more on weekends compared to weekdays. Planning ahead might help save more!`,
            score: 60
        };
    }

    return null;
}

/**
 * Detect unusally large single transactions
 */
function detectSpendingSpikes(transactions: Transaction[], categories: Category[]): Insight | null {
    // Filter expenses
    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    if (expenses.length < 5) return null;

    // Calculate average
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    const avg = total / expenses.length;

    // Find distinct outliers (e.g., > 3x average)
    const outliers = expenses.filter(t => t.amount > avg * 4);

    if (outliers.length > 0) {
        const topOutlier = outliers.sort((a, b) => b.amount - a.amount)[0];
        const catName = getCatName(topOutlier.categoryId || '', categories);
        
        return {
            type: 'WARNING',
            title: 'Large Expense Detected',
            message: `A large payment of ${topOutlier.amount} for ${topOutlier.description || catName} was detected. Was this planned?`,
            relatedCategories: [catName],
            score: 80
        };
    }

    return null;
}

/**
 * Basic pattern matching for subscriptions
 */
function detectPotentialSubscriptions(transactions: Transaction[]): Insight | null {
    // Group by (Amount + Description approx)
    const groups: Record<string, number> = {};
    
    transactions.forEach(t => {
        if (t.type !== 'EXPENSE') return;
        // Simple key: Amount + first word of description
        const descKey = t.description ? t.description.split(' ')[0].toLowerCase() : 'unknown';
        const key = `${t.amount}-${descKey}`;
        groups[key] = (groups[key] || 0) + 1;
    });

    // Find entries with count > 1 (implies recurrence in the provided dataset)
    // NOTE: This is simple; in a real app, we'd check dates (e.g., same day each month)
    const potentialSubs = Object.entries(groups).filter(([k, count]) => count >= 2);

    if (potentialSubs.length > 0) {
         // Just take the first one for the insight
         const [key] = potentialSubs[0];
         const amount = key.split('-')[0];
         return {
             type: 'TIP',
             title: 'Recurring Charges',
             message: `We noticed multiple payments of ${amount}. If these are subscriptions, ensure you're still using them!`,
             score: 50
         };
    }

    return null;
}

/**
 * Check for frequent spending in "Want" categories like Food/Shopping
 */
function checkLifestyleHabits(transactions: Transaction[], categories: Category[]): Insight | null {
    const lifestyleKeywords = ['food', 'starbucks', 'cafe', 'restaurant', 'shopping', 'entertainment', 'netflix', 'movie'];
    
    // Map categories to names first for easier checking
    const lifestyleTx = transactions.filter(t => {
        if (t.type !== 'EXPENSE') return false;
        
        const catName = getCatName(t.categoryId || '', categories).toLowerCase();
        const desc = (t.description || '').toLowerCase();

        return lifestyleKeywords.some(kw => catName.includes(kw) || desc.includes(kw));
    });

    const count = lifestyleTx.length;
    const total = lifestyleTx.reduce((sum, t) => sum + t.amount, 0);

    if (count > 5) {
        return {
            type: 'OBSERVATION',
            title: 'Lifestyle Check',
            message: `You've had ${count} lifestyle transactions recently (Dining, Shopping, etc.), totaling ${total}. Small treats add up!`,
            score: 40
        };
    }

    return null;
}

/**
 * Analyze if savings rate is improving or declining over months
 */
function analyzeSavingsTrend(transactions: Transaction[]): Insight | null {
    const months: Record<string, { income: number; expense: number }> = {};
    
    transactions.forEach(t => {
        const date = new Date(t.date);
        const key = `${date.getFullYear()}-${date.getMonth()}`; // Simple key
        
        if (!months[key]) months[key] = { income: 0, expense: 0 };
        
        if (t.type === 'INCOME') months[key].income += t.amount;
        if (t.type === 'EXPENSE') months[key].expense += t.amount;
    });

    const monthKeys = Object.keys(months).sort();
    if (monthKeys.length < 2) return null; // Need at least 2 months

    const rates = monthKeys.map(k => {
        const { income, expense } = months[k];
        return income > 0 ? (income - expense) / income : 0;
    });

    const currentRate = rates[rates.length - 1];
    const prevRate = rates[rates.length - 2];

    if (currentRate > prevRate + 0.05) { // 5% improvement
        return {
            type: 'ACHIEVEMENT',
            title: 'Savings on the Rise',
            message: `Your savings rate improved to ${(currentRate * 100).toFixed(0)}% this month! Keep it up.`,
            score: 75
        };
    } else if (currentRate < prevRate - 0.05) {
        return {
            type: 'WARNING',
            title: 'Dip in Savings',
            message: `Your savings rate dropped to ${(currentRate * 100).toFixed(0)}% compared to last month. Check your recent expenses.`,
            score: 45
        };
    }

    return null;
}

/**
 * Estimate debt payoff time based on recent payments
 */
function projectDebtPayoff(transactions: Transaction[], categories: Category[]): Insight | null {
    // 1. Find debt payments
    // Look for transactions with type 'DEBT' or category type 'DEBT'
    const debtPayments = transactions.filter(t => {
        if (t.type === 'DEBT') return true;
        const cat = categories.find(c => c.id === t.categoryId);
        return cat && cat.type === 'DEBT';
    });

    if (debtPayments.length === 0) return null;

    // 2. Average monthly payment
    const totalPaid = debtPayments.reduce((sum, t) => sum + t.amount, 0);
    // Rough estimate of months in dataset
    const dates = debtPayments.map(t => new Date(t.date).getTime());
    const rangeDays = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24);
    const months = Math.max(1, rangeDays / 30);
    
    const avgMonthlyPayment = totalPaid / months;

    // We don't have total debt balance here (it's in accounts), 
    // so we'll give a generic "Keep it up" or "Increase" advice based on consistency.
    
    if (avgMonthlyPayment > 0) {
        return {
            type: 'TIP',
            title: 'Debt Free Journey',
            message: `You're paying off avg. ${avgMonthlyPayment.toFixed(0)}/month towards debt. Increasing this by even 10% can shave months off your tenure!`,
            score: 55
        };
    }

    return null;
}
