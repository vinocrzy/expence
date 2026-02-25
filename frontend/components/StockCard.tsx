'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, Activity, Calendar, DollarSign } from 'lucide-react';
import type { Holding } from '../lib/portfolio/types';
import { format } from 'date-fns';

interface StockCardProps {
  holding: Holding;
  onClick?: () => void;
}

export default function StockCard({ holding, onClick }: StockCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    symbol,
    totalUnits,
    avgBuyPrice,
    currentPrice,
    investedValue,
    currentValue,
    unrealisedPnL,
    unrealisedPnLPercent,
  } = holding;

  const isProfit = unrealisedPnL >= 0;


  return (
    <div
      className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden transition active:scale-[0.98] cursor-pointer"
      onClick={onClick}
    >
      {/* Main Content */}
      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{symbol}</h3>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {totalUnits.toLocaleString('en-IN', { maximumFractionDigits: 3 })} shares
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={`p-2 bg-black/20 border border-white/10 rounded-xl transition ${
              isExpanded ? 'rotate-180' : ''
            }`}
          >
            <ChevronDown className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        {/* Current Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-white font-mono">
            ₹{currentPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '—'}
          </span>
          <span className="text-sm text-zinc-500">per share</span>
        </div>

        {/* P&L Summary */}
        <div className="grid grid-cols-2 gap-4">
          {/* Current Value */}
          <div>
            <p className="text-xs text-zinc-500 mb-1">Current Value</p>
            <p className="text-lg font-semibold text-white font-mono">
              ₹{currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Unrealized P&L */}
          <div>
            <p className="text-xs text-zinc-500 mb-1">Unrealized P&L</p>
            <div className="flex items-center gap-1.5">
              {isProfit ? (
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-rose-400" />
              )}
              <span
                className={`text-lg font-semibold ${
                  isProfit ? 'text-emerald-400' : 'text-rose-400'
                } font-mono`}
              >
                {isProfit ? '+' : ''}₹{unrealisedPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <p
              className={`text-xs mt-0.5 ${
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isProfit ? '+' : ''}{unrealisedPnLPercent.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-3 animate-in slide-in-from-top-2">
            {/* Investment Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2 bg-black/20 border border-white/5 rounded-2xl p-2.5">
                <DollarSign className="h-4 w-4 text-zinc-500 mt-0.5" />
                <div>
                  <p className="text-zinc-500">Avg. Price</p>
                  <p className="text-white font-medium font-mono">
                    ₹{avgBuyPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-black/20 border border-white/5 rounded-2xl p-2.5">
                <Activity className="h-4 w-4 text-zinc-500 mt-0.5" />
                <div>
                  <p className="text-zinc-500">Total Invested</p>
                  <p className="text-white font-medium font-mono">
                    ₹{investedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Note: Realized P&L feature can be added later */}

            {/* Last Updated */}
            {currentPrice && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>Price as of {format(new Date(), 'MMM dd, yyyy h:mm a')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Performance Bar */}
      <div className="h-1.5 bg-black/30">
        <div
          className={`h-full transition-all ${
            isProfit ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
          style={{
            width: `${Math.min(Math.abs(unrealisedPnLPercent), 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
