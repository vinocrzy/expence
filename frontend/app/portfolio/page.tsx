'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Plus, RefreshCw, Search, Upload } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useAccounts } from '../../hooks/useLocalData';
import { usePortfolio, useHoldings, usePortfolioDashboard } from '../../hooks/usePortfolio';
import StockTransactionModal from '../../components/StockTransactionModal';
import BulkStockImport from '../../components/BulkStockImport';
import StockCard from '../../components/StockCard';
import PortfolioSummaryWidget from '../../components/PortfolioSummaryWidget';
import LoadingScreen from '../../components/ui/LoadingScreen';
import NativeHeader from '../../components/dashboard/NativeHeader';
import { syncMarketPrices, getMarketSyncStatus } from '../../lib/portfolio/market-sync-service';
import { getHouseholdId } from '../../lib/localdb-services';
import type { TransactionType } from '../../lib/portfolio/types';

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { transactions, loading: txLoading } = usePortfolio();
  const { holdings, summary, loading: holdingsLoading } = useHoldings();
  const { data: dashboardData } = usePortfolioDashboard();
  
  const topGainer = dashboardData?.topGainer;
  const topLoser = dashboardData?.topLoser;

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('BUY');
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'value' | 'pnl'>('value');
  const [filterProfit, setFilterProfit] = useState<'all' | 'profit' | 'loss'>('all');

  const loading = authLoading || accountsLoading || txLoading || holdingsLoading;

  // Load sync status on mount
  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await getMarketSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const householdId = await getHouseholdId();
      await syncMarketPrices(householdId);
      await loadSyncStatus();
      // Trigger reload of holdings by refreshing the page data
      window.location.reload();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const openBuyModal = () => {
    setTransactionType('BUY');
    setShowTransactionModal(true);
  };

  const openSellModal = () => {
    setTransactionType('SELL');
    setShowTransactionModal(true);
  };

  // Filter and sort holdings
  const filteredHoldings = holdings
    .filter((holding) => {
      // Search filter
      if (searchQuery && !holding.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Profit/Loss filter
      if (filterProfit === 'profit' && holding.unrealisedPnL < 0) return false;
      if (filterProfit === 'loss' && holding.unrealisedPnL >= 0) return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'symbol':
          return a.symbol.localeCompare(b.symbol);
        case 'value':
          return b.currentValue - a.currentValue;
        case 'pnl':
          return b.unrealisedPnL - a.unrealisedPnL;
        default:
          return 0;
      }
    });

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Please log in to view your portfolio.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32 md:pb-8">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 space-y-5 md:space-y-6">
        <NativeHeader title="Portfolio" />

        {/* Header */}
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-400" />
              Stock Portfolio
            </h1>
            <p className="text-zinc-400 mt-1">
              Track your investments and monitor performance
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 text-white rounded-2xl hover:bg-[#1c1c1e] transition active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Prices
          </button>
        </div>

        {/* Sync Status */}
        {syncStatus && (
          <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-4 text-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <span className="text-zinc-400">Market:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    syncStatus.isMarketOpen
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {syncStatus.isMarketOpen ? 'Open' : 'Closed'}
                </span>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10 bg-black/30 text-sm text-white active:scale-[0.98] disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync
              </button>
              {syncStatus.lastSyncTime && (
                <div className="text-zinc-400">
                  Last sync:{' '}
                  <span className="text-white">
                    {new Date(syncStatus.lastSyncTime).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              {syncStatus.isStale && (
                <span className="text-amber-400 text-xs">
                  ⚠️ Prices may be stale
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={openBuyModal}
            className="px-6 py-3.5 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Buy Stock
          </button>
          <button
            onClick={openSellModal}
            className="px-6 py-3.5 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-2xl font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Sell Stock
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="px-6 py-3.5 bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/10 text-white rounded-2xl font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Upload className="h-5 w-5" />
            Import Portfolio
          </button>
        </div>

        {/* Portfolio Summary */}
        {summary && holdings.length > 0 && (
          <PortfolioSummaryWidget summary={summary} loading={holdingsLoading} />
        )}

        {/* Top Gainer & Loser */}
        {(topGainer || topLoser) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topGainer && (
              <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-medium text-emerald-400">Top Gainer</h3>
                </div>
                <p className="text-xl font-bold text-white mb-1">{topGainer.symbol}</p>
                <p className="text-2xl font-bold text-emerald-400">
                  +{topGainer.pnlPercent.toFixed(2)}%
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  +₹{topGainer.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {topLoser && (
              <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-rose-400" />
                  <h3 className="text-sm font-medium text-rose-400">Top Loser</h3>
                </div>
                <p className="text-xl font-bold text-white mb-1">{topLoser.symbol}</p>
                <p className="text-2xl font-bold text-rose-400">
                  {topLoser.pnlPercent.toFixed(2)}%
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  ₹{topLoser.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Search and Filters */}
        {holdings.length > 0 && (
          <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-3 md:p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stocks..."
                className="w-full bg-black/30 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="value">Sort by Value</option>
                <option value="pnl">Sort by P&L</option>
                <option value="symbol">Sort by Symbol</option>
              </select>

              <select
                value={filterProfit}
                onChange={(e) => setFilterProfit(e.target.value as any)}
                className="bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Holdings</option>
                <option value="profit">Profit Only</option>
                <option value="loss">Loss Only</option>
              </select>
            </div>
          </div>
        )}

        {/* Holdings List */}
        {holdings.length === 0 ? (
          <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-10 text-center">
            <TrendingUp className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No stocks in your portfolio
            </h3>
            <p className="text-zinc-400 mb-6">
              Start investing by buying your first stock
            </p>
            <button
              onClick={openBuyModal}
              className="px-6 py-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl font-semibold transition active:scale-[0.98] inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Buy Your First Stock
            </button>
          </div>
        ) : filteredHoldings.length === 0 ? (
          <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 text-center">
            <p className="text-zinc-400">No stocks match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredHoldings.map((holding) => (
              <StockCard key={holding.symbol} holding={holding} />
            ))}
          </div>
        )}

        {/* Recent Transactions Preview */}
        {transactions.length > 0 && (
          <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
              <span className="text-sm text-zinc-500">Last 5</span>
            </div>
            <div className="space-y-2">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx._id}
                  className="flex items-center justify-between p-3 bg-black/25 border border-white/5 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        tx.type === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      <TrendingUp
                        className={`h-4 w-4 ${
                          tx.type === 'SELL' ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-white font-medium">{tx.symbol}</p>
                      <p className="text-xs text-zinc-500">
                        {tx.quantity} shares @ ₹{tx.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium font-mono">
                      ₹{(tx.quantity * tx.price).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(tx.date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Stock Transaction Modal */}
      <StockTransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={() => {
          setShowTransactionModal(false);
          // Reload data
          window.location.reload();
        }}
        initialType={transactionType}
        accounts={accounts}
      />

      {/* Bulk Import Modal */}
      <BulkStockImport
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={() => {
          setShowBulkImport(false);
          // Reload data
          window.location.reload();
        }}
      />
    </div>
  );
}
