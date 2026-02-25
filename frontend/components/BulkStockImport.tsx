'use client';

import { useState } from 'react';
import { X, Upload, Download, Plus, Trash2, AlertCircle, Package } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { addStockTransaction } from '../lib/portfolio/repository';
import type { Exchange } from '../lib/portfolio/types';
import { getHouseholdId } from '../lib/localdb-services';

interface BulkStockImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface StockHolding {
  id: string;
  symbol: string;
  quantity: string;
  avgPrice: string;
  date: string;
  notes: string;
}

function newHolding(): StockHolding {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    symbol: '',
    quantity: '',
    avgPrice: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  };
}

export default function BulkStockImport({ isOpen, onClose, onSuccess }: BulkStockImportProps) {
  const [holdings, setHoldings] = useState<StockHolding[]>([newHolding()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addRow = () => setHoldings((h) => [...h, newHolding()]);

  const removeRow = (id: string) => {
    if (holdings.length > 1) setHoldings((h) => h.filter((x) => x.id !== id));
  };

  const update = (id: string, field: keyof StockHolding, value: string) =>
    setHoldings((h) => h.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  const validCount = holdings.filter((h) => h.symbol && h.quantity && h.avgPrice).length;

  const handleImport = async () => {
    setError('');
    setLoading(true);
    try {
      const householdId = await getHouseholdId();
      let successCount = 0;
      for (const holding of holdings) {
        if (!holding.symbol || !holding.quantity || !holding.avgPrice) continue;
        const qty = parseFloat(holding.quantity);
        const price = parseFloat(holding.avgPrice);
        if (isNaN(qty) || qty <= 0) throw new Error(`Invalid quantity for ${holding.symbol}`);
        if (isNaN(price) || price <= 0) throw new Error(`Invalid price for ${holding.symbol}`);
        await addStockTransaction({
          type: 'BUY',
          symbol: holding.symbol.toUpperCase(),
          exchange: 'NSE' as Exchange,
          quantity: qty,
          price,
          date: holding.date,
          householdId,
          notes: holding.notes || 'Portfolio import',
        });
        successCount++;
      }
      if (successCount === 0) throw new Error('No valid holdings to import');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import holdings');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `Symbol,Quantity,Average Price,Date,Notes
RELIANCE,10,2450.50,2024-01-15,Existing holding
TCS,5,3680.00,2024-02-01,Existing holding`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'stock_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} />

          {/* Sheet */}
          <motion.div
            className="relative bg-[#1c1c1e]/98 backdrop-blur-2xl w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl max-h-[94vh] flex flex-col shadow-2xl border border-white/8 overflow-hidden"
            initial={{ y: 56, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 64, opacity: 0, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.85 }}>

            {/* Drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1 w-10 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="shrink-0 border-b border-white/5 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Import Portfolio</h2>
                  <p className="text-xs text-zinc-500">Add existing holdings in bulk</p>
                </div>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-white p-2 hover:bg-white/8 border border-white/5 rounded-xl transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
              <div className="p-5 space-y-4">

                {/* Info card */}
                <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-200 space-y-1">
                      <p className="font-semibold text-blue-300">How to use</p>
                      <ul className="list-disc list-inside space-y-0.5 text-blue-300/80 text-xs">
                        <li>Enter each stock holding using the average purchase price</li>
                        <li>Set the date to when you first acquired the stock</li>
                        <li>All entries are imported as BUY transactions</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Template download */}
                <button onClick={downloadTemplate}
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition">
                  <Download className="h-4 w-4" />
                  Download CSV template
                </button>

                {/* Error */}
                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-rose-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Holding cards */}
                <div className="space-y-3">
                  {holdings.map((holding, idx) => (
                    <div key={holding.id} className="bg-black/25 border border-white/8 rounded-2xl p-4 space-y-3">
                      {/* Card header: index + symbol + delete */}
                      <div className="flex items-center gap-3">
                        <span className="shrink-0 h-6 w-6 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={holding.symbol}
                          onChange={(e) => update(holding.id, 'symbol', e.target.value.toUpperCase())}
                          placeholder="Symbol  e.g. RELIANCE"
                          className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono font-semibold placeholder-zinc-600 placeholder:font-sans placeholder:font-normal text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button type="button" onClick={() => removeRow(holding.id)}
                          disabled={holdings.length === 1}
                          className="shrink-0 p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-25 disabled:cursor-not-allowed transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Qty + Avg Price + Date */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-xs text-zinc-500 font-medium block mb-1">Quantity *</label>
                          <input type="number" value={holding.quantity}
                            onChange={(e) => update(holding.id, 'quantity', e.target.value)}
                            placeholder="10" step="0.01"
                            className="w-full bg-black/30 border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 font-medium block mb-1">Avg Price *</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
                            <input type="number" value={holding.avgPrice}
                              onChange={(e) => update(holding.id, 'avgPrice', e.target.value)}
                              placeholder="2450" step="0.01"
                              className="w-full bg-black/30 border border-white/8 rounded-xl pl-7 pr-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>
                      </div>

                      {/* Date */}
                      <div>
                        <label className="text-xs text-zinc-500 font-medium block mb-1">Purchase Date *</label>
                        <input type="date" value={holding.date}
                          onChange={(e) => update(holding.id, 'date', e.target.value)}
                          className="w-full box-border bg-black/30 border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                          style={{ colorScheme: 'dark' }} />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-xs text-zinc-500 font-medium block mb-1">Notes (optional)</label>
                        <input type="text" value={holding.notes}
                          onChange={(e) => update(holding.id, 'notes', e.target.value)}
                          placeholder="e.g. Existing holding from 2023"
                          className="w-full bg-black/30 border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add row */}
                <button type="button" onClick={addRow}
                  className="w-full py-3.5 border-2 border-dashed border-white/10 rounded-2xl text-zinc-400 hover:text-blue-400 hover:border-blue-500/30 transition flex items-center justify-center gap-2 text-sm font-medium">
                  <Plus className="h-4 w-4" />
                  Add Another Stock
                </button>

                {/* spacer for sticky bar */}
                <div className="h-4" />
              </div>
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 border-t border-white/5 bg-[#1c1c1e]/98 backdrop-blur-xl px-5 py-4 flex gap-3">
              <button type="button" onClick={onClose} disabled={loading}
                className="flex-1 py-3.5 bg-black/30 border border-white/10 text-zinc-300 rounded-2xl font-semibold transition active:scale-[0.98] hover:bg-white/5 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleImport} disabled={loading || validCount === 0}
                className="flex-1 py-3.5 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl font-semibold transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importing…</>
                ) : (
                  <><Package className="h-4 w-4" />Import {validCount > 0 ? `${validCount} ` : ''}Holding{validCount !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
