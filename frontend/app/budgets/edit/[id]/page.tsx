'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import NativeHeader from '@/components/dashboard/NativeHeader';
import { useRouter, useParams } from 'next/navigation';
import { useCategories } from '@/hooks/useLocalData';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, Layers, RotateCcw, Loader2,
    RefreshCw, Flag, CheckCircle2, X, Calendar, ChevronRight,
} from 'lucide-react';
import { BudgetCategoryLimit, EnvelopeConfig } from '@/lib/db-types';
import { budgetService } from '@/lib/localdb-services';

export default function EditBudgetPage() {
    const router = useRouter();
    const { id } = useParams();
    const { categories, loading: catsLoading } = useCategories();

    const [name, setName] = useState('');
    const [budgetMode, setBudgetMode] = useState<'RECURRING' | 'EVENT'>('RECURRING');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categoryRows, setCategoryRows] = useState<
        { tempId: string; categoryId: string; amount: string; activeUntil?: string; subCategoryLimits?: { subCategoryId: string; amount: string }[] }[]
    >([]);

    const [envelopeEnabled, setEnvelopeEnabled] = useState(false);
    const [rolloverMap, setRolloverMap] = useState<Record<string, boolean>>({});
    const [expandedSubLimits, setExpandedSubLimits] = useState<Set<string>>(new Set());

    const totalBudget = categoryRows.reduce(
        (sum, row) => sum + (Number(row.amount) || 0),
        0,
    );

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const expenseCategories = categories.filter((c: any) => c.type === 'EXPENSE');

    useEffect(() => {
        if (!id) return;
        async function loadBudget() {
            try {
                const b = await budgetService.getById(id as string);
                if (!b) throw new Error('Budget not found');

                setName(b.name);
                setBudgetMode((b.budgetMode as 'RECURRING' | 'EVENT') || 'RECURRING');
                if (b.startDate)
                    setStartDate(new Date(b.startDate).toISOString().substring(0, 10));
                if (b.endDate)
                    setEndDate(new Date(b.endDate).toISOString().substring(0, 10));

                if (b.budgetLimitConfig) {
                    setCategoryRows(
                        b.budgetLimitConfig.map(c => ({
                            tempId: Math.random().toString(),
                            categoryId: c.categoryId,
                            amount: c.amount.toString(),
                            activeUntil: c.activeUntil ?? '',
                            subCategoryLimits: c.subCategoryLimits
                                ? c.subCategoryLimits.map(s => ({ subCategoryId: s.subCategoryId, amount: s.amount.toString() }))
                                : [],
                        })),
                    );
                }

                if (b.budgetStrategy === 'ENVELOPE') {
                    setEnvelopeEnabled(true);
                    if (b.envelopeConfig) {
                        const map: Record<string, boolean> = {};
                        b.envelopeConfig.forEach(ec => {
                            map[ec.categoryId] = ec.rolloverEnabled ?? false;
                        });
                        setRolloverMap(map);
                    }
                }
            } catch (e) {
                console.error(e);
                router.push('/budgets');
            } finally {
                setLoading(false);
            }
        }
        loadBudget();
    }, [id, router]);

    const addCategoryRow = () =>
        setCategoryRows([
            ...categoryRows,
            { tempId: Math.random().toString(), categoryId: '', amount: '', activeUntil: '', subCategoryLimits: [] },
        ]);

    const updateRow = (index: number, field: 'categoryId' | 'amount' | 'activeUntil', value: string) => {
        const newRows = [...categoryRows];
        newRows[index] = { ...newRows[index], [field]: value };
        setCategoryRows(newRows);
    };

    const removeRow = (index: number) =>
        setCategoryRows(categoryRows.filter((_, i) => i !== index));

    const toggleSubLimits = (tempId: string) =>
        setExpandedSubLimits(prev => {
            const next = new Set(prev);
            if (next.has(tempId)) next.delete(tempId); else next.add(tempId);
            return next;
        });

    const handleSetSubLimitEdit = (catIndex: number, subCategoryId: string, amount: string) => {
        const newRows = [...categoryRows];
        const existing = newRows[catIndex].subCategoryLimits || [];
        const idx = existing.findIndex(s => s.subCategoryId === subCategoryId);
        const newSub = idx >= 0
            ? existing.map((s, i) => i === idx ? { subCategoryId, amount } : s)
            : [...existing, { subCategoryId, amount }];
        newRows[catIndex] = { ...newRows[catIndex], subCategoryLimits: newSub };
        setCategoryRows(newRows);
    };

    const handleRemoveSubLimitEdit = (catIndex: number, subCategoryId: string) => {
        const newRows = [...categoryRows];
        const existing = newRows[catIndex].subCategoryLimits || [];
        newRows[catIndex] = { ...newRows[catIndex], subCategoryLimits: existing.filter(s => s.subCategoryId !== subCategoryId) };
        setCategoryRows(newRows);
    };

    const toggleRollover = (categoryId: string) =>
        setRolloverMap(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));

    const handleSave = async () => {
        if (!name.trim()) return alert('Please enter a budget name');
        if (categoryRows.length === 0)
            return alert('Please add at least one category');

        setSaving(true);
        try {
            const config: BudgetCategoryLimit[] = categoryRows.map(row => ({
                categoryId: row.categoryId,
                amount: Number(row.amount),
                ...(row.activeUntil ? { activeUntil: row.activeUntil } : {}),
                ...(row.subCategoryLimits && row.subCategoryLimits.length > 0
                    ? { subCategoryLimits: row.subCategoryLimits
                            .filter(s => Number(s.amount) > 0)
                            .map(s => ({ subCategoryId: s.subCategoryId, amount: Number(s.amount) })) }
                    : {}),
            }));

            const envelopeConfig: EnvelopeConfig[] | undefined = envelopeEnabled
                ? config.map(c => ({
                      categoryId: c.categoryId,
                      allocated: c.amount,
                      rolloverEnabled: rolloverMap[c.categoryId] ?? false,
                      rolloverAmount: undefined,
                  }))
                : undefined;

            await budgetService.update(id as string, {
                name: name.trim(),
                totalBudget,
                status: 'ACTIVE',
                budgetMode: budgetMode as 'RECURRING' | 'EVENT' | 'CATEGORY',
                startDate:
                    budgetMode === 'EVENT' && startDate
                        ? new Date(startDate).toISOString()
                        : undefined,
                endDate:
                    budgetMode === 'EVENT' && endDate
                        ? new Date(endDate).toISOString()
                        : undefined,
                budgetLimitConfig: config,
                budgetStrategy: envelopeEnabled ? 'ENVELOPE' : 'STANDARD',
                envelopeConfig,
            });

            router.push(`/budgets/${id}`);
        } catch (e) {
            console.error(e);
            alert('Failed to update budget');
        } finally {
            setSaving(false);
        }
    };

    if (loading || catsLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-36">
            <Navbar />

            <main className="max-w-2xl mx-auto px-4 pt-0 md:pt-8 pb-8">
                <NativeHeader title="Edit Budget" backUrl={`/budgets/${id}`} />

                <div className="space-y-6">

                    {/* ── Section 1: Details ─────────────────────────────────── */}
                    <div>
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                            Details
                        </h2>
                        <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-gray-800">
                            <div className="flex items-center px-4 py-3.5">
                                <span className="text-sm font-medium text-gray-400 w-20 shrink-0">Name</span>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Monthly Essentials"
                                    className="flex-1 bg-transparent text-right text-white placeholder-gray-600 focus:outline-none text-sm"
                                />
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

                    {/* ── Section 3: Category Limits ──────────────────────────── */}
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
                                {categoryRows.map((row, index) => {
                                    const selectedCat = categories.find(
                                        (c: any) => c.id === row.categoryId,
                                    ) as any;
                                    return (
                                        <motion.div
                                            key={row.tempId}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="border-b border-gray-800 last:border-b-0"
                                        >
                                            <div className="flex items-center gap-3 px-4 py-3.5">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-base">
                                                    {selectedCat?.icon || '📂'}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <select
                                                        value={row.categoryId}
                                                        onChange={e =>
                                                            updateRow(index, 'categoryId', e.target.value)
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
                                                            value={row.amount}
                                                            onChange={e =>
                                                                updateRow(index, 'amount', e.target.value)
                                                            }
                                                            placeholder="Budget limit"
                                                            className="flex-1 bg-transparent text-gray-400 text-xs font-mono focus:outline-none placeholder-gray-700"
                                                        />
                                                    </div>
                                                    {/* ── One-time / expiry control ───────────────── */}
                                                    <div className="flex items-center gap-1 mt-1.5">
                                                        <Calendar className="w-3 h-3 text-gray-700 shrink-0" />
                                                        <input
                                                            type="month"
                                                            value={row.activeUntil || ''}
                                                            onChange={e =>
                                                                updateRow(index, 'activeUntil', e.target.value)
                                                            }
                                                            title="Last month this category is active (leave blank for permanent)"
                                                            className="flex-1 bg-transparent text-xs font-mono focus:outline-none focus:text-amber-400 transition-colors placeholder-gray-800 min-w-0"
                                                            style={{ colorScheme: 'dark' }}
                                                        />
                                                        {row.activeUntil ? (
                                                            <span className="text-[10px] text-amber-500/80 font-medium whitespace-nowrap">expires</span>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-700 whitespace-nowrap">recurring</span>
                                                        )}
                                                        {row.activeUntil && (
                                                            <button
                                                                type="button"
                                                                onClick={() => updateRow(index, 'activeUntil', '')}
                                                                className="text-gray-700 hover:text-gray-400 transition-colors shrink-0"
                                                                title="Clear expiry — make permanent"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {categoryRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRow(index)}
                                                        className="p-2 text-gray-700 hover:text-red-400 transition-colors shrink-0 active:scale-90"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* ── Sub-category limits (optional) ─────────── */}
                                            {selectedCat?.subCategories && selectedCat.subCategories.length > 0 && (
                                                <div className="px-4 pb-3 border-t border-white/5">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSubLimits(row.tempId)}
                                                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-300 transition-colors py-2"
                                                    >
                                                        <ChevronRight className={`w-3 h-3 transition-transform duration-150 ${expandedSubLimits.has(row.tempId) ? 'rotate-90' : ''}`} />
                                                        Sub-category limits
                                                        {row.subCategoryLimits && row.subCategoryLimits.filter(s => Number(s.amount) > 0).length > 0 && (
                                                            <span className="ml-1 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold">
                                                                {row.subCategoryLimits.filter(s => Number(s.amount) > 0).length}
                                                            </span>
                                                        )}
                                                    </button>
                                                    <AnimatePresence>
                                                        {expandedSubLimits.has(row.tempId) && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="space-y-2 pl-3 border-l border-white/10"
                                                            >
                                                                {selectedCat.subCategories.map((sub: { id: string; name: string }) => {
                                                                    const subLimit = row.subCategoryLimits?.find(s => s.subCategoryId === sub.id);
                                                                    return (
                                                                        <div key={sub.id} className="flex items-center gap-2 py-0.5">
                                                                            <span className="text-xs text-gray-400 flex-1 truncate">{sub.name}</span>
                                                                            <span className="text-gray-700 text-[10px]">₹</span>
                                                                            <input
                                                                                type="number"
                                                                                inputMode="numeric"
                                                                                value={subLimit?.amount || ''}
                                                                                onChange={e => handleSetSubLimitEdit(index, sub.id, e.target.value)}
                                                                                placeholder="No limit"
                                                                                className="w-24 bg-transparent text-gray-300 text-xs font-mono focus:outline-none placeholder-gray-700 text-right"
                                                                            />
                                                                            {subLimit && Number(subLimit.amount) > 0 && (
                                                                                <button type="button" onClick={() => handleRemoveSubLimitEdit(index, sub.id)} className="text-gray-700 hover:text-red-400 transition-colors shrink-0">
                                                                                    <X className="w-3 h-3" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        <button
                            type="button"
                            onClick={addCategoryRow}
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
                                        {categoryRows.map(row => {
                                            if (!row.categoryId) return null;
                                            const cat = categories.find(
                                                (c: any) => c.id === row.categoryId,
                                            ) as any;
                                            const hasRollover =
                                                rolloverMap[row.categoryId] ?? false;
                                            return (
                                                <div
                                                    key={row.tempId}
                                                    className="flex items-center justify-between px-4 py-3 border-t border-gray-800"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">{cat?.icon}</span>
                                                        <span className="text-sm text-gray-300">
                                                            {cat?.name ?? row.categoryId}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <RotateCcw
                                                            className={`w-3.5 h-3.5 ${hasRollover ? 'text-purple-400' : 'text-gray-700'}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleRollover(row.categoryId)
                                                            }
                                                            className={`relative w-10 h-5 rounded-full transition-colors ${
                                                                hasRollover
                                                                    ? 'bg-purple-600'
                                                                    : 'bg-gray-700'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                                                    hasRollover
                                                                        ? 'translate-x-5'
                                                                        : 'translate-x-0'
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
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-[2] py-3.5 rounded-xl bg-white text-black font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
