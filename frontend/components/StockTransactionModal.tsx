'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Search, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { addStockTransaction } from '../lib/portfolio/repository';
import type { TransactionType, Exchange } from '../lib/portfolio/types';
import { getHouseholdId } from '../lib/localdb-services';

interface Account {
  id: string;
  name: string;
  currency: string;
}

interface StockTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialType?: TransactionType;
  accounts: Account[];
}

interface StockData {
  symbol: string;
  name: string;
  exchange: string;
  type?: 'STOCK' | 'ETF';
}

// Fallback popular stocks in case JSON fails to load
const FALLBACK_STOCKS: StockData[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'INFY', name: 'Infosys Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'ITC', name: 'ITC Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'WIPRO', name: 'Wipro Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', exchange: 'NSE', type: 'STOCK' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', exchange: 'NSE', type: 'STOCK' },
];

export default function StockTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'BUY',
  accounts,
}: StockTransactionModalProps) {
  const [type, setType] = useState<TransactionType>(initialType);
  const [symbol, setSymbol] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [symbolType, setSymbolType] = useState<'all' | 'STOCK' | 'ETF'>('all');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableStocks, setAvailableStocks] = useState<StockData[]>(FALLBACK_STOCKS);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [linkToAccount, setLinkToAccount] = useState(false);

  // Load stock symbols from JSON
  useEffect(() => {
    const loadStocks = async () => {
      try {
        const response = await fetch('/data/nse_stocks.json');
        if (!response.ok) throw new Error('Failed to fetch stocks');
        
        const data = await response.json();
        if (data.symbols && Array.isArray(data.symbols)) {
          setAvailableStocks(data.symbols);
          console.log(`Loaded ${data.symbols.length} symbols from NSE (${data.stocks} stocks, ${data.etfs} ETFs)`);
        }
      } catch (err) {
        console.warn('Failed to load stock symbols, using fallback:', err);
        // Keep fallback stocks
      } finally {
        setLoadingStocks(false);
      }
    };

    loadStocks();
  }, []);

  // Filter stocks based on search and type
  const filteredStocks = availableStocks.filter(
    (stock) => {
      // Type filter
      if (symbolType !== 'all' && stock.type !== symbolType) {
        return false;
      }
      
      // Search filter
      return (
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  );

  // Auto-select first account if available and account linking is enabled
  useEffect(() => {
    if (linkToAccount && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [linkToAccount, accounts, accountId]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setSymbol('');
      setCustomSymbol('');
      setShowCustomInput(false);
      setQuantity('');
      setPrice('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setSearchQuery('');
      setError('');
      setLinkToAccount(false);
    }
  }, [isOpen, initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const finalSymbol = showCustomInput ? customSymbol.toUpperCase() : symbol;

      if (!finalSymbol) {
        throw new Error('Please select or enter a stock symbol');
      }

      if (linkToAccount && !accountId) {
        throw new Error('Please select an account');
      }

      const qty = parseFloat(quantity);
      const priceValue = parseFloat(price);

      if (isNaN(qty) || qty <= 0) {
        throw new Error('Please enter a valid quantity');
      }

      if (isNaN(priceValue) || priceValue <= 0) {
        throw new Error('Please enter a valid price');
      }

      const householdId = await getHouseholdId();

      await addStockTransaction({
        type,
        symbol: finalSymbol,
        exchange: 'NSE' as Exchange,
        quantity: qty,
        price: priceValue,
        date,
        householdId,
        notes: notes || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
      console.error('Stock transaction error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          />

          <motion.div
            className="relative bg-[#1c1c1e]/95 backdrop-blur-xl w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto shadow-2xl border border-white/5 pb-safe"
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 56, opacity: 0, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.85 }}
          >
        {/* Header */}
        <div className="sticky top-0 bg-[#1c1c1e]/95 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {type === 'BUY' ? (
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            ) : (
              <TrendingDown className="h-6 w-6 text-rose-400" />
            )}
            {type === 'BUY' ? 'Buy Stock' : 'Sell Stock'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition p-2 hover:bg-black/30 border border-white/10 rounded-xl"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Transaction Type Toggle */}
          <div className="flex gap-2 p-1 bg-black/30 border border-white/10 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('BUY')}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition active:scale-[0.98] flex items-center justify-center gap-2 ${
                type === 'BUY'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Buy
            </button>
            <button
              type="button"
              onClick={() => setType('SELL')}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition active:scale-[0.98] flex items-center justify-center gap-2 ${
                type === 'SELL'
                  ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              Sell
            </button>
          </div>

          {/* Stock Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Stock / ETF Symbol *
            </label>

            {!showCustomInput ? (
              <>
                {/* Type Filter */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setSymbolType('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      symbolType === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSymbolType('STOCK')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      symbolType === 'STOCK'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Stocks
                  </button>
                  <button
                    type="button"
                    onClick={() => setSymbolType('ETF')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      symbolType === 'ETF'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    ETFs
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search stocks or ETFs..."
                    className="w-full bg-black/30 border border-white/10 rounded-2xl px-10 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Stock Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto mb-3 p-1">
                  {loadingStocks ? (
                    <div className="col-span-full text-center py-8 text-zinc-500">
                      Loading stocks and ETFs...
                    </div>
                  ) : filteredStocks.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-zinc-500">
                      No symbols found matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredStocks.map((stock) => (
                      <button
                        key={stock.symbol}
                        type="button"
                        onClick={() => {
                          setSymbol(stock.symbol);
                          setSearchQuery('');
                        }}
                        className={`text-left p-3 rounded-lg border transition ${
                          symbol === stock.symbol
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-semibold text-sm">{stock.symbol}</div>
                          {stock.type === 'ETF' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-600/20 text-purple-300 rounded">
                              ETF
                            </span>
                          )}
                        </div>
                        <div className="text-xs opacity-70 line-clamp-1">
                          {stock.name}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Can't find stock */}
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full text-sm text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 py-2"
                >
                  <Plus className="h-4 w-4" />
                  Enter custom symbol
                </button>
              </>
            ) : (
              <>
                {/* Custom Symbol Input */}
                <input
                  type="text"
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., TATAMOTORS"
                  className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomSymbol('');
                  }}
                  className="text-sm text-zinc-400 hover:text-white"
                >
                  ← Back to popular stocks
                </button>
              </>
            )}
          </div>

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                step="0.001"
                min="0"
                className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Price per Share *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  ₹
                </span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-black/30 border border-white/10 rounded-2xl pl-8 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Total Amount Display */}
          {totalAmount > 0 && (
            <div className="bg-black/30 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Total Amount</span>
                <span className="text-2xl font-bold text-white font-mono">
                  ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Link to Account Toggle */}
          <div className="flex items-center justify-between p-4 bg-black/30 rounded-2xl border border-white/10">
            <div>
              <label className="text-sm font-medium text-zinc-300">
                Link to Account
              </label>
              <p className="text-xs text-zinc-500 mt-1">
                Track this transaction in your expense accounts
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLinkToAccount(!linkToAccount)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                linkToAccount ? 'bg-blue-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  linkToAccount ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Account Selection - Only show if linking enabled */}
          {linkToAccount && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Account *
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={linkToAccount}
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
              className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/50 rounded-lg p-3 text-rose-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-black/30 border border-white/10 text-white rounded-2xl font-medium hover:bg-black/40 transition active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-6 py-3 rounded-2xl font-medium transition active:scale-[0.98] ${
                type === 'BUY'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                  : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Adding...' : type === 'BUY' ? 'Buy Stock' : 'Sell Stock'}
            </button>
          </div>
        </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
