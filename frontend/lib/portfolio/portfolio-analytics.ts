/**
 * Portfolio Analytics Engine
 * 
 * Pure functions for calculating advanced portfolio metrics:
 * - Daily P&L (using OPEN vs CLOSE snapshots)
 * - Top gainers/losers
 * - Diversification analysis
 * - Concentration risk
 * 
 * Designed for integration with existing Insights engine
 */

import type {
  Holding,
  PortfolioSummary,
  PortfolioAnalytics,
  HoldingPerformance,
  DiversificationMetric,
  ConcentrationRisk,
  AnalyticsCalculationInput,
  MarketSnapshot,
  MarketQuote,
} from './types';

/**
 * Round to 2 decimal places
 */
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Calculate today's P&L using OPEN and CLOSE/current prices
 * 
 * @param holdings - Current holdings
 * @param openQuotes - Today's OPEN prices
 * @param currentQuotes - Current/CLOSE prices
 * @returns { todayPnL, todayPnLPercent }
 */
function calculateTodayPnL(
  holdings: Holding[],
  openQuotes: Record<string, MarketSnapshot>,
  currentQuotes: Record<string, MarketQuote>
): { todayPnL: number; todayPnLPercent: number } {
  if (holdings.length === 0) {
    return { todayPnL: 0, todayPnLPercent: 0 };
  }

  let totalOpenValue = 0;
  let totalCurrentValue = 0;

  for (const holding of holdings) {
    const key = `${holding.exchange}_${holding.symbol}`;
    
    // Get today's opening price
    const openQuote = openQuotes[key];
    const openPrice = openQuote?.price ?? holding.currentPrice; // Fallback to current
    
    // Get current price
    const currentQuote = currentQuotes[key];
    const currentPrice = currentQuote?.price ?? holding.currentPrice;
    
    totalOpenValue += openPrice * holding.totalUnits;
    totalCurrentValue += currentPrice * holding.totalUnits;
  }

  const todayPnL = totalCurrentValue - totalOpenValue;
  const todayPnLPercent = totalOpenValue > 0 
    ? (todayPnL / totalOpenValue) * 100 
    : 0;

  return {
    todayPnL: roundToTwo(todayPnL),
    todayPnLPercent: roundToTwo(todayPnLPercent),
  };
}

/**
 * Find top gainer from holdings
 */
function findTopGainer(holdings: Holding[]): HoldingPerformance | null {
  if (holdings.length === 0) return null;

  const sorted = [...holdings].sort(
    (a, b) => b.unrealisedPnLPercent - a.unrealisedPnLPercent
  );

  const top = sorted[0];

  return {
    symbol: top.symbol,
    exchange: top.exchange,
    pnl: roundToTwo(top.unrealisedPnL),
    pnlPercent: roundToTwo(top.unrealisedPnLPercent),
    currentValue: roundToTwo(top.currentValue),
  };
}

/**
 * Find top loser from holdings
 */
function findTopLoser(holdings: Holding[]): HoldingPerformance | null {
  if (holdings.length === 0) return null;

  const sorted = [...holdings].sort(
    (a, b) => a.unrealisedPnLPercent - b.unrealisedPnLPercent
  );

  const bottom = sorted[0];

  return {
    symbol: bottom.symbol,
    exchange: bottom.exchange,
    pnl: roundToTwo(bottom.unrealisedPnL),
    pnlPercent: roundToTwo(bottom.unrealisedPnLPercent),
    currentValue: roundToTwo(bottom.currentValue),
  };
}

/**
 * Calculate diversification metrics
 * (percentage of portfolio value per stock)
 */
function calculateDiversification(
  holdings: Holding[],
  totalPortfolioValue: number
): DiversificationMetric[] {
  if (holdings.length === 0 || totalPortfolioValue <= 0) {
    return [];
  }

  return holdings.map(holding => ({
    symbol: holding.symbol,
    exchange: holding.exchange,
    value: roundToTwo(holding.currentValue),
    percentage: roundToTwo((holding.currentValue / totalPortfolioValue) * 100),
  })).sort((a, b) => b.percentage - a.percentage); // Sort by percentage desc
}

