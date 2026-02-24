/**
 * Example Portfolio Components
 * 
 * Demonstrates how to use the Stock Portfolio module
 * Copy these components to your app and customize as needed
 */

'use client';

import { useState } from 'react';
import { usePortfolio, usePortfolioDashboard } from '@/hooks/usePortfolio';
import type { StockTransaction } from '@/lib/portfolio/types';

/**
 * Dashboard Widget - Lightweight portfolio overview
 */
export function PortfolioDashboardWidget() {
  const { data, loading, syncStatus } = usePortfolioDashboard();

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Stock Portfolio</h3>
        {data.isStale && (
          <span className="text-xs text-yellow-600">Prices may be outdated</span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600">Total Value</p>
          <p className="text-2xl font-bold">₹{data.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Total P&L</p>
          <p className={`text-xl font-semibold ${data.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.totalPnL >= 0 ? '+' : ''}₹{data.totalPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            <span className="text-sm ml-2">
              ({data.totalPnLPercent >= 0 ? '+' : ''}{data.totalPnLPercent.toFixed(2)}%)
            </span>
          </p>
        </div>

        {data.todayPnL !== 0 && (
          <div>
            <p className="text-sm text-gray-600">Today's Change</p>
            <p className={`text-lg ${data.todayPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.todayPnL >= 0 ? '+' : ''}₹{data.todayPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {data.topGainer && (
          <div className="pt-3 border-t">
            <p className="text-xs text-gray-600">Top Performer</p>
            <p className="text-sm font-medium text-green-600">
              {data.topGainer.symbol} +{data.topGainer.pnlPercent.toFixed(1)}%
            </p>
          </div>
        )}

        <div className="pt-3 border-t text-xs text-gray-500">
          {data.holdingsCount} holding{data.holdingsCount !== 1 ? 's' : ''} • 
          Last updated: {new Date(data.lastUpdatedTime).toLocaleString('en-IN', { 
            dateStyle: 'short', 
            timeStyle: 'short' 
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Holdings List - Detailed view of all holdings
 */
export function PortfolioHoldingsList() {
  const { holdings, summary, loading, syncPrices } = usePortfolio();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncPrices(true);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div>Loading holdings...</div>;
  }

  if (holdings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No holdings yet</p>
        <p className="text-sm text-gray-500">Add your first stock transaction to get started</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Holdings</h2>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {syncing ? 'Syncing...' : 'Sync Prices'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-4 bg-gray-50 border-b">
          <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
            <div>Investment: ₹{summary.totalInvestment.toLocaleString('en-IN')}</div>
            <div>Current Value: ₹{summary.totalCurrentValue.toLocaleString('en-IN')}</div>
            <div className={summary.totalUnrealisedPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
              P&L: ₹{summary.totalUnrealisedPnL.toLocaleString('en-IN')} ({summary.totalUnrealisedPnLPercent.toFixed(2)}%)
            </div>
            <div>{summary.totalHoldings} Holdings</div>
          </div>
        </div>

        <div className="divide-y">
          {holdings.map((holding) => (
            <div
              key={`${holding.exchange}_${holding.symbol}`}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{holding.symbol}</h3>
                  <p className="text-sm text-gray-600">{holding.exchange}</p>
                </div>
                
                <div className="text-right">
                  <p className={`text-lg font-semibold ${holding.unrealisedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {holding.unrealisedPnL >= 0 ? '+' : ''}₹{holding.unrealisedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className={`text-sm ${holding.unrealisedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {holding.unrealisedPnLPercent >= 0 ? '+' : ''}{holding.unrealisedPnLPercent.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Quantity</p>
                  <p className="font-medium">{holding.totalUnits}</p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Buy</p>
                  <p className="font-medium">₹{holding.avgBuyPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Current Price</p>
                  <p className="font-medium">₹{holding.currentPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Current Value</p>
                  <p className="font-medium">₹{holding.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Add Transaction Form
 */
export function AddStockTransactionForm() {
  const { addTransaction } = usePortfolio();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<StockTransaction>>({
    type: 'BUY',
    exchange: 'NSE',
    quantity: 1,
    charges: 0,
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addTransaction({
        type: formData.type as 'BUY' | 'SELL',
        symbol: formData.symbol!,
        exchange: formData.exchange as 'NSE' | 'BSE',
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        charges: Number(formData.charges) || 0,
        date: new Date(formData.date!).toISOString(),
        notes: formData.notes,
      });

      // Reset form
      setFormData({
        type: 'BUY',
        exchange: 'NSE',
        quantity: 1,
        charges: 0,
        date: new Date().toISOString().split('T')[0],
      });

      alert('Transaction added successfully!');
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow max-w-md">
      <h3 className="text-xl font-semibold mb-4">Add Transaction</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'BUY' | 'SELL' })}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <input
            type="text"
            value={formData.symbol || ''}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
            placeholder="e.g., RELIANCE"
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Exchange</label>
          <select
            value={formData.exchange}
            onChange={(e) => setFormData({ ...formData, exchange: e.target.value as 'NSE' | 'BSE' })}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="NSE">NSE</option>
            <option value="BSE">BSE</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Quantity</label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
            min="1"
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Price per share (₹)</label>
          <input
            type="number"
            value={formData.price || ''}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            step="0.01"
            min="0.01"
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Charges (₹)</label>
          <input
            type="number"
            value={formData.charges}
            onChange={(e) => setFormData({ ...formData, charges: Number(e.target.value) })}
            step="0.01"
            min="0"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={2}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Adding...' : 'Add Transaction'}
        </button>
      </div>
    </form>
  );
}

/**
 * Portfolio Insights Card
 */
export function PortfolioInsightsCard() {
  const { insights, loading } = usePortfolio();

  if (loading || insights.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Portfolio Insights</h3>
      
      <div className="space-y-3">
        {insights.slice(0, 3).map((insight, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border-l-4 ${
              insight.type === 'success' ? 'border-green-500 bg-green-50' :
              insight.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              insight.type === 'error' ? 'border-red-500 bg-red-50' :
              'border-blue-500 bg-blue-50'
            }`}
          >
            <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
            <p className="text-sm text-gray-700">{insight.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
