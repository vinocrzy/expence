'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { useCategories, useBudgets } from '@/hooks/useLocalData';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, Calendar } from 'lucide-react';
import { BudgetCategoryLimit, Budget, Category } from '@/lib/db-types';

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

    const totalBudget = categoryLimits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const handleAddRow = () => {
        setCategoryLimits([...categoryLimits, { categoryId: '', amount: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        const newLimits = [...categoryLimits];
        newLimits.splice(index, 1);
        setCategoryLimits(newLimits);
    };

    const handleUpdateRow = (index: number, field: keyof BudgetCategoryLimit, value: any) => {
        const newLimits = [...categoryLimits];
        newLimits[index] = { ...newLimits[index], [field]: value };
        setCategoryLimits(newLimits);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!name) return alert('Please enter a budget name');
        if (categoryLimits.length === 0) return alert('Please add at least one category');
        const validLimits = categoryLimits.filter(l => l.categoryId && l.amount > 0);
        if (validLimits.length === 0) return alert('Please set valid amounts for categories');

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
                // Legacy support (optional, can leave empty or set main category if needed)
            });
            router.push('/budgets');
        } catch (error) {
            console.error(error);
            alert('Failed to create budget');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans pb-24">
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

                    {/* Submit Bar */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800 flex justify-center z-10">
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
