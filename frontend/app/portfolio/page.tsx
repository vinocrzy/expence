'use client';

import { useState, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  Search,
  Upload,
  AlertTriangle,
  PieChart,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useAccounts } from '../../hooks/useLocalData';
import { usePortfolio } from '../../hooks/usePortfolio';
import StockTransactionModal from '../../components/StockTransactionModal';
import BulkStockImport from '../../components/BulkStockImport';
import StockCard from '../../components/StockCard';
import PortfolioSummaryWidget from '../../components/PortfolioSummaryWidget';
import LoadingScreen from '../../components/ui/LoadingScreen';
import NativeHeader from '../../components/dashboard/NativeHeader';
import type { TransactionType } from '../../lib/portfolio/types';

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth();
  const { accounts, loading: accountsLoading } = useAccounts();

  // Use the full hook to access analytics, quotes, and all API data
  const {
    transactions,
    holdings,
    summary,
    analytics,
    quotes,
    syncStatus,
    pricesLastUpdated,
    loading: portfolioLoading,
    error,
    syncPrices,
    refresh,
  } = usePortfolio();

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('BUY');
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'value' | 'pnl'>('value');
  const [filterProfit, setFilterProfit] = useState<'all' | 'profit' | 'loss'>('all');

  const loading = authLoading || accountsLoading || portfolioLoading;

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncPrices();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }, [syncPrices]);

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
      if (searchQuery && !holding.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filterProfit === 'profit' && holding.unrealisedPnL < 0) return false;
      if (filterProfit === 'loss' && holding.unrealisedPnL >= 0) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'symbol': return a.symbol.localeCompare(b.symbol);
        case 'value': return b.currentValue - a.currentValue;
        case 'pnl': return b.unrealisedPnL - a.unrealisedPnL;
        default: return 0;
      }
    });

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Please log in to view your portfolio.</p>
      </div>
    );
  }

  const topGainer = analytics?.topGainer;
  const topLoser = analytics?.topLoser;
  const concentrationRisk = analytics?.concentrationRisk;
  const diversification = analytics?.diversification ?? [];
  const isMarketOpen = syncStatus?.isMarketOpen ?? false;

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32 md:pb-8">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-5">
        <NativeHeader title="Portfolio" />

        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-400" />
              Stock Portfolio
            </h1>
            <p className="text-zinc-400 mt-1">Track your investments and monitor performance</p>
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

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl px-4 py-3 flex items-center gap-2 text-rose-400 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Mobile Sync Row */}
        <div className="flex md:hidden items-center justify-between bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${isMarketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`}
            />
            <span className="text-sm text-zinc-400">
              {isMarketOpen ? 'Market Open' : 'Market Closed'}
            </span>
            {syncStatus?.isStale && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Stale
              </span>
            )}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-black/30 text-sm text-white active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={openBuyModal}
            className="px-4 py-3.5 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <Plus className="h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden sm:inline">Buy</span>
            <span className="sm:hidden">Buy</span>
          </button>
          <button
            onClick={openSellModal}
            className="px-4 py-3.5 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-2xl font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <TrendingDown className="h-4 w-4 md:h-5 md:w-5" />
            Sell
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="px-4 py-3.5 bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/10 text-white rounded-2xl font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <Upload className="h-4 w-4 md:h-5 md:w-5" />
            Import
          </button>
        </div>

        {/* Portfolio Summary â€” with full API data */}
        {summary && holdings.length > 0 && (
          <PortfolioSummaryWidget
            summary={summary}
            analytics={analytics}
            pricesLastUpdated={pricesLastUpdated}
            isMarketOpen={isMarketOpen}
            isStale={syncStatus?.isStale}
            loading={portfolioLoading}
          />
        )}

        {/* Concentration Risk Warning */}
        {concentrationRisk && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-400">Concentration Risk</p>
              <p className="text-xs text-zinc-400 mt-0.5">{concentrationRisk.message}</p>
            </div>
            <span className="ml-auto text-sm font-bold text-amber-400 font-mono shrink-0">
              {concentrationRisk.percentage.toFixed(1)}%
            </span>
          </div>
        )}

        {/* Top Gainer & Loser */}
        {(topGainer || topLoser) && (
          <div className="grid grid-cols-2 gap-3">
            {topGainer && (
              <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Top Gainer</h3>
                </div>
                <p className="text-base font-bold text-white mb-0.5">{topGainer.symbol}</p>
                <p className="text-xl font-bold text-emerald-400 font-mono">
                  +{topGainer.pnlPercent.toFixed(2)}%
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                  +₹{topGainer.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
            {topLoser && (
              <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingDown className="h-4 w-4 text-rose-400" />
                  <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Top Loser</h3>
                </div>
                <p className="text-base font-bold text-white mb-0.5">{topLoser.symbol}</p>
                <p className="text-xl font-bold text-rose-400 font-mono">
                  {topLoser.pnlPercent.toFixed(2)}%
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                  ₹{topLoser.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Diversification Breakdown */}
        {diversification.length > 1 && (
          <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Allocation</h3>
            </div>
            <div className="space-y-2.5">
              {diversification.slice(0, 6).map((item, idx) => {
                const colors = [
                  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500',
                  'bg-cyan-500', 'bg-orange-500', 'bg-rose-500',
                ];
                const color = colors[idx % colors.length];
                return (
                  <div key={item.symbol} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 w-20 font-medium truncate shrink-0">{item.symbol}</span>
                    <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all`}
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 font-mono w-12 text-right shrink-0">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
              {diversification.length > 6 && (
                <p className="text-xs text-zinc-600 pt-1">
                  +{diversification.length - 6} more holdings
                </p>
              )}
            </div>
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
            <div className="grid grid-cols-2 gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="value">Sort by Value</option>
                <option value="pnl">Sort by P&L</option>
                <option value="symbol">Sort by Symbol</option>
              </select>
              <select
                value={filterProfit}
                onChange={(e) => setFilterProfit(e.target.value as any)}
                className="bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
            <h3 className="text-xl font-semibold text-white mb-2">No stocks in your portfolio</h3>
            <p className="text-zinc-400 mb-6">Start investing by buying your first stock</p>
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
            {filteredHoldings.map((holding) => {
              // Look up quote by exchange_symbol key (matches PouchDB _id format)
              const quoteKey = `quote_${holding.exchange}_${holding.symbol}`;
              const quote = quotes[quoteKey] ?? null;
              return (
                <StockCard key={holding.symbol} holding={holding} quote={quote} />
              );
            })}
          </div>
        )}

        {/* Recent Transactions Preview */}
        {transactions.length > 0 && (
          <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Recent Transactions</h3>
              <span className="text-xs text-zinc-500">Last 5</span>
            </div>
            <div className="space-y-2">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx._id}
                  className="flex items-center justify-between p-3 bg-black/25 border border-white/5 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        tx.type === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {tx.type === 'BUY' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{tx.symbol}</p>
                      <p className="text-xs text-zinc-500">
                        {tx.quantity} shares @ ₹{tx.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium font-mono text-sm">
                      ₹{(tx.quantity * tx.price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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

      {/* Modals */}
      <StockTransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={() => {
          setShowTransactionModal(false);
          refresh();
        }}
        initialType={transactionType}
        accounts={accounts}
        holdings={holdings.map(h => ({ symbol: h.symbol, totalUnits: h.totalUnits }))}
      />

      <BulkStockImport
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={() => {
          setShowBulkImport(false);
          refresh();
        }}
      />
    </div>
  );
}
