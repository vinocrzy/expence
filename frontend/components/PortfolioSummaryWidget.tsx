'use client';

import { TrendingUp, TrendingDown, Wallet, PieChart, Target, Activity } from 'lucide-react';
import type { PortfolioSummary } from '../lib/portfolio/types';

interface PortfolioSummaryWidgetProps {
  summary: PortfolioSummary;
  loading?: boolean;
}

export default function PortfolioSummaryWidget({
  summary,
  loading = false,
}: PortfolioSummaryWidgetProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-zinc-700 rounded w-1/2" />
          <div className="h-10 bg-zinc-700 rounded w-3/4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-zinc-700 rounded" />
            <div className="h-20 bg-zinc-700 rounded" />
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

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-medium text-zinc-400 mb-1">
            Portfolio Value
          </h2>
          <p className="text-3xl font-bold text-white">
            ₹{totalCurrentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-zinc-800 p-3 rounded-xl">
          <Wallet className="h-6 w-6 text-blue-400" />
        </div>
      </div>

      {/* Unrealized P&L - Main Highlight */}
      <div
        className={`rounded-xl p-4 mb-4 ${
          isProfit
            ? 'bg-emerald-500/10 border border-emerald-500/30'
            : 'bg-rose-500/10 border border-rose-500/30'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 mb-1">Unrealized P&L</p>
            <div className="flex items-center gap-2">
              {isProfit ? (
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-rose-400" />
              )}
              <span
                className={`text-2xl font-bold ${
                  isProfit ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isProfit ? '+' : ''}₹
                {totalUnrealisedPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-2xl font-bold ${
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isProfit ? '+' : ''}{totalUnrealisedPnLPercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Invested */}
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-blue-400" />
            <p className="text-xs text-zinc-400">Invested</p>
          </div>
          <p className="text-lg font-semibold text-white">
            ₹{totalInvestment.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Holdings Count */}
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="h-4 w-4 text-purple-400" />
            <p className="text-xs text-zinc-400">Holdings</p>
          </div>
          <p className="text-lg font-semibold text-white">
            {totalHoldings} {totalHoldings === 1 ? 'Stock' : 'Stocks'}
          </p>
        </div>

      </div>
    </div>
  );
}
