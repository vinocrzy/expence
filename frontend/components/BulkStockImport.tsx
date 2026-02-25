'use client';

import { useState } from 'react';
import { X, Upload, Download, Plus, Trash2, AlertCircle } from 'lucide-react';
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

export default function BulkStockImport({
  isOpen,
  onClose,
  onSuccess,
}: BulkStockImportProps) {
  const [holdings, setHoldings] = useState<StockHolding[]>([
    {
      id: '1',
      symbol: '',
      quantity: '',
      avgPrice: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addRow = () => {
    setHoldings([
      ...holdings,
      {
        id: Date.now().toString(),
        symbol: '',
        quantity: '',
        avgPrice: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (holdings.length > 1) {
      setHoldings(holdings.filter((h) => h.id !== id));
    }
  };

  const updateHolding = (id: string, field: keyof StockHolding, value: string) => {
    setHoldings(
      holdings.map((h) => (h.id === id ? { ...h, [field]: value } : h))
    );
  };

  const handleImport = async () => {
    setError('');
    setLoading(true);

    try {
      const householdId = await getHouseholdId();
      let successCount = 0;

      for (const holding of holdings) {
        // Skip empty rows
        if (!holding.symbol || !holding.quantity || !holding.avgPrice) {
          continue;
        }

        const qty = parseFloat(holding.quantity);
        const price = parseFloat(holding.avgPrice);

        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Invalid quantity for ${holding.symbol}`);
        }

        if (isNaN(price) || price <= 0) {
          throw new Error(`Invalid price for ${holding.symbol}`);
        }

        await addStockTransaction({
          type: 'BUY',
          symbol: holding.symbol.toUpperCase(),
          exchange: 'NSE' as Exchange,
          quantity: qty,
          price: price,
          date: holding.date,
          householdId,
          notes: holding.notes || `Initial portfolio import`,
        });

        successCount++;
      }

      if (successCount === 0) {
        throw new Error('No valid holdings to import');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import holdings');
      console.error('Bulk import error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `Symbol,Quantity,Average Price,Date,Notes
RELIANCE,10,2450.50,2024-01-15,Existing holding
TCS,5,3680.00,2024-02-01,Existing holding`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
            className="relative bg-[#1c1c1e]/95 backdrop-blur-xl w-full sm:max-w-4xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto shadow-2xl border border-white/5 pb-safe"
            initial={{ y: 52, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.88 }}
          >
        {/* Header */}
        <div className="sticky top-0 bg-[#1c1c1e]/95 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Upload className="h-6 w-6 text-blue-400" />
              Import Existing Portfolio
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Add your current stock holdings in bulk
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition p-2 hover:bg-black/30 border border-white/10 rounded-xl"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-2xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">How to use:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-300">
                  <li>Enter your existing stock holdings below</li>
                  <li>Use the average purchase price for each holding</li>
                  <li>Set the date to when you first acquired the stock</li>
                  <li>All stocks will be added as BUY transactions</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Download Template */}
          <button
            onClick={downloadTemplate}
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download CSV Template
          </button>

          {/* Error Display */}
          {error && (
            <div className="bg-rose-900/20 border border-rose-700/30 rounded-2xl p-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                <p className="text-sm text-rose-200">{error}</p>
              </div>
            </div>
          )}

          {/* Holdings Table */}
          <div className="border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-black/30 border-b border-white/10">
                    <th className="text-left px-4 py-3 text-sm font-medium text-zinc-300">
                      Symbol *
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-zinc-300">
                      Quantity *
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-zinc-300">
                      Avg Price *
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-zinc-300">
                      Date *
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-zinc-300">
                      Notes
                    </th>
                    <th className="w-12 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding, index) => (
                    <tr
                      key={holding.id}
                      className={`border-b border-zinc-800 ${
                        index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-900/50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={holding.symbol}
                          onChange={(e) =>
                            updateHolding(holding.id, 'symbol', e.target.value.toUpperCase())
                          }
                          placeholder="RELIANCE"
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={holding.quantity}
                          onChange={(e) =>
                            updateHolding(holding.id, 'quantity', e.target.value)
                          }
                          placeholder="10"
                          step="0.01"
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={holding.avgPrice}
                          onChange={(e) =>
                            updateHolding(holding.id, 'avgPrice', e.target.value)
                          }
                          placeholder="2450.50"
                          step="0.01"
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={holding.date}
                          onChange={(e) =>
                            updateHolding(holding.id, 'date', e.target.value)
                          }
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={holding.notes}
                          onChange={(e) =>
                            updateHolding(holding.id, 'notes', e.target.value)
                          }
                          placeholder="Optional notes"
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeRow(holding.id)}
                          disabled={holdings.length === 1}
                          className="text-zinc-400 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Row Button */}
          <button
            type="button"
            onClick={addRow}
            className="w-full py-3 border-2 border-dashed border-white/15 rounded-2xl text-zinc-400 hover:text-white hover:border-white/30 transition flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Another Stock
          </button>

          {/* Action Buttons */}
          <div className="flex gap-3 sticky bottom-0 bg-[#1c1c1e]/95 backdrop-blur-xl pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-black/30 border border-white/10 text-white py-3 rounded-2xl font-medium hover:bg-black/40 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-1 bg-gradient-to-br from-blue-500 to-purple-600 text-white py-3 rounded-2xl font-medium transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Import {holdings.filter((h) => h.symbol && h.quantity && h.avgPrice).length}{' '}
                  Holdings
                </>
              )}
            </button>
          </div>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
