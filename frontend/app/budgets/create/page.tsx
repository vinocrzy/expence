'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { useCategories, useBudgets } from '@/hooks/useLocalData';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, Calendar, Layers, RotateCcw } from 'lucide-react';
import { BudgetCategoryLimit, Budget, Category, EnvelopeConfig } from '@/lib/db-types';

export default function CreateBudgetPage() {
    const router = useRouter();
    const { categories } = useCategories();
    const { addBudget } = useBudgets();

    const [name, setName] = useState('');
    const [budgetMode, setBudgetMode] = useState<'RECURRING' | 'EVENT'>('RECURRING');
    const [status, setStatus] = useState<'ACTIVE' | 'PLANNING'>('ACTIVE');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Dynamic List of Category Limits
    const [categoryLimits, setCategoryLimits] = useState<BudgetCategoryLimit[]>([
        { categoryId: '', amount: 0 }
    ]);

    // Envelope Strategy
    const [envelopeEnabled, setEnvelopeEnabled] = useState(false);
    // keyed by index, value = rolloverEnabled flag
    const [rolloverMap, setRolloverMap] = useState<Record<number, boolean>>({});

    const totalBudget = categoryLimits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const handleAddRow = () => {
        setCategoryLimits([...categoryLimits, { categoryId: '', amount: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        const newLimits = [...categoryLimits];
        newLimits.splice(index, 1);
        setCategoryLimits(newLimits);
        // remove rollover entry and re-index
        const newMap: Record<number, boolean> = {};
        Object.entries(rolloverMap).forEach(([k, v]) => {
            const ki = Number(k);
            if (ki < index) newMap[ki] = v;
            else if (ki > index) newMap[ki - 1] = v;
        });
        setRolloverMap(newMap);
    };

    const handleUpdateRow = (index: number, field: keyof BudgetCategoryLimit, value: any) => {
        const newLimits = [...categoryLimits];
        newLimits[index] = { ...newLimits[index], [field]: value };
        setCategoryLimits(newLimits);
    };

    const toggleRollover = (index: number) => {
        setRolloverMap(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!name) return alert('Please enter a budget name');
        if (categoryLimits.length === 0) return alert('Please add at least one category');
        const validLimits = categoryLimits.filter(l => l.categoryId && l.amount > 0);
        if (validLimits.length === 0) return alert('Please set valid amounts for categories');

        // Build envelopeConfig if strategy is enabled
        const envelopeConfig: EnvelopeConfig[] | undefined = envelopeEnabled
            ? validLimits.map((l, i) => ({
                categoryId: l.categoryId,
                allocated: l.amount,
                rolloverEnabled: rolloverMap[categoryLimits.findIndex(cl => cl.categoryId === l.categoryId)] ?? false,
                rolloverAmount: 0,
              }))
            : undefined;

        try {
            await addBudget({
                name,
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
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans pb-48">
            <Navbar />
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-bold">New Budget Plan</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info Card */}
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                             <Calendar className="h-5 w-5 text-blue-400" />
                             Budget Details
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Budget Name</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    placeholder="e.g. Monthly Expenses, Goa Trip"
                                    className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Type</label>
                                    <select 
                                        value={budgetMode} 
                                        onChange={e => setBudgetMode(e.target.value as any)}
                                        className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl"
                                    >
                                        <option value="RECURRING">Recurring (Monthly)</option>
                                        <option value="EVENT">One-time Event</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Status</label>
                                    <select 
                                        value={status} 
                                        onChange={e => setStatus(e.target.value as any)}
                                        className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl"
                                    >
                                        <option value="ACTIVE">Active (Live)</option>
                                        <option value="PLANNING">Draft (Planning)</option>
                                    </select>
                                </div>
                            </div>

                            {budgetMode === 'EVENT' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                                        <input 
                                            type="date" 
                                            value={startDate} 
                                            onChange={e => setStartDate(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">End Date</label>
                                        <input 
                                            type="date" 
                                            value={endDate} 
                                            onChange={e => setEndDate(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Category Allocation */}
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-lg font-bold">Category Allocation</h2>
                             <div className="text-sm bg-gray-900 px-3 py-1 rounded-lg border border-gray-700 font-mono text-green-400">
                                Total: ₹{totalBudget.toLocaleString()}
                             </div>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence initial={false}>
                                {categoryLimits.map((limit, index) => (
                                    <motion.div 
                                        key={index}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex gap-2 items-center"
                                    >
                                        <select 
                                            value={limit.categoryId} 
                                            onChange={e => handleUpdateRow(index, 'categoryId', e.target.value)}
                                            className="flex-1 bg-gray-900 border border-gray-700 p-3 rounded-xl appearance-none"
                                        >
                                            <option value="">Select Category</option>
                                            {categories.filter((c: any) => c.type === 'EXPENSE').map((c: any) => (
                                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                            ))}
                                        </select>
                                        
                                        <div className="relative w-32">
                                            <span className="absolute left-3 top-3 text-gray-500">₹</span>
                                            <input 
                                                type="number" 
                                                value={limit.amount || ''} 
                                                onChange={e => handleUpdateRow(index, 'amount', parseFloat(e.target.value))}
                                                placeholder="0"
                                                className="w-full bg-gray-900 border border-gray-700 p-3 pl-6 rounded-xl font-mono text-right"
                                            />
                                        </div>

                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveRow(index)}
                                            className="p-3 text-gray-500 hover:text-red-400 hover:bg-gray-900 rounded-xl transition-colors"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                        
                        <button 
                            type="button"
                            onClick={handleAddRow}
                            className="mt-4 w-full py-3 border border-dashed border-gray-600 rounded-xl text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-700/30 transition-all flex items-center justify-center gap-2 font-medium"
                        >
                            <Plus className="h-5 w-5" /> Add Category
                        </button>
                    </div>

                    {/* ── Envelope Strategy Card ─────────────────────────────────── */}
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
                                    <Layers className="h-5 w-5 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Envelope Strategy</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Track each category as a separate spending envelope with optional rollover</p>
                                </div>
                            </div>
                            {/* Toggle */}
                            <button
                                type="button"
                                onClick={() => setEnvelopeEnabled(v => !v)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    envelopeEnabled ? 'bg-purple-600' : 'bg-gray-700'
                                }`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    envelopeEnabled ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>

                        {envelopeEnabled && (
                            <div className="mt-5 space-y-3">
                                <p className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2">
                                    Enable rollover on individual envelopes to carry unused funds into the next period.
                                </p>
                                {categoryLimits.map((limit, index) => {
                                    const cat = categories.find((c: any) => c.id === limit.categoryId);
                                    if (!limit.categoryId) return null;
                                    const hasRollover = rolloverMap[index] ?? false;
                                    return (
                                        <div key={index} className="flex items-center justify-between bg-gray-900/60 rounded-xl px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{cat?.icon}</span>
                                                <span className="text-sm font-medium text-gray-300">{cat?.name ?? 'Category ' + (index + 1)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RotateCcw className={`h-3.5 w-3.5 ${hasRollover ? 'text-purple-400' : 'text-gray-600'}`} />
                                                <span className="text-xs text-gray-500">Rollover</span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleRollover(index)}
                                                    className={`relative w-10 h-5 rounded-full transition-colors ${
                                                        hasRollover ? 'bg-purple-600' : 'bg-gray-700'
                                                    }`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                                        hasRollover ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

            {/* Submit Bar */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800 flex justify-center z-30 mb-24 md:mb-0">
                         <div className="w-full max-w-2xl flex gap-4">
                             <button 
                                type="button" 
                                onClick={() => router.back()}
                                className="flex-1 py-3 text-gray-400 font-bold hover:text-white"
                            >
                                Cancel
                             </button>
                             <button 
                                type="submit" 
                                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
                            >
                                <Save className="h-5 w-5" />
                                Create Budget
                             </button>
                         </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
