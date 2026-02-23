'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Repeat2, RotateCcw, CheckCircle2, AlertTriangle,
  TrendingUp, Package, ChevronDown, ChevronUp, Trash2, History
} from 'lucide-react';
import { budgetService } from '@/lib/localdb-services';
import { calculateEnvelopeState } from '@/lib/budget-engine';
import { events, EVENTS } from '@/lib/events';
import EnvelopeTransferModal from './EnvelopeTransferModal';
import type { Budget, Transaction, Category, EnvelopeState, EnvelopeTransfer } from '@/lib/db-types';

interface Props {
  budget: Budget;
  transactions: Transaction[];
  categories: Category[];
  periodStart: Date;
  periodEnd: Date;
  /** Callback to refresh budget data after mutations */
  onRefresh: () => void;
}

export default function EnvelopeView({
  budget,
  transactions,
  categories,
  periodStart,
  periodEnd,
  onRefresh,
}: Props) {
  const [transferModal, setTransferModal] = useState<{
    open: boolean;
    defaultFromId?: string;
  }>({ open: false });

  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [rollingOver, setRollingOver] = useState(false);
  const [removingTransferId, setRemovingTransferId] = useState<string | null>(null);

  // ── Compute envelope states ─────────────────────────────────────────────
  const envelopes: EnvelopeState[] = useMemo(
    () =>
      calculateEnvelopeState(
        budget,
        transactions,
        categories,
        periodStart,
        periodEnd,
      ),
    [budget, transactions, categories, periodStart, periodEnd],
  );

  const totalAllocated = envelopes.reduce((s, e) => s + e.allocated, 0);
  const totalSpent = envelopes.reduce((s, e) => s + e.spent, 0);
  const totalAvailable = envelopes.reduce((s, e) => s + e.available, 0);
  const overBudgetCount = envelopes.filter((e) => e.isOverBudget).length;

  const transfers: EnvelopeTransfer[] = budget.envelopeTransfers ?? [];

  const catNameById = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  // ── Rollover handler ─────────────────────────────────────────────────────
  const handleApplyRollover = async () => {
    if (!window.confirm('Apply rollover for this period? Each envelope with rollover enabled will carry its remaining balance forward.')) return;
    setRollingOver(true);
    try {
      await budgetService.applyPeriodRollover(budget.id, transactions, categories, periodStart);
      events.emit(EVENTS.BUDGETS_CHANGED);
      onRefresh();
    } catch (e) {
      console.error(e);
      alert('Failed to apply rollover. Please try again.');
    } finally {
      setRollingOver(false);
    }
  };

  // ── Remove transfer ──────────────────────────────────────────────────────
  const handleRemoveTransfer = async (transferId: string) => {
    if (!window.confirm('Remove this transfer?')) return;
    setRemovingTransferId(transferId);
    try {
      await budgetService.removeEnvelopeTransfer(budget.id, transferId);
      events.emit(EVENTS.BUDGETS_CHANGED);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingTransferId(null);
    }
  };

  // ── Availability colour ──────────────────────────────────────────────────
  const availabilityColor = (e: EnvelopeState) => {
    if (e.isOverBudget) return 'text-red-400';
    const pct = e.allocated > 0 ? e.available / (e.allocated + e.rollover) : 1;
    if (pct <= 0.1) return 'text-orange-400';
    return 'text-green-400';
  };

  const progressColor = (e: EnvelopeState) => {
    if (e.isOverBudget) return 'bg-red-500';
    const pct = e.allocated > 0 ? e.spent / (e.allocated + e.rollover + e.netTransfer) : 0;
    if (pct >= 0.9) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1c1c1e] rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-gray-500 mb-1">Total Allocated</p>
          <p className="text-lg font-bold font-mono">₹{totalAllocated.toLocaleString()}</p>
        </div>
        <div className="bg-[#1c1c1e] rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-gray-500 mb-1">Total Spent</p>
          <p className="text-lg font-bold font-mono">₹{totalSpent.toLocaleString()}</p>
        </div>
        <div className={`rounded-2xl p-4 border ${totalAvailable < 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#1c1c1e] border-white/5'}`}>
          <p className="text-xs text-gray-500 mb-1">Available</p>
          <p className={`text-lg font-bold font-mono ${totalAvailable < 0 ? 'text-red-400' : 'text-green-400'}`}>
            ₹{totalAvailable.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {overBudgetCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-300 text-sm"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {overBudgetCount} envelope{overBudgetCount > 1 ? 's are' : ' is'} over budget.
            Consider moving funds to balance them.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setTransferModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-300 hover:bg-blue-600/30 transition-colors text-sm font-medium"
        >
          <Repeat2 className="h-4 w-4" />
          Move Funds
        </button>

        {budget.budgetMode === 'RECURRING' && (
          <button
            onClick={handleApplyRollover}
            disabled={rollingOver}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-300 hover:bg-purple-600/30 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <RotateCcw className={`h-4 w-4 ${rollingOver ? 'animate-spin' : ''}`} />
            {rollingOver ? 'Applying…' : 'Apply Rollover'}
          </button>
        )}
      </div>

      {/* Envelope cards */}
      <div className="space-y-3">
        {envelopes.map((env, idx) => {
          const effectiveAllocated = env.allocated + env.rollover + env.netTransfer;
          const spentPct = effectiveAllocated > 0
            ? Math.min((env.spent / effectiveAllocated) * 100, 100)
            : 0;

          return (
            <motion.div
              key={env.categoryId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`bg-[#1c1c1e] rounded-2xl p-4 border ${
                env.isOverBudget ? 'border-red-500/30' : 'border-white/5'
              }`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{
                      backgroundColor: `${env.categoryColor}20`,
                      color: env.categoryColor,
                    }}
                  >
                    {env.categoryIcon || env.categoryName[0]}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      {env.categoryName}
                      {env.rolloverEnabled && env.rollover > 0 && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30">
                          +₹{env.rollover.toLocaleString()} rollover
                        </span>
                      )}
                      {env.allocated === 0 && (
                        <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                          Unplanned
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Allocated ₹{env.allocated.toLocaleString()}
                      {env.netTransfer !== 0 && (
                        <span className={env.netTransfer > 0 ? ' text-green-400' : ' text-orange-400'}>
                          {' '}{env.netTransfer > 0 ? '+' : ''}₹{env.netTransfer.toLocaleString()} transfer
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-base font-bold font-mono ${availabilityColor(env)}`}>
                    {env.isOverBudget ? '-' : ''}₹{Math.abs(env.available).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {env.isOverBudget ? 'over' : 'available'}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                <motion.div
                  className={`h-full rounded-full ${progressColor(env)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${spentPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>

              {/* Stats row */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>Spent ₹{env.spent.toLocaleString()}</span>
                <span>Budget ₹{effectiveAllocated.toLocaleString()}</span>
              </div>

              {/* Move funds shortcut */}
              {env.allocated > 0 && (
                <button
                  onClick={() => setTransferModal({ open: true, defaultFromId: env.categoryId })}
                  className="mt-3 w-full py-2 text-xs text-gray-400 hover:text-blue-400 border border-white/5 hover:border-blue-500/30 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Repeat2 className="h-3.5 w-3.5" />
                  Move funds from this envelope
                </button>
              )}
            </motion.div>
          );
        })}

        {envelopes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-10 w-10 text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">No envelopes yet</p>
            <p className="text-gray-600 text-sm mt-1">
              Edit the budget and add category allocations to create envelopes.
            </p>
          </div>
        )}
      </div>

      {/* Transfer history */}
      {transfers.length > 0 && (
        <div className="bg-[#1c1c1e] rounded-2xl border border-white/5 overflow-hidden">
          <button
            onClick={() => setShowTransferHistory((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-gray-300">
              <History className="h-4 w-4 text-blue-400" />
              Transfer History ({transfers.length})
            </div>
            {showTransferHistory ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>

          <AnimatePresence>
            {showTransferHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="divide-y divide-white/5 border-t border-white/5">
                  {transfers.map((xfer) => (
                    <div key={xfer.id} className="flex items-center justify-between px-5 py-3 text-sm group">
                      <div className="flex items-center gap-2 min-w-0">
                        <Repeat2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span className="text-gray-300 truncate">
                          {catNameById.get(xfer.fromCategoryId) ?? xfer.fromCategoryId}
                          <span className="text-gray-600 mx-1.5">→</span>
                          {catNameById.get(xfer.toCategoryId) ?? xfer.toCategoryId}
                        </span>
                        {xfer.note && (
                          <span className="text-gray-600 text-xs italic truncate">— {xfer.note}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-white">₹{xfer.amount.toLocaleString()}</span>
                        <button
                          onClick={() => handleRemoveTransfer(xfer.id)}
                          disabled={removingTransferId === xfer.id}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Transfer modal */}
      <EnvelopeTransferModal
        isOpen={transferModal.open}
        onClose={() => setTransferModal({ open: false })}
        budgetId={budget.id}
        envelopes={envelopes}
        defaultFromCategoryId={transferModal.defaultFromId}
      />
    </div>
  );
}
