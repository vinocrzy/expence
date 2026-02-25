/**
 * Portfolio React Hook
 * 
 * Provides portfolio data, holdings, analytics, and dashboard data
 * Auto-refreshes on data changes using event system
 * Memoized for performance
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Holding,
  PortfolioSummary,
  PortfolioAnalytics,
  PortfolioDashboardData,
  StockTransaction,
  MarketQuote,
  MarketSnapshot,
} from '@/lib/portfolio/types';
import {
  getStockTransactionsByHousehold,
  getLatestQuotes,
  getMarketSnapshots,
  addStockTransaction as addStockTransactionRepo,
  updateStockTransaction as updateStockTransactionRepo,
  deleteStockTransaction as deleteStockTransactionRepo,
  upsertMarketQuotes,
} from '@/lib/portfolio/repository';
import { calculateHoldings } from '@/lib/portfolio/holdings-calculator';
import {
  calculatePortfolioAnalytics,
  calculatePortfolioAnalyticsSimple,
  generatePortfolioInsights,
  type PortfolioInsight,
} from '@/lib/portfolio/portfolio-analytics';
import {
  getMarketSyncStatus,
  type MarketSyncStatus,
} from '@/lib/portfolio/market-sync-service';
import { events, EVENTS } from '@/lib/events';
import type { SimpleHolding } from '@/app/api/portfolio/calculate/route';

// ─── Server calculate helper ───────────────────────────────────────────────────

interface ServerCalcResult {
  holdings: Holding[];
  summary: PortfolioSummary;
  analytics: PortfolioAnalytics;
  quotes: Record<string, MarketQuote>;
  pricesLastUpdated: string | null;
  isStale: boolean;
}

async function serverCalculate(simpleHoldings: SimpleHolding[]): Promise<ServerCalcResult | null> {
  try {
    const res = await fetch('/api/portfolio/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holdings: simpleHoldings }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<ServerCalcResult>;
  } catch {
    return null;
  }
}

/**
 * Get household ID (reuse existing pattern)
 */
const getHouseholdId = (): string | undefined => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('household_id') || undefined;
  }
  return undefined;
};

/**
 * Get today's date in YYYY-MM-DD format (IST)
 */
function getTodayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().split('T')[0];
}

/**
 * Main Portfolio Hook
 * 
 * Returns:
 * - holdings: Array of current holdings
 * - summary: Portfolio summary (total investment, P&L, etc.)
 * - analytics: Advanced metrics (today P&L, top gainer/loser, etc.)
 * - dashboardData: Optimized data for dashboard widget
 * - insights: Generated insights for Insights engine
 * - transactions: Raw stock transactions
 * - loading: Loading state
 * - error: Error state
 * - actions: CRUD operations and sync
 */
