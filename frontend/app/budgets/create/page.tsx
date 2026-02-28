'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import NativeHeader from '@/components/dashboard/NativeHeader';
import { useRouter } from 'next/navigation';
import { useCategories, useBudgets } from '@/hooks/useLocalData';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, Layers, RotateCcw,
    RefreshCw, Flag, ChevronDown, CheckCircle2,
} from 'lucide-react';
import { BudgetCategoryLimit, EnvelopeConfig } from '@/lib/db-types';

export default function CreateBudgetPage() {
    const router = useRouter();
    const { categories } = useCategories();
    const { addBudget } = useBudgets();

    const [name, setName] = useState('');
    const [budgetMode, setBudgetMode] = useState<'RECURRING' | 'EVENT'>('RECURRING');
    const [status, setStatus] = useState<'ACTIVE' | 'PLANNING'>('ACTIVE');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [saving, setSaving] = useState(false);

    const [categoryLimits, setCategoryLimits] = useState<BudgetCategoryLimit[]>([
        { categoryId: '', amount: 0 },
    ]);

    const [envelopeEnabled, setEnvelopeEnabled] = useState(false);
    const [rolloverMap, setRolloverMap] = useState<Record<number, boolean>>({});

    const totalBudget = categoryLimits.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0,
    );

    const expenseCategories = categories.filter((c: any) => c.type === 'EXPENSE');

    const handleAddRow = () =>
        setCategoryLimits([...categoryLimits, { categoryId: '', amount: 0 }]);

    const handleRemoveRow = (index: number) => {
        const newLimits = [...categoryLimits];
        newLimits.splice(index, 1);
        setCategoryLimits(newLimits);
        const newMap: Record<number, boolean> = {};
        Object.entries(rolloverMap).forEach(([k, v]) => {
            const ki = Number(k);
            if (ki < index) newMap[ki] = v;
            else if (ki > index) newMap[ki - 1] = v;
        });
        setRolloverMap(newMap);
    };

    const handleUpdateRow = (
        index: number,
        field: keyof BudgetCategoryLimit,
        value: any,
    ) => {
        const newLimits = [...categoryLimits];
        newLimits[index] = { ...newLimits[index], [field]: value };
        setCategoryLimits(newLimits);
    };

    const toggleRollover = (index: number) =>
        setRolloverMap(prev => ({ ...prev, [index]: !prev[index] }));

    const handleSubmit = async () => {
        if (!name.trim()) return alert('Please enter a budget name');
        const validLimits = categoryLimits.filter(l => l.categoryId && l.amount > 0);
        if (validLimits.length === 0)
            return alert('Please add at least one category with a valid amount');

        const envelopeConfig: EnvelopeConfig[] | undefined = envelopeEnabled
            ? validLimits.map((l) => {
                  const origIdx = categoryLimits.findIndex(
                      cl => cl.categoryId === l.categoryId,
                  );
                  return {
                      categoryId: l.categoryId,
                      allocated: l.amount,
                      rolloverEnabled: rolloverMap[origIdx] ?? false,
                      rolloverAmount: 0,
                  };
              })
            : undefined;

        setSaving(true);
        try {
            await addBudget({
                name: name.trim(),
                budgetMode,
                status,
                startDate: budgetMode === 'EVENT' ? startDate : undefined,
                endDate: budgetMode === 'EVENT' ? endDate : undefined,
                budgetLimitConfig: validLimits,
                totalBudget,
                totalSpent: 0,
                budgetStrategy: envelopeEnabled ? 'ENVELOPE' : 'STANDARD',
                envelopeConfig,
            });
            router.push('/budgets');
        } catch (error) {
            console.error(error);
            alert('Failed to create budget');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-36">
            <Navbar />

            <main className="max-w-2xl mx-auto px-4 pt-0 md:pt-8 pb-8">
                <NativeHeader title="New Budget" backUrl="/budgets" />

                <div className="space-y-6">

                    {/* ── Section 1: Details ─────────────────────────────────── */}
                    <div>
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                            Details
                        </h2>
                        <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-gray-800">
                            {/* Name */}
                            <div className="flex items-center px-4 py-3.5">
                                <span className="text-sm font-medium text-gray-400 w-20 shrink-0">Name</span>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Monthly Expenses"
                                    className="flex-1 bg-transparent text-right text-white placeholder-gray-600 focus:outline-none text-sm"
                                />
                            </div>

                            {/* Status */}
                            <div className="flex items-center px-4 py-3.5">
                                <span className="text-sm font-medium text-gray-400 w-20 shrink-0">Status</span>
                                <div className="flex-1 flex justify-end gap-2">
                                    {(['ACTIVE', 'PLANNING'] as const).map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setStatus(s)}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                                                status === s
                                                    ? 'bg-white text-black border-white'
                                                    : 'bg-transparent text-gray-500 border-gray-700'
                                            }`}
                                        >
                                            {s === 'ACTIVE' ? 'Active' : 'Draft'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Section 2: Budget Type ──────────────────────────────── */}
                    <div>
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                            Budget Type
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setBudgetMode('RECURRING')}
                                className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border transition-all active:scale-[0.97] ${
                                    budgetMode === 'RECURRING'
                                        ? 'bg-blue-500/15 border-blue-500/60 text-white'
                                        : 'bg-[#1c1c1e] border-white/5 text-gray-400'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    budgetMode === 'RECURRING' ? 'bg-blue-500/20' : 'bg-white/5'
                                }`}>
                                    <RefreshCw className={`w-5 h-5 ${budgetMode === 'RECURRING' ? 'text-blue-400' : 'text-gray-500'}`} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold">Recurring</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Resets monthly</p>
                                </div>
                                {budgetMode === 'RECURRING' && (
                                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setBudgetMode('EVENT')}
                                className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border transition-all active:scale-[0.97] ${
                                    budgetMode === 'EVENT'
                                        ? 'bg-purple-500/15 border-purple-500/60 text-white'
                                        : 'bg-[#1c1c1e] border-white/5 text-gray-400'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    budgetMode === 'EVENT' ? 'bg-purple-500/20' : 'bg-white/5'
                                }`}>
                                    <Flag className={`w-5 h-5 ${budgetMode === 'EVENT' ? 'text-purple-400' : 'text-gray-500'}`} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold">One-time Event</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Fixed date range</p>
                                </div>
                                {budgetMode === 'EVENT' && (
                                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                                )}
                            </button>
                        </div>

                        {/* Event Dates */}
                        <AnimatePresence>
                            {budgetMode === 'EVENT' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-gray-800"
                                >
                                    <div className="flex items-center px-4 py-3.5">
                                        <span className="text-sm font-medium text-gray-400 w-28 shrink-0">Start Date</span>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="flex-1 bg-transparent text-right text-white focus:outline-none text-sm"
                                        />
                                    </div>
                                    <div className="flex items-center px-4 py-3.5">
                                        <span className="text-sm font-medium text-gray-400 w-28 shrink-0">End Date</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="flex-1 bg-transparent text-right text-white focus:outline-none text-sm"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── Section 3: Category Allocation ─────────────────────── */}
                    <div>
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Category Limits
                            </h2>
                            {totalBudget > 0 && (
                                <span className="text-xs font-mono font-bold text-green-400">
                                    ₹{totalBudget.toLocaleString('en-IN')} total
                                </span>
                            )}
                        </div>

                        <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden">
                            <AnimatePresence initial={false}>
                                {categoryLimits.map((limit, index) => {
                                    const selectedCat = categories.find(
                                        (c: any) => c.id === limit.categoryId,
                                    ) as any;
                                    return (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="border-b border-gray-800 last:border-b-0"
                                        >
                                            {/* Row: icon + select + amount */}
                                            <div className="flex items-center gap-3 px-4 py-3.5">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-base">
                                                    {selectedCat?.icon || '📂'}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <select
                                                        value={limit.categoryId}
                                                        onChange={e =>
                                                            handleUpdateRow(index, 'categoryId', e.target.value)
                                                        }
                                                        className="w-full bg-transparent text-white text-sm focus:outline-none appearance-none truncate"
                                                    >
                                                        <option value="" className="bg-[#1c1c1e]">
                                                            Select category…
                                                        </option>
                                                        {expenseCategories.map((c: any) => (
                                                            <option
                                                                key={c.id}
                                                                value={c.id}
                                                                className="bg-[#1c1c1e]"
                                                            >
                                                                {c.icon} {c.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="flex items-center mt-1">
                                                        <span className="text-gray-600 text-xs mr-1">₹</span>
                                                        <input
                                                            type="number"
                                                            inputMode="numeric"
                                                            value={limit.amount || ''}
                                                            onChange={e =>
                                                                handleUpdateRow(
                                                                    index,
                                                                    'amount',
                                                                    parseFloat(e.target.value) || 0,
                                                                )
                                                            }
                                                            placeholder="Budget limit"
                                                            className="flex-1 bg-transparent text-gray-400 text-xs font-mono focus:outline-none placeholder-gray-700"
                                                        />
                                                    </div>
                                                </div>

                                                {categoryLimits.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveRow(index)}
                                                        className="p-2 text-gray-700 hover:text-red-400 transition-colors shrink-0 active:scale-90"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="mt-3 w-full py-3 border border-dashed border-white/10 rounded-2xl text-gray-500 hover:text-gray-300 hover:border-white/20 flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4" />
                            Add Category
                        </button>
                    </div>

                    {/* ── Section 4: Envelope Strategy ───────────────────────── */}
                    <div>
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                            Advanced
                        </h2>
                        <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                        <Layers className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Envelope Strategy</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Per-category spending envelopes
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEnvelopeEnabled(v => !v)}
                                    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                                        envelopeEnabled ? 'bg-purple-600' : 'bg-gray-700'
                                    }`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                            envelopeEnabled ? 'translate-x-6' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            <AnimatePresence>
                                {envelopeEnabled && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="border-t border-gray-800"
                                    >
                                        <div className="px-4 py-2.5">
                                            <p className="text-xs text-purple-300/70">
                                                Enable rollover per envelope to carry unused funds forward.
                                            </p>
                                        </div>
                                        {categoryLimits.map((limit, index) => {
                                            if (!limit.categoryId) return null;
                                            const cat = categories.find(
                                                (c: any) => c.id === limit.categoryId,
                                            ) as any;
                                            const hasRollover = rolloverMap[index] ?? false;
                                            return (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between px-4 py-3 border-t border-gray-800"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">{cat?.icon}</span>
                                                        <span className="text-sm text-gray-300">
                                                            {cat?.name ?? `Category ${index + 1}`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <RotateCcw
                                                            className={`w-3.5 h-3.5 ${hasRollover ? 'text-purple-400' : 'text-gray-700'}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleRollover(index)}
                                                            className={`relative w-10 h-5 rounded-full transition-colors ${
                                                                hasRollover ? 'bg-purple-600' : 'bg-gray-700'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                                                    hasRollover ? 'translate-x-5' : 'translate-x-0'
                                                                }`}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Fixed bottom CTA ───────────────────────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-xl border-t border-white/5 px-4 pt-3 pb-8 md:pb-4">
                <div className="max-w-2xl mx-auto flex gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm active:scale-[0.98] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex-[2] py-3.5 rounded-xl bg-white text-black font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            'Create Budget'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
