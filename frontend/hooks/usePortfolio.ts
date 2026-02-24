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
} from '@/lib/portfolio/repository';
import { calculateHoldings } from '@/lib/portfolio/holdings-calculator';
import {
  calculatePortfolioAnalytics,
  calculatePortfolioAnalyticsSimple,
  generatePortfolioInsights,
  type PortfolioInsight,
} from '@/lib/portfolio/portfolio-analytics';
import {
  syncMarketPrices,
  manualSync,
  getMarketSyncStatus,
  type MarketSyncStatus,
} from '@/lib/portfolio/market-sync-service';
import { events, EVENTS } from '@/lib/events';

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

  /**
   * Load all portfolio data
   */
  const loadPortfolioData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const householdId = getHouseholdId();

      // Load transactions and quotes in parallel
      const [txns, latestQuotes] = await Promise.all([
        getStockTransactionsByHousehold({ householdId }),
        getLatestQuotes(),
      ]);

      setTransactions(txns);
      setQuotes(latestQuotes);

      // Load today's snapshots
      const today = getTodayIST();
      const [openSnaps, closeSnaps] = await Promise.all([
        getMarketSnapshots(today, 'OPEN'),
        getMarketSnapshots(today, 'CLOSE'),
      ]);

      setTodayOpenSnapshots(openSnaps);
      setTodayCloseSnapshots(closeSnaps);

      // Get sync status
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
   * Calculate holdings (memoized)
   */
  const { holdings, summary } = useMemo(() => {
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

    return calculateHoldings({
      transactions,
      quotes,
    });
  }, [transactions, quotes]);

  /**
   * Calculate analytics (memoized)
   */
  const analytics = useMemo((): PortfolioAnalytics | null => {
    if (holdings.length === 0) return null;

    // Use full analytics if we have today's snapshots
    if (Object.keys(todayOpenSnapshots).length > 0) {
      return calculatePortfolioAnalytics({
        holdings,
        todayOpenQuotes: todayOpenSnapshots,
        todayCloseQuotes: quotes, // Always use quotes (latest prices)
        portfolioSummary: summary,
      });
    }

    // Fallback to simple analytics
    return calculatePortfolioAnalyticsSimple(holdings, summary);
  }, [holdings, summary, todayOpenSnapshots, quotes]);

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
    const lastUpdated = syncStatus?.lastSyncTime || summary.lastUpdated;
    const isStale = syncStatus?.isStale ?? false;

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
  }, [summary, analytics, syncStatus]);

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

  const syncPrices = useCallback(async (force: boolean = false) => {
    try {
      const householdId = getHouseholdId();
      const result = await (force ? manualSync(householdId) : syncMarketPrices(householdId));
      
      if (result.success) {
        // Reload quotes after sync
        await loadPortfolioData();
      }
      
      return result;
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