export function usePortfolio() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [todayOpenSnapshots, setTodayOpenSnapshots] = useState<Record<string, MarketSnapshot>>({});
  const [todayCloseSnapshots, setTodayCloseSnapshots] = useState<Record<string, MarketSnapshot>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<MarketSyncStatus | null>(null);

  // Server-calculated data (preferred over local calculation when available)
  const [serverResult, setServerResult] = useState<ServerCalcResult | null>(null);
  const [pricesLastUpdated, setPricesLastUpdated] = useState<string | null>(null);

  /**
   * Load all portfolio data
   */
  const loadPortfolioData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const householdId = getHouseholdId();

      // 1. Load transactions from local PouchDB
      const txns = await getStockTransactionsByHousehold({ householdId });
      setTransactions(txns);

      // 2. Try server-side path first (enriches with live NSE prices + full analytics)
      if (txns.length > 0) {
        // Build SimpleHolding[] from local transactions (no prices needed)
        const localRaw = calculateHoldings({ transactions: txns, quotes: {} });
        const simpleHoldings: SimpleHolding[] = localRaw.holdings.map((h) => ({
          symbol: h.symbol,
          exchange: h.exchange,
          totalUnits: h.totalUnits,
          avgBuyPrice: h.avgBuyPrice,
          investedValue: h.investedValue,
          firstBuyDate: h.firstBuyDate,
          lastTransactionDate: h.lastTransactionDate,
        }));

        const result = await serverCalculate(simpleHoldings);
        if (result) {
          setServerResult(result);
          setPricesLastUpdated(result.pricesLastUpdated);

          // Push server-returned quotes into PouchDB so the offline path stays warm
          if (result.quotes && Object.keys(result.quotes).length > 0) {
            try {
              await upsertMarketQuotes(Object.values(result.quotes));
            } catch {
              // Non-critical — ignore PouchDB write errors
            }
          }
        } else {
          setServerResult(null);
        }
      }

      // 3. Always load local quotes + snapshots for the offline fallback
      const [latestQuotes, openSnaps, closeSnaps] = await Promise.all([
        getLatestQuotes(),
        getMarketSnapshots(getTodayIST(), 'OPEN'),
        getMarketSnapshots(getTodayIST(), 'CLOSE'),
      ]);
      setQuotes(latestQuotes);
      setTodayOpenSnapshots(openSnaps);
      setTodayCloseSnapshots(closeSnaps);

      // 4. Sync status
      const status = await getMarketSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      console.error('Failed to load portfolio data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initial load and event subscriptions
   */
  useEffect(() => {
    loadPortfolioData();

    // Subscribe to portfolio events
    const unsubscribe = events.on(EVENTS.PORTFOLIO_CHANGED, loadPortfolioData);
    
    return unsubscribe;
  }, [loadPortfolioData]);

  /**
   * Calculate holdings — prefer server result, fall back to local when offline
   */
  const { holdings, summary } = useMemo(() => {
    // Server result takes priority (has live NSE prices)
    if (serverResult) {
      return { holdings: serverResult.holdings, summary: serverResult.summary };
    }

    if (transactions.length === 0) {
      return {
        holdings: [],
        summary: {
          totalInvestment: 0,
          totalCurrentValue: 0,
          totalUnrealisedPnL: 0,
          totalUnrealisedPnLPercent: 0,
          totalHoldings: 0,
          lastUpdated: new Date().toISOString(),
        },
      };
    }

    // Offline fallback: local PouchDB quotes
    return calculateHoldings({ transactions, quotes });
  }, [serverResult, transactions, quotes]);

  /**
   * Calculate analytics — prefer server result, fall back to local
   */
  const analytics = useMemo((): PortfolioAnalytics | null => {
    if (serverResult?.analytics) return serverResult.analytics;

    if (holdings.length === 0) return null;

    if (Object.keys(todayOpenSnapshots).length > 0) {
      return calculatePortfolioAnalytics({
        holdings,
        todayOpenQuotes: todayOpenSnapshots,
        todayCloseQuotes: quotes,
        portfolioSummary: summary,
      });
    }

    return calculatePortfolioAnalyticsSimple(holdings, summary);
  }, [serverResult, holdings, summary, todayOpenSnapshots, quotes]);

  /**
   * Generate insights (memoized)
   */
  const insights = useMemo((): PortfolioInsight[] => {
    if (!analytics) return [];
    return generatePortfolioInsights(analytics, summary);
  }, [analytics, summary]);

  /**
   * Dashboard data (memoized)
   */
  const dashboardData = useMemo((): PortfolioDashboardData => {
    const lastUpdated = pricesLastUpdated ?? syncStatus?.lastSyncTime ?? summary.lastUpdated;
    const isStale = serverResult ? serverResult.isStale : (syncStatus?.isStale ?? false);

    return {
      totalInvestment: summary.totalInvestment,
      totalValue: summary.totalCurrentValue,
      totalPnL: summary.totalUnrealisedPnL,
      totalPnLPercent: summary.totalUnrealisedPnLPercent,
      todayPnL: analytics?.todayPnL ?? 0,
      todayPnLPercent: analytics?.todayPnLPercent ?? 0,
      topGainer: analytics?.topGainer ?? null,
      topLoser: analytics?.topLoser ?? null,
      lastUpdatedTime: lastUpdated,
      holdingsCount: summary.totalHoldings,
      isStale,
    };
  }, [summary, analytics, syncStatus, pricesLastUpdated, serverResult]);

  /**
   * Actions
   */

  const addTransaction = useCallback(async (
    data: Omit<StockTransaction, '_id' | 'createdAt' | 'householdId'>
  ) => {
    try {
      const householdId = getHouseholdId();
      const transaction = await addStockTransactionRepo({
        ...data,
        householdId,
      });
      
      events.emit(EVENTS.PORTFOLIO_CHANGED);
      return transaction;
    } catch (err) {
      console.error('Failed to add transaction:', err);
      throw err;
    }
  }, []);

  const updateTransaction = useCallback(async (transaction: StockTransaction) => {
    try {
      const updated = await updateStockTransactionRepo(transaction);
      events.emit(EVENTS.PORTFOLIO_CHANGED);
      return updated;
    } catch (err) {
      console.error('Failed to update transaction:', err);
      throw err;
    }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      await deleteStockTransactionRepo(id);
      events.emit(EVENTS.PORTFOLIO_CHANGED);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      throw err;
    }
  }, []);

  /**
   * Trigger a full NSE price refresh, then re-run the portfolio calculation.
   * force=true is kept for interface compatibility.
   */
  const syncPrices = useCallback(async (_force: boolean = false) => {
    try {
      // Trigger a full cache refresh on the server
      const res = await fetch('/api/portfolio/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      // Reload all portfolio data with fresh prices
      await loadPortfolioData();

      return { success: res.ok, data };
    } catch (err) {
      console.error('Failed to sync prices:', err);
      throw err;
    }
  }, [loadPortfolioData]);

  const refreshSyncStatus = useCallback(async () => {
    try {
      const status = await getMarketSyncStatus();
      setSyncStatus(status);
      return status;
    } catch (err) {
      console.error('Failed to refresh sync status:', err);
      return null;
    }
  }, []);

  return {
    // Data
    holdings,
    summary,
    analytics,
    dashboardData,
    insights,
    transactions,
    quotes,
    syncStatus,
    pricesLastUpdated,
    
    // State
    loading,
    error,
    
    // Actions
    addTransaction,
    updateTransaction,
    deleteTransaction,
    syncPrices,
    refreshSyncStatus,
    refresh: loadPortfolioData,
  };
}

/**
 * Lightweight hook for dashboard widget (only data, no actions)
 */
export function usePortfolioDashboard() {
  const {
    dashboardData,
    loading,
    error,
    syncStatus,
  } = usePortfolio();

  return {
    data: dashboardData,
    loading,
    error,
    syncStatus,
  };
}

/**
 * Hook for holdings list (no analytics)
 */
export function useHoldings() {
  const {
    holdings,
    summary,
    loading,
    error,
  } = usePortfolio();

  return {
    holdings,
    summary,
    loading,
    error,
  };
}

/**
 * Hook for portfolio insights only
 */
export function usePortfolioInsights() {
  const {
    insights,
    analytics,
    loading,
  } = usePortfolio();

  return {
    insights,
    analytics,
    loading,
  };
}
