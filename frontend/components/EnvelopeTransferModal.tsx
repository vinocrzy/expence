'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Repeat2 } from 'lucide-react';
import { budgetService } from '@/lib/localdb-services';
import { events, EVENTS } from '@/lib/events';
import type { EnvelopeState } from '@/lib/db-types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  budgetId: string;
  envelopes: EnvelopeState[];
  /** Pre-select the "from" envelope (optional) */
  defaultFromCategoryId?: string;
}

export default function EnvelopeTransferModal({
  isOpen,
  onClose,
  budgetId,
  envelopes,
  defaultFromCategoryId,
}: Props) {
  const [fromId, setFromId] = useState(defaultFromCategoryId ?? '');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fundedEnvelopes = envelopes.filter((e) => e.allocated > 0);

  const fromEnvelope = fundedEnvelopes.find((e) => e.categoryId === fromId);
  const toEnvelope = fundedEnvelopes.find((e) => e.categoryId === toId);

  const handleSwap = () => {
    const tmp = fromId;
    setFromId(toId);
    setToId(tmp);
  };

  const validate = (): string => {
    if (!fromId) return 'Select a source envelope.';
    if (!toId) return 'Select a destination envelope.';
    if (fromId === toId) return 'Source and destination must be different.';
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return 'Enter a valid positive amount.';
    if (fromEnvelope && amt > fromEnvelope.available) {
      return `Amount exceeds available balance (₹${fromEnvelope.available.toLocaleString()}) in ${fromEnvelope.categoryName}.`;
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');
    try {
      await budgetService.addEnvelopeTransfer(budgetId, {
        fromCategoryId: fromId,
        toCategoryId: toId,
        amount: parseFloat(amount),
        date: new Date().toISOString(),
        note: note.trim() || undefined,
      });
      events.emit(EVENTS.BUDGETS_CHANGED);
      // reset & close
      setFromId(defaultFromCategoryId ?? '');
      setToId('');
      setAmount('');
      setNote('');
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save transfer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#1c1c1e] rounded-t-3xl border-t border-white/10 p-6 pb-10 shadow-2xl max-w-lg mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Repeat2 className="h-5 w-5 text-blue-400" />
                Move Funds
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* From / Swap / To */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">From envelope</label>
                  <select
                    value={fromId}
                    onChange={(e) => setFromId(e.target.value)}
                    className="w-full bg-[#2c2c2e] border border-white/10 rounded-xl p-3 text-sm appearance-none"
                  >
                    <option value="">Select…</option>
                    {fundedEnvelopes.map((e) => (
                      <option key={e.categoryId} value={e.categoryId}>
                        {e.categoryName} (₹{e.available.toLocaleString()} avail.)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSwap}
                  className="mb-0.5 p-3 bg-[#2c2c2e] hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">To envelope</label>
                  <select
                    value={toId}
                    onChange={(e) => setToId(e.target.value)}
                    className="w-full bg-[#2c2c2e] border border-white/10 rounded-xl p-3 text-sm appearance-none"
                  >
                    <option value="">Select…</option>
                    {fundedEnvelopes
                      .filter((e) => e.categoryId !== fromId)
                      .map((e) => (
                        <option key={e.categoryId} value={e.categoryId}>
                          {e.categoryName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#2c2c2e] border border-white/10 rounded-xl p-3 pl-7 font-mono text-right"
                  />
                </div>
                {fromEnvelope && (
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    Max: ₹{fromEnvelope.available.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why are you moving funds?"
                  className="w-full bg-[#2c2c2e] border border-white/10 rounded-xl p-3 text-sm"
                />
              </div>

              {/* Preview */}
              {fromEnvelope && toEnvelope && parseFloat(amount) > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-sm text-blue-200 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 shrink-0" />
                  Moving <strong>₹{parseFloat(amount).toLocaleString()}</strong> from{' '}
                  <strong>{fromEnvelope.categoryName}</strong> → <strong>{toEnvelope.categoryName}</strong>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 text-gray-400 font-bold hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Repeat2 className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Move Funds'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
