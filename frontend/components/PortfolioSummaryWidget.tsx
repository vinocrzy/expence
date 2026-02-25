'use client';

import { TrendingUp, TrendingDown, Wallet, PieChart, Target, Zap, Clock, AlertTriangle } from 'lucide-react';
import type { PortfolioSummary, PortfolioAnalytics } from '../lib/portfolio/types';
import { formatDistanceToNow } from 'date-fns';

interface PortfolioSummaryWidgetProps {
  summary: PortfolioSummary;
  analytics?: PortfolioAnalytics | null;
  pricesLastUpdated?: string | null;
  isMarketOpen?: boolean;
  isStale?: boolean;
  loading?: boolean;
}

export default function PortfolioSummaryWidget({
  summary,
  analytics,
  pricesLastUpdated,
  isMarketOpen = false,
  isStale = false,
  loading = false,
}: PortfolioSummaryWidgetProps) {
  if (loading) {
    return (
      <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-5 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-zinc-700/60 rounded w-1/2" />
          <div className="h-10 bg-zinc-700/60 rounded w-3/4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-zinc-700/60 rounded-2xl" />
            <div className="h-20 bg-zinc-700/60 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const {
    totalInvestment,
    totalCurrentValue,
    totalUnrealisedPnL,
    totalUnrealisedPnLPercent,
    totalHoldings,
  } = summary;

  const isProfit = totalUnrealisedPnL >= 0;
  const todayPnL = analytics?.todayPnL ?? 0;
  const todayPnLPercent = analytics?.todayPnLPercent ?? 0;
  const isTodayProfit = todayPnL >= 0;

  const lastUpdatedLabel = pricesLastUpdated
    ? formatDistanceToNow(new Date(pricesLastUpdated), { addSuffix: true })
    : null;

  return (
    <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-5 md:p-6 shadow-2xl">
      {/* Market Status Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isMarketOpen
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'bg-zinc-700/50 text-zinc-400 border border-white/5'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isMarketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
              }`}
            />
            {isMarketOpen ? 'Market Open' : 'Market Closed'}
          </span>
          {isStale && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">
              <AlertTriangle className="h-3 w-3" />
              Stale
            </span>
          )}
        </div>
        {lastUpdatedLabel && (
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock className="h-3 w-3" />
            <span>{lastUpdatedLabel}</span>
          </div>
        )}
      </div>

      {/* Portfolio Value Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-zinc-500 mb-1">
            Portfolio Value
          </p>
          <p className="text-4xl font-bold text-white font-mono">
            ₹{totalCurrentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-black/30 border border-white/10 p-3 rounded-2xl">
          <Wallet className="h-6 w-6 text-blue-400" />
        </div>
      </div>

      {/* P&L Row — Overall + Today side by side */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Overall Unrealized P&L */}
        <div
          className={`rounded-2xl p-3.5 ${
            isProfit
              ? 'bg-emerald-500/10 border border-emerald-500/25'
              : 'bg-rose-500/10 border border-rose-500/25'
          }`}
        >
          <p className="text-xs text-zinc-400 mb-1.5">Overall P&L</p>
          <div className="flex items-center gap-1.5 mb-0.5">
            {isProfit ? (
              <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span
              className={`text-base font-bold font-mono truncate ${
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isProfit ? '+' : ''}₹{Math.abs(totalUnrealisedPnL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <p className={`text-xs font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfit ? '+' : ''}{totalUnrealisedPnLPercent.toFixed(2)}%
          </p>
        </div>

        {/* Today's P&L */}
        <div
          className={`rounded-2xl p-3.5 ${
            analytics
              ? isTodayProfit
                ? 'bg-cyan-500/10 border border-cyan-500/25'
                : 'bg-rose-500/10 border border-rose-500/25'
              : 'bg-black/25 border border-white/5'
          }`}
        >
          <div className="flex items-center gap-1 mb-1.5">
            <Zap className="h-3 w-3 text-zinc-400" />
            <p className="text-xs text-zinc-400">Today</p>
          </div>
          {analytics ? (
            <>
              <div className="flex items-center gap-1.5 mb-0.5">
                {isTodayProfit ? (
                  <TrendingUp className="h-4 w-4 text-cyan-400 shrink-0" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span
                  className={`text-base font-bold font-mono truncate ${
                    isTodayProfit ? 'text-cyan-400' : 'text-rose-400'
                  }`}
                >
                  {isTodayProfit ? '+' : ''}₹{Math.abs(todayPnL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <p className={`text-xs font-semibold ${isTodayProfit ? 'text-cyan-400' : 'text-rose-400'}`}>
                {isTodayProfit ? '+' : ''}{todayPnLPercent.toFixed(2)}%
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-600">—</p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Invested */}
        <div className="bg-black/25 rounded-2xl p-3 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-blue-400" />
            <p className="text-xs text-zinc-400">Invested</p>
          </div>
          <p className="text-base font-semibold text-white font-mono">
            ₹{totalInvestment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Holdings Count */}
        <div className="bg-black/25 rounded-2xl p-3 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="h-4 w-4 text-purple-400" />
            <p className="text-xs text-zinc-400">Holdings</p>
          </div>
          <p className="text-base font-semibold text-white">
            {totalHoldings} {totalHoldings === 1 ? 'Stock' : 'Stocks'}
          </p>
        </div>
      </div>
    </div>
  );
}
