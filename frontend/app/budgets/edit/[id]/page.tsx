'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter, useParams } from 'next/navigation';
import { useCategories } from '@/hooks/useLocalData';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, Calendar, Loader2 } from 'lucide-react';
import { BudgetCategoryLimit } from '@/lib/db-types';
import { budgetService, getHouseholdId } from '@/lib/localdb-services';

export default function EditBudgetPage() {
    const router = useRouter();
    const { id } = useParams();
    const { categories, loading: catsLoading } = useCategories();
    
    const [name, setName] = useState('');
    const [budgetMode, setBudgetMode] = useState<'RECURRING' | 'EVENT'>('RECURRING');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categoryRows, setCategoryRows] = useState<{ tempId: string, categoryId: string, amount: string }[]>([]);
    
    // Derived total
    const totalBudget = categoryRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id) return;
        async function loadBudget() {
            try {
                const b = await budgetService.getById(id as string);
                if (!b) throw new Error('Budget not found');
                
                setName(b.name);
                setBudgetMode((b.budgetMode as 'RECURRING' | 'EVENT') || 'RECURRING');
                if (b.startDate) setStartDate(new Date(b.startDate).toISOString().substring(0, 10));
                if (b.endDate) setEndDate(new Date(b.endDate).toISOString().substring(0, 10));
                
                if (b.budgetLimitConfig) {
                    setCategoryRows(b.budgetLimitConfig.map(c => ({
                        tempId: Math.random().toString(),
                        categoryId: c.categoryId,
                        amount: c.amount.toString()
                    })));
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

    const addCategoryRow = () => {
        setCategoryRows([...categoryRows, { tempId: Math.random().toString(), categoryId: '', amount: '' }]);
    };

    const updateRow = (index: number, field: 'categoryId' | 'amount', value: string) => {
        const newRows = [...categoryRows];
        newRows[index] = { ...newRows[index], [field]: value };
        setCategoryRows(newRows);
    };

    const removeRow = (index: number) => {
        setCategoryRows(categoryRows.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!name.trim()) return alert('Please enter a budget name');
        if (categoryRows.length === 0) return alert('Please add at least one category');

        setSaving(true);
        try {
            const householdId = await getHouseholdId();
            
            const config: BudgetCategoryLimit[] = categoryRows.map(row => ({
                 categoryId: row.categoryId,
                 amount: Number(row.amount)
            }));

            await budgetService.update(id as string, {
                name,
                totalBudget, // Recalculated total
                status: 'ACTIVE',
                budgetMode: budgetMode as 'RECURRING' | 'EVENT' | 'CATEGORY', // Cast to allowed types
                startDate: budgetMode === 'EVENT' && startDate ? new Date(startDate).toISOString() : undefined,
                endDate: budgetMode === 'EVENT' && endDate ? new Date(endDate).toISOString() : undefined,
                budgetLimitConfig: config
            });

            router.push(`/budgets/${id}`);
        } catch (e) {
            console.error(e);
            alert('Failed to update budget');
        } finally {
            setSaving(false);
        }
    };

    if (loading || catsLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans pb-24">
            <Navbar />
            
            <main className="max-w-3xl mx-auto px-4 py-8">
                 {/* Header */}
                 <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-3xl font-bold">Edit Budget</h1>
                </div>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Budget Name</label>
                            <input 
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Monthly Essentials"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Budget Type</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setBudgetMode('RECURRING')}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                        budgetMode === 'RECURRING' 
                                            ? 'bg-purple-500/20 border-purple-500 text-white' 
                                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
                                    }`}
                                >
                                    <Calendar className="h-6 w-6" />
                                    <span className="font-bold">Recurring Monthly</span>
                                </button>
                                <button 
                                    onClick={() => setBudgetMode('EVENT')}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                        budgetMode === 'EVENT' 
                                            ? 'bg-blue-500/20 border-blue-500 text-white' 
                                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
                                    }`}
                                >
                                    <Calendar className="h-6 w-6" />
                                    <span className="font-bold">One-Time Event</span>
                                </button>
                            </div>
                        </div>

                        {budgetMode === 'EVENT' && (
                             <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Start Date</label>
                                    <input 
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">End Date</label>
                                    <input 
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                             </div>
                        )}
                    </div>

                    {/* Category Allocations */}
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-300">Category Limits</h3>
                            <div className="text-sm text-gray-400">
                                Total: <span className="text-white font-mono font-bold">₹{totalBudget.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence>
                                {categoryRows.map((row, index) => (
                                    <motion.div 
                                        key={row.tempId}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex gap-3 items-center"
                                    >
                                        <div className="flex-1">
                                            <select
                                                value={row.categoryId}
                                                onChange={(e) => updateRow(index, 'categoryId', e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 appearance-none"
                                            >
                                                <option value="">Select Category</option>
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-32 relative">
                                            <span className="absolute left-3 top-3 text-gray-500">₹</span>
                                            <input 
                                                type="number" 
                                                placeholder="0"
                                                value={row.amount}
                                                onChange={(e) => updateRow(index, 'amount', e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-7 pr-4 py-3 text-white focus:outline-none focus:border-purple-500 font-mono"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => removeRow(index)}
                                            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        <button 
                            onClick={addCategoryRow}
                            className="mt-4 w-full py-3 border-2 border-dashed border-gray-700 hover:border-gray-600 rounded-xl text-gray-400 hover:text-white flex items-center justify-center gap-2 font-bold transition-all"
                        >
                            <Plus className="h-5 w-5" /> Add Category
                        </button>
                    </div>

                    {/* Submit */}
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <Save className="h-5 w-5" />}
                        Update Budget Plan
                    </button>
                </div>
            </main>
        </div>
    );
}
