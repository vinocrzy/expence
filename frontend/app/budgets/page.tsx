'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { useBudgets } from '../../hooks/useLocalData';
import { transactionService, getHouseholdId } from '../../lib/localdb-services';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Plus, Calendar, Target, AlertTriangle, Trash2, Archive, ArrowRight, PieChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function BudgetsPage() {
  const router = useRouter();
  const { budgets, loading: budgetsLoading, updateBudget, deleteBudget, refresh } = useBudgets();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDangerous: false,
    confirmText: 'Confirm'
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
      try {
          const householdId = await getHouseholdId();
          const txs = await transactionService.getAll(householdId);
          setTransactions(txs);
      } catch (e) {
          console.error('Failed to load transactions', e);
      } finally {
          setTxLoading(false);
      }
  };

  const loading = budgetsLoading || txLoading;

  // Calculate spent amounts
  const budgetsWithSpent = budgets.map(b => {
      let spent = 0;
      const now = new Date();
      let start = new Date(0); 
      let end = new Date(8640000000000000); 

      if (b.budgetMode === 'EVENT') {
          if (b.startDate) start = new Date(b.startDate);
          if (b.endDate) end = new Date(b.endDate);
          start.setHours(0,0,0,0);
          end.setHours(23,59,59,999);
      } else {
          // Recurring (Default)
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          end.setHours(23,59,59,999);
      }

      spent = transactions
        .filter(t => t.type === 'EXPENSE')
        .filter(t => {
            const tDate = new Date(t.date);
            // Apply budget category filter if config exists
            if (b.budgetLimitConfig && b.budgetLimitConfig.length > 0) {
                 const catIds = b.budgetLimitConfig.map((c: any) => c.categoryId);
                 return tDate >= start && tDate <= end && catIds.includes(t.categoryId);
            }
            return tDate >= start && tDate <= end;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      return { ...b, totalSpent: spent };
  });

  const handleDeleteClick = (id: string, action: 'DELETE' | 'ARCHIVE') => {
    setConfirmModal({
        isOpen: true,
        title: action === 'DELETE' ? 'Delete Budget?' : 'Archive Budget?',
        message: action === 'DELETE' 
            ? "Are you sure you want to permanently delete this budget? This action cannot be undone." 
            : "Archive this budget? It will be hidden from the main list.",
        isDangerous: action === 'DELETE',
        confirmText: action === 'DELETE' ? 'Delete Budget' : 'Archive',
        onConfirm: () => handleDeleteBudget(id, action)
    });
  };

  const handleDeleteBudget = async (id: string, action: 'DELETE' | 'ARCHIVE') => {
      try {
          if (action === 'DELETE') {
              await deleteBudget(id);
          } else {
              await updateBudget(id, { isArchived: true });
          }
      } catch (e) {
          console.error(e);
          alert(`Failed to ${action.toLowerCase()} budget`);
      }
  };

  // Filter Active Budgets
  const activeBudgets = budgetsWithSpent.filter(b => !b.isArchived && b.status === 'ACTIVE');

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans pb-24">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
             <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                    Budgets
                </h1>
                <p className="text-gray-400 text-sm mt-1">Track and manage your spending limits</p>
             </div>
            <button 
                onClick={() => router.push('/budgets/create')}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
            >
                <Plus className="h-5 w-5" />
                Create New Budget
            </button>
        </div>

        {activeBudgets.length === 0 ? (
             <div className="text-center py-20 bg-gray-800/30 rounded-3xl border border-dashed border-gray-700">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <PieChart className="h-10 w-10 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-300">No Active Budgets</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto mb-8">
                    Create a comprehensive budget to track multiple categories, or set up a one-time event budget.
                </p>
                <button 
                    onClick={() => router.push('/budgets/create')}
                    className="px-6 py-3 bg-gray-800 border border-gray-600 hover:bg-gray-700 rounded-xl font-bold transition-colors"
                >
                    Start your first plan
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence>
                    {activeBudgets.map((budget, index) => (
                        <motion.div
                            key={budget.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => router.push(`/budgets/${budget.id}`)}
                            className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 cursor-pointer hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-900/10 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                {budget.budgetMode === 'EVENT' ? <Calendar className="w-32 h-32" /> : <Target className="w-32 h-32" />}
                            </div>

                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div>
                                    <h3 className="text-xl font-bold group-hover:text-purple-400 transition-colors">{budget.name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                        {budget.budgetMode === 'EVENT' ? <Calendar className="w-3 h-3" /> : <Target className="w-3 h-3" />}
                                        {budget.budgetMode === 'EVENT' ? 'One-time Event' : 'Monthly Recurring'}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(budget.id, 'DELETE'); }}
                                        className="p-2 hover:bg-gray-700 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div className="flex justify-between items-end">
                                    <div className="text-3xl font-bold font-mono">
                                        <span className="text-sm text-gray-500 font-sans block mb-1">Remaining</span>
                                        ₹{Math.max(0, (budget.totalBudget || 0) - (budget.totalSpent || 0)).toLocaleString()}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">Limit</div>
                                        <div className="font-mono text-gray-300">₹{(budget.totalBudget || 0).toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div>
                                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${(budget.totalSpent || 0) > (budget.totalBudget || 0) ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                                            style={{ width: `${Math.min(((budget.totalSpent || 0) / (budget.totalBudget || 1)) * 100, 100)}%` }}
                                        />
                                    </div>
                                     <div className="flex justify-between mt-2 text-xs">
                                        <span className="text-gray-400">
                                            ₹{(budget.totalSpent || 0).toLocaleString()} spent
                                        </span>
                                        <span className={(budget.totalSpent || 0) > (budget.totalBudget || 0) ? 'text-red-400 font-bold' : 'text-gray-400'}>
                                            {Math.round(((budget.totalSpent || 0) / (budget.totalBudget || 1)) * 100)}%
                                        </span>
                                    </div>
                                </div>

                                {(budget.totalSpent || 0) > (budget.totalBudget || 0) && (
                                    <div className="flex items-center gap-2 text-red-300 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        <span>Over budget by ₹{((budget.totalSpent || 0) - (budget.totalBudget || 0)).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex items-center text-sm text-blue-400 font-medium group-hover:translate-x-1 transition-transform">
                                View Details <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        )}

        <ConfirmationModal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmModal.onConfirm}
            title={confirmModal.title}
            message={confirmModal.message}
            isDangerous={confirmModal.isDangerous}
            confirmText={confirmModal.confirmText}
        />
      </main>
    </div>
  );
}
