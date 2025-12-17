'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../lib/api';
import { Plus, Target, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '../../lib/motion';

// ... (imports)
import { useRouter } from 'next/navigation';

export default function BudgetsPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const res = await api.get('/budgets');
      setBudgets(res.data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const activeEvents = budgets.filter(b => b.type === 'EVENT' && b.isActive);
  const recurringBudgets = budgets.filter(b => b.type === 'RECURRING' && b.isActive);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans pb-24">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
             <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl font-bold"
            >
                Budgets
            </motion.h1>
            <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-colors"
            >
                <Plus className="h-5 w-5" />
                Create Budget
            </button>
        </div>

        {/* Event Budgets */}
        {activeEvents.length > 0 && (
            <motion.section 
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="mb-12"
            >
                <h2 className="text-xl font-bold text-gray-400 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-400" />
                    Active Events
                </h2>
                <div className="grid gap-4">
                    {activeEvents.map(budget => (
                        <motion.div 
                            variants={fadeInUp} 
                            key={budget.id} 
                            onClick={() => router.push(`/budgets/${budget.id}`)}
                            className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 cursor-pointer hover:border-gray-600 transition-colors"
                        >
                           {/* ... (Existing Card Content) ... */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{budget.name}</h3>
                                    <div className="text-sm text-gray-400 mt-1">
                                        {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold font-mono">₹{budget.amount.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500 uppercase">Target</div>
                                </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mb-2">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-400">Spent: ₹{budget.spent.toLocaleString()}</span>
                                    <span className={budget.spent > budget.amount ? 'text-red-400 font-bold' : 'text-green-400'}>
                                        {Math.round((budget.spent / budget.amount) * 100)}%
                                    </span>
                                </div>
                                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${budget.spent > budget.amount ? 'bg-red-500' : 'bg-purple-500'}`}
                                        style={{ width: `${Math.min((budget.spent / budget.amount) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                            
                            {budget.spent > budget.amount && (
                                <div className="flex items-center gap-2 text-red-400 text-sm mt-2 font-bold bg-red-500/10 p-2 rounded-lg">
                                    <AlertTriangle className="h-4 w-4" />
                                    Over Budget by ₹{(budget.spent - budget.amount).toLocaleString()}
                                </div>
                            )}

                             {/* Hint Text */}
                            <div className="text-xs text-gray-500 mt-4 text-center">
                                Tap to view full breakdown
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.section>
        )}

        {/* ... (Recurring placeholder) ... */}
         <section className="mb-8">
             <h2 className="text-xl font-bold text-gray-400 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-400" />
                Recurring Budgets
            </h2>
            {recurringBudgets.length === 0 ? (
                <div className="text-center py-12 bg-gray-800/50 rounded-2xl border border-gray-700/50 dashed">
                    <p className="text-gray-500">No recurring budgets set. Create one to track monthly category spending.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                     {/* Render recurring budgets here similarly */}
                     {recurringBudgets.map(b => (
                         <div key={b.id} className="bg-gray-800 p-4 rounded-xl">
                             {b.name} - ₹{b.amount}
                         </div>
                     ))}
                </div>
            )}
        </section>

      </main>

      {showCreateModal && (
          <CreateBudgetModal onClose={() => setShowCreateModal(false)} onSuccess={fetchBudgets} />
      )}
    </div>
  );
}

function BudgetTransactionsModal({ budget, onClose }: any) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gray-800 rounded-2xl w-full max-w-lg p-6 border border-gray-700 shadow-2xl max-h-[80vh] flex flex-col"
            >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold">{budget.name}</h2>
                        <span className="text-sm text-gray-400">Transactions</span>
                    </div>
                     <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
                        <Plus className="h-6 w-6 rotate-45" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {budget.transactions && budget.transactions.length > 0 ? (
                        budget.transactions.map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-700/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-800 text-lg">
                                        {/* Simple icon or first letter */}
                                        {t.category?.name?.[0] || '?'}
                                    </div>
                                    <div>
                                        <div className="font-bold">{t.description || t.category?.name || 'Unknown'}</div>
                                        <div className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className={`font-mono font-bold ${t.type === 'INCOME' ? 'text-green-400' : 'text-white'}`}>
                                    {t.type === 'EXPENSE' ? '-' : '+'}₹{Number(t.amount).toLocaleString()}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            No transactions tagged to this budget yet.
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// ... CreateBudgetModal ...

function CreateBudgetModal({ onClose, onSuccess }: any) {
    const [name, setName] = useState('');
    const [type, setType] = useState('EVENT'); // Default to Event for this task focus
    const [amount, setAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/budgets', {
                name, type, amount: parseFloat(amount), startDate, endDate
            });
            onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-4">Create New Budget</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400">Budget Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg" required placeholder="e.g. Goa Trip" />
                    </div>
                    <div>
                         <label className="text-sm text-gray-400">Type</label>
                         <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg">
                             <option value="EVENT">Event (One-time)</option>
                             <option value="RECURRING">Recurring (Monthly)</option>
                         </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-400">Total Amount</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg" required placeholder="10000" />
                    </div>
                    
                    {type === 'EVENT' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-400">Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg" required />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg" required />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 rounded-lg font-bold text-white hover:bg-blue-500">
                            {loading ? 'Creating...' : 'Create Budget'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