/**
 * Detect concentration risk
 * (warning if any single stock > 40% of portfolio)
 */
function detectConcentrationRisk(
  diversification: DiversificationMetric[]
): ConcentrationRisk | null {
  const threshold = 40; // 40% concentration threshold

  const risky = diversification.find(d => d.percentage > threshold);

  if (!risky) return null;

  return {
    symbol: risky.symbol,
    exchange: risky.exchange,
    percentage: risky.percentage,
    value: risky.value,
    message: `${risky.symbol} represents ${risky.percentage.toFixed(1)}% of your portfolio, exceeding the recommended ${threshold}% limit. Consider diversifying.`,
  };
}

/**
 * Main function: Calculate portfolio analytics
 * 
 * PURE FUNCTION - No side effects
 * 
 * @param input - Holdings, snapshots, and summary
 * @returns Portfolio analytics
 */
export function calculatePortfolioAnalytics(
  input: AnalyticsCalculationInput
): PortfolioAnalytics {
  const {
    holdings,
    todayOpenQuotes,
    todayCloseQuotes,
    portfolioSummary,
  } = input;

  // Calculate today's P&L
  const { todayPnL, todayPnLPercent } = calculateTodayPnL(
    holdings,
    todayOpenQuotes,
    todayCloseQuotes
  );

  // Find top performers
  const topGainer = findTopGainer(holdings);
  const topLoser = findTopLoser(holdings);

  // Calculate diversification
  const diversification = calculateDiversification(
    holdings,
    portfolioSummary.totalCurrentValue
  );

  // Detect concentration risk
  const concentrationRisk = detectConcentrationRisk(diversification);

  return {
    todayPnL,
    todayPnLPercent,
    topGainer,
    topLoser,
    diversification,
    concentrationRisk,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate analytics without today's snapshots (degraded mode)
 * Uses only current prices
 */
export function calculatePortfolioAnalyticsSimple(
  holdings: Holding[],
  portfolioSummary: PortfolioSummary
): PortfolioAnalytics {
  const topGainer = findTopGainer(holdings);
  const topLoser = findTopLoser(holdings);
  const diversification = calculateDiversification(
    holdings,
    portfolioSummary.totalCurrentValue
  );
  const concentrationRisk = detectConcentrationRisk(diversification);

  return {
    todayPnL: 0, // Not available without snapshots
    todayPnLPercent: 0,
    topGainer,
    topLoser,
    diversification,
    concentrationRisk,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Get portfolio risk score (0-100)
 * 
 * Factors:
 * - Concentration (high concentration = higher risk)
 * - Volatility (large P&L swings = higher risk)
 * - Diversification (more stocks = lower risk)
 */
export function calculateRiskScore(
  holdings: Holding[],
  diversification: DiversificationMetric[],
  concentrationRisk: ConcentrationRisk | null
): number {
  let riskScore = 0;

  // Base risk from lack of diversification
  if (holdings.length === 1) {
    riskScore += 50; // Very risky
  } else if (holdings.length === 2) {
    riskScore += 30;
  } else if (holdings.length <= 5) {
    riskScore += 15;
  }

  // Concentration risk
  if (concentrationRisk) {
    const excessConcentration = concentrationRisk.percentage - 40;
    riskScore += Math.min(excessConcentration, 30); // Cap at 30 points
  }

  // Volatility risk (based on P&L percentages)
  const avgPnLPercent = holdings.reduce(
    (sum, h) => sum + Math.abs(h.unrealisedPnLPercent),
    0
  ) / holdings.length;

  if (avgPnLPercent > 50) {
    riskScore += 20;
  } else if (avgPnLPercent > 25) {
    riskScore += 10;
  }

  return Math.min(Math.round(riskScore), 100);
}

/**
 * Get performance rating (Poor, Fair, Good, Excellent)
 */
export function getPerformanceRating(
  totalPnLPercent: number
): 'Poor' | 'Fair' | 'Good' | 'Excellent' {
  if (totalPnLPercent < -10) return 'Poor';
  if (totalPnLPercent < 0) return 'Fair';
  if (totalPnLPercent < 15) return 'Good';
  return 'Excellent';
}

/**
 * Generate portfolio insights (text summaries for Insights engine)
 */
export interface PortfolioInsight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  priority: number; // 1-10, higher = more important
}

export function generatePortfolioInsights(
  analytics: PortfolioAnalytics,
  summary: PortfolioSummary
): PortfolioInsight[] {
  const insights: PortfolioInsight[] = [];

  // Concentration risk warning
  if (analytics.concentrationRisk) {
    insights.push({
      type: 'warning',
      title: 'High Concentration Risk',
      message: analytics.concentrationRisk.message,
      priority: 9,
    });
  }

  // Top gainer
  if (analytics.topGainer && analytics.topGainer.pnlPercent > 10) {
    insights.push({
      type: 'success',
      title: 'Strong Performer',
      message: `${analytics.topGainer.symbol} is up ${analytics.topGainer.pnlPercent.toFixed(1)}%, contributing significantly to your portfolio gains.`,
      priority: 7,
    });
  }

  // Top loser
  if (analytics.topLoser && analytics.topLoser.pnlPercent < -10) {
    insights.push({
      type: 'warning',
      title: 'Underperforming Stock',
      message: `${analytics.topLoser.symbol} is down ${Math.abs(analytics.topLoser.pnlPercent).toFixed(1)}%. Review your position.`,
      priority: 8,
    });
  }

  // Overall portfolio performance
  const rating = getPerformanceRating(summary.totalUnrealisedPnLPercent);
  if (rating === 'Excellent') {
    insights.push({
      type: 'success',
      title: 'Excellent Portfolio Performance',
      message: `Your portfolio is up ${summary.totalUnrealisedPnLPercent.toFixed(1)}%. Keep up the good work!`,
      priority: 6,
    });
  } else if (rating === 'Poor') {
    insights.push({
      type: 'error',
      title: 'Portfolio Needs Attention',
      message: `Your portfolio is down ${Math.abs(summary.totalUnrealisedPnLPercent).toFixed(1)}%. Consider reviewing your investments.`,
      priority: 9,
    });
  }

  // Low diversification
  if (summary.totalHoldings < 3) {
    insights.push({
      type: 'info',
      title: 'Limited Diversification',
      message: `You have only ${summary.totalHoldings} stock${summary.totalHoldings === 1 ? '' : 's'}. Consider diversifying to reduce risk.`,
      priority: 5,
    });
  }

  // Today's performance
  if (Math.abs(analytics.todayPnLPercent) > 5) {
    const direction = analytics.todayPnLPercent > 0 ? 'up' : 'down';
    insights.push({
      type: analytics.todayPnLPercent > 0 ? 'success' : 'warning',
      title: 'Significant Daily Movement',
      message: `Your portfolio is ${direction} ${Math.abs(analytics.todayPnLPercent).toFixed(1)}% today.`,
      priority: 7,
    });
  }

  // Sort by priority (descending)
  return insights.sort((a, b) => b.priority - a.priority);
}

/**
 * Calculate sector concentration (if sector data available)
 * This is a placeholder - requires sector mapping data
 */
export function calculateSectorConcentration(
  holdings: Holding[],
  sectorMap?: Record<string, string> // symbol -> sector
): Record<string, number> {
  if (!sectorMap) return {};

  const sectorValues: Record<string, number> = {};
  let totalValue = 0;

  for (const holding of holdings) {
    const sector = sectorMap[holding.symbol] || 'Unknown';
    sectorValues[sector] = (sectorValues[sector] || 0) + holding.currentValue;
    totalValue += holding.currentValue;
  }

  // Convert to percentages
  const sectorPercentages: Record<string, number> = {};
  for (const [sector, value] of Object.entries(sectorValues)) {
    sectorPercentages[sector] = roundToTwo((value / totalValue) * 100);
  }

  return sectorPercentages;
}

/**
 * Export utility functions for testing
 */
export const utils = {
  calculateTodayPnL,
  findTopGainer,
  findTopLoser,
  calculateDiversification,
  detectConcentrationRisk,
  roundToTwo,
};
