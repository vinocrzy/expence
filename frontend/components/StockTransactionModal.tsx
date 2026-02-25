'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Search,
  CheckCircle2,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { addStockTransaction } from '../lib/portfolio/repository';
import type { TransactionType, Exchange } from '../lib/portfolio/types';
import { getHouseholdId } from '../lib/localdb-services';

interface Account {
  id: string;
  name: string;
  currency: string;
}

interface HoldingLike {
  symbol: string;
  name?: string;
  totalUnits: number;
  type?: 'STOCK' | 'ETF';
}

interface StockTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialType?: TransactionType;
  accounts: Account[];
  holdings?: HoldingLike[];
}

interface StockData {
  symbol: string;
  name: string;
  exchange: string;
  type?: 'STOCK' | 'ETF';
}

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
  { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty BeES', exchange: 'NSE', type: 'ETF' },
  { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', exchange: 'NSE', type: 'ETF' },
];

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-blue-500/30 text-white rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function StockTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'BUY',
  accounts,
  holdings = [],
}: StockTransactionModalProps) {
  const [type, setType] = useState<TransactionType>(initialType);

  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [symbolType, setSymbolType] = useState<'all' | 'STOCK' | 'ETF'>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customSymbol, setCustomSymbol] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const [availableStocks, setAvailableStocks] = useState<StockData[]>(FALLBACK_STOCKS);
  const [loadingStocks, setLoadingStocks] = useState(true);

  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [linkToAccount, setLinkToAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadStocks = async () => {
      try {
        const response = await fetch('/api/portfolio/prices');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (data.quotes && typeof data.quotes === 'object') {
          const symbols: StockData[] = Object.values(data.quotes).map((q: unknown) => {
            const quote = q as { symbol: string; name: string; exchange: string; type: string };
            return { symbol: quote.symbol, name: quote.name, exchange: quote.exchange, type: (quote.type ?? 'STOCK') as 'STOCK' | 'ETF' };
          });
          if (symbols.length > 0) setAvailableStocks(symbols);
        }
      } catch {
        // keep fallback
      } finally {
        setLoadingStocks(false);
      }
    };
    loadStocks();
  }, []);

  useEffect(() => {
    if (linkToAccount && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [linkToAccount, accounts, accountId]);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setSelectedStock(null);
      setSearchQuery('');
      setDropdownOpen(false);
      setCustomMode(false);
      setCustomSymbol('');
      setQuantity('');
      setPrice('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError('');
      setLinkToAccount(false);
      setActiveIndex(0);
    }
  }, [isOpen, initialType]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // For SELL: only show symbols the user currently holds (with units > 0),
  // enriched with name/type from the loaded availableStocks list
  const sellableStocks = holdings
    .filter((h) => h.totalUnits > 0)
    .map((h) => {
      const match = availableStocks.find((s) => s.symbol === h.symbol);
      return {
        symbol: h.symbol,
        name: h.name ?? match?.name ?? h.symbol,
        exchange: 'NSE',
        type: (h.type ?? match?.type ?? 'STOCK') as 'STOCK' | 'ETF',
        totalUnits: h.totalUnits,
      };
    });

  const sourceStocks = type === 'SELL' ? sellableStocks : availableStocks;

  const filteredStocks = sourceStocks
    .filter((s) => {
      if (type === 'BUY' && symbolType !== 'all' && s.type !== symbolType) return false;
      const q = searchQuery.toLowerCase();
      return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    })
    .slice(0, type === 'SELL' ? 50 : 40);

  const displayedDropdown = searchQuery ? filteredStocks : (type === 'SELL' ? filteredStocks : filteredStocks.slice(0, 10));

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!dropdownOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') { setDropdownOpen(true); setActiveIndex(0); }
        return;
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, displayedDropdown.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const item = displayedDropdown[activeIndex];
        if (item) { setSelectedStock(item); setDropdownOpen(false); setSearchQuery(''); }
      } else if (e.key === 'Escape') { setDropdownOpen(false); }
    },
    [dropdownOpen, displayedDropdown, activeIndex]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const finalSymbol = customMode ? customSymbol.trim().toUpperCase() : selectedStock?.symbol;
      if (!finalSymbol) throw new Error('Please select or enter a stock symbol');
      if (linkToAccount && !accountId) throw new Error('Please select an account');
      const qty = parseFloat(quantity);
      const priceValue = parseFloat(price);
      if (isNaN(qty) || qty <= 0) throw new Error('Please enter a valid quantity');
      if (isNaN(priceValue) || priceValue <= 0) throw new Error('Please enter a valid price');
      const householdId = await getHouseholdId();
      await addStockTransaction({ type, symbol: finalSymbol, exchange: 'NSE' as Exchange, quantity: qty, price: priceValue, date, householdId, notes: notes || undefined });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  // Reset selected stock if it's not in holdings when switching to SELL
  useEffect(() => {
    if (type === 'SELL' && selectedStock) {
      const stillHeld = sellableStocks.some((h) => h.symbol === selectedStock.symbol);
      if (!stillHeld) {
        setSelectedStock(null);
        setSearchQuery('');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const totalAmount = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);
  const symbolCount = type === 'SELL'
    ? sellableStocks.length
    : availableStocks.filter(s => symbolType === 'all' || s.type === symbolType).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            className="relative bg-[#1c1c1e]/98 backdrop-blur-2xl w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[94vh] flex flex-col shadow-2xl border border-white/8 overflow-hidden"
            initial={{ y: 56, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 64, opacity: 0, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.85 }}
          >
            {/* Drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1 w-10 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="shrink-0 border-b border-white/5 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-2xl flex items-center justify-center ${type === 'BUY' ? 'bg-emerald-500/15 border border-emerald-500/25' : 'bg-rose-500/15 border border-rose-500/25'}`}>
                  {type === 'BUY' ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-rose-400" />}
                </div>
                <h2 className="text-lg font-bold text-white">{type === 'BUY' ? 'Buy Stock' : 'Sell Stock'}</h2>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-white p-2 hover:bg-white/8 border border-white/5 rounded-xl transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
              <form onSubmit={handleSubmit} className="p-5 space-y-5">

                {/* Buy / Sell Toggle */}
                <div className="flex gap-1.5 p-1 bg-black/30 border border-white/8 rounded-2xl">
                  <button type="button" onClick={() => setType('BUY')}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition active:scale-[0.98] flex items-center justify-center gap-1.5 ${type === 'BUY' ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <TrendingUp className="h-4 w-4" />Buy
                  </button>
                  <button type="button" onClick={() => setType('SELL')}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition active:scale-[0.98] flex items-center justify-center gap-1.5 ${type === 'SELL' ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <TrendingDown className="h-4 w-4" />Sell
                  </button>
                </div>

                {/* Symbol Picker */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-sm font-semibold text-zinc-200">Stock / ETF Symbol *</label>
                    {type === 'BUY' && (
                      <button type="button" onClick={() => { setCustomMode(v => !v); setSelectedStock(null); setSearchQuery(''); setCustomSymbol(''); }}
                        className="text-xs text-blue-400 hover:text-blue-300 transition">
                        {customMode ? '← Search list' : '+ Custom symbol'}
                      </button>
                    )}
                  </div>

                  {customMode ? (
                    <input type="text" value={customSymbol} onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                      placeholder="e.g., TATAMOTORS" autoFocus
                      className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  ) : (
                    <>
                      {/* Type filter — only for BUY mode */}
                      {type === 'BUY' ? (
                        <div className="flex items-center gap-1.5 mb-2.5">
                          {(['all', 'STOCK', 'ETF'] as const).map((t) => (
                            <button key={t} type="button" onClick={() => { setSymbolType(t); setActiveIndex(0); }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${symbolType === t ? 'bg-blue-600 text-white' : 'bg-black/30 border border-white/8 text-zinc-500 hover:text-zinc-300'}`}>
                              {t === 'all' ? 'All' : t === 'STOCK' ? 'Stocks' : 'ETFs'}
                            </button>
                          ))}
                          <span className="ml-auto text-xs text-zinc-600">
                            {loadingStocks ? '…' : `${symbolCount} symbols`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center mb-2.5">
                          <span className="text-xs text-zinc-500">
                            {symbolCount === 0 ? 'No holdings to sell' : `${symbolCount} holding${symbolCount !== 1 ? 's' : ''} available`}
                          </span>
                        </div>
                      )}

                      {/* Selected chip */}
                      {selectedStock ? (
                        <div className={`flex items-center gap-3 p-3 rounded-2xl ${
                          type === 'SELL'
                            ? 'bg-rose-500/10 border border-rose-500/25'
                            : 'bg-emerald-500/10 border border-emerald-500/25'
                        }`}>
                          <CheckCircle2 className={`h-5 w-5 shrink-0 ${type === 'SELL' ? 'text-rose-400' : 'text-emerald-400'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-bold text-sm">{selectedStock.symbol}</span>
                              {selectedStock.type === 'ETF' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/25 rounded-md font-bold">ETF</span>
                              )}
                              {type === 'SELL' && (() => {
                                const h = sellableStocks.find(s => s.symbol === selectedStock.symbol);
                                return h ? (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/15 text-rose-300 border border-rose-500/20 rounded-md font-semibold">
                                    {h.totalUnits.toLocaleString('en-IN', { maximumFractionDigits: 4 })} units
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">{selectedStock.name}</p>
                          </div>
                          <button type="button" onClick={() => { setSelectedStock(null); setSearchQuery(''); setTimeout(() => searchRef.current?.focus(), 50); }}
                            className="p-1.5 rounded-xl hover:bg-white/8 text-zinc-400 hover:text-white transition shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        /* Combobox */
                        <div className="relative" ref={dropdownRef}>
                          <div className="relative">
                            {loadingStocks
                              ? <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 animate-spin" />
                              : <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            }
                            <input ref={searchRef} type="text" value={searchQuery}
                              onChange={(e) => { setSearchQuery(e.target.value); setDropdownOpen(true); setActiveIndex(0); }}
                              onFocus={() => setDropdownOpen(true)}
                              onKeyDown={handleKeyDown}
                              placeholder={loadingStocks ? 'Loading symbols…' : 'Search symbol or company name…'}
                              className="w-full bg-black/30 border border-white/10 rounded-2xl pl-10 pr-9 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 transition ${dropdownOpen ? 'rotate-180' : ''}`} />
                          </div>

                          <AnimatePresence>
                            {dropdownOpen && (
                              <motion.div
                                className="absolute z-50 left-0 right-0 mt-1 bg-[#2c2c2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                transition={{ duration: 0.12 }}>
                                <div className="max-h-52 overflow-y-auto overscroll-contain">
                                  {displayedDropdown.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-sm text-zinc-500">
                                      {searchQuery ? `No results for "${searchQuery}"` : 'No symbols available'}
                                    </div>
                                  ) : (
                                    displayedDropdown.map((stock, idx) => (
                                      <button key={stock.symbol} type="button"
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        onMouseDown={(e) => { e.preventDefault(); setSelectedStock(stock); setDropdownOpen(false); setSearchQuery(''); }}
                                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 border-b border-white/4 last:border-0 transition ${idx === activeIndex ? (type === 'SELL' ? 'bg-rose-600/15' : 'bg-blue-600/20') : 'hover:bg-white/5'}`}>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-white font-bold text-sm leading-snug">
                                              <HighlightMatch text={stock.symbol} query={searchQuery} />
                                            </span>
                                            {stock.type === 'ETF' && (
                                              <span className="text-[9px] px-1 py-0.5 bg-purple-500/20 text-purple-300 rounded-md font-bold tracking-wide shrink-0">ETF</span>
                                            )}
                                            {type === 'SELL' && (() => {
                                              const h = sellableStocks.find(s => s.symbol === stock.symbol);
                                              return h ? (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/15 text-rose-300 border border-rose-500/20 rounded-md font-semibold shrink-0">
                                                  {h.totalUnits.toLocaleString('en-IN', { maximumFractionDigits: 4 })} units
                                                </span>
                                              ) : null;
                                            })()}
                                          </div>
                                          <p className="text-xs text-zinc-400 truncate leading-snug">
                                            <HighlightMatch text={stock.name} query={searchQuery} />
                                          </p>
                                        </div>
                                        {idx === activeIndex && <CheckCircle2 className={`h-4 w-4 shrink-0 ${type === 'SELL' ? 'text-rose-400' : 'text-blue-400'}`} />}
                                      </button>
                                    ))
                                  )}
                                  {!searchQuery && type === 'BUY' && filteredStocks.length > 10 && (
                                    <div className="px-4 py-2 text-xs text-zinc-600 text-center border-t border-white/5">
                                      Type to search all {filteredStocks.length} symbols
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Quantity & Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Quantity *</label>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0" step="0.001" min="0" required
                      className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Price / Share *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">₹</span>
                      <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00" step="0.01" min="0" required
                        className="w-full bg-black/30 border border-white/10 rounded-2xl pl-8 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Total */}
                {totalAmount > 0 && (
                  <div className="flex items-center justify-between bg-black/30 border border-white/8 rounded-2xl px-4 py-3">
                    <span className="text-sm text-zinc-400">Total</span>
                    <span className="text-xl font-bold text-white font-mono">
                      ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Transaction Date *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="w-full box-border bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    style={{ colorScheme: 'dark' }} required />
                </div>

                {/* Link to Account */}
                <div className="flex items-center justify-between p-4 bg-black/25 border border-white/8 rounded-2xl">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Link to Account</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Track in expense accounts</p>
                  </div>
                  <button type="button" onClick={() => setLinkToAccount(!linkToAccount)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${linkToAccount ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${linkToAccount ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {linkToAccount && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Account *</label>
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required={linkToAccount}
                      className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Notes (Optional)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes…" rows={2}
                    className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl px-4 py-3 text-sm text-rose-400">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1 pb-2">
                  <button type="button" onClick={onClose}
                    className="flex-1 py-3.5 bg-black/30 border border-white/10 text-zinc-300 rounded-2xl font-semibold transition active:scale-[0.98] hover:bg-white/5">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading}
                    className={`flex-1 py-3.5 rounded-2xl font-semibold transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${type === 'BUY' ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'}`}>
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Processing…</>
                      : type === 'BUY' ? <><TrendingUp className="h-4 w-4" />Buy Stock</>
                      : <><TrendingDown className="h-4 w-4" />Sell Stock</>}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
