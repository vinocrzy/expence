'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import NativeHeader from '../../components/dashboard/NativeHeader';
import { useBudgets, useHouseholdSettings } from '../../hooks/useLocalData';
import { transactionService, getHouseholdId } from '../../lib/localdb-services';
import { calculateBudgetSpent, getBudgetPeriodWindow } from '../../lib/budget-engine';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Plus, Calendar, Target, AlertTriangle, Trash2, ArrowRight, PieChart, MoreVertical, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

export default function BudgetsPage() {
  const router = useRouter();
  const { budgets, loading: budgetsLoading, updateBudget, deleteBudget, refresh } = useBudgets();
  const { settings } = useHouseholdSettings();
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

  // Calculate spent amounts using shared engine
  const budgetsWithSpent = budgets.map(b => {
      const { start, end } = getBudgetPeriodWindow(b, new Date(), settings);
      const spent = calculateBudgetSpent(b, transactions, start, end);
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

  const activeBudgets = budgetsWithSpent.filter(b => !b.isArchived && b.status === 'ACTIVE');

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 pt-0 md:pt-8 pb-8">        <NativeHeader title="Budgets" />
        <div className="flex justify-between items-center mb-8">
             <div className="hidden md:block">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                    Budgets
                </h1>
                <p className="text-gray-400 text-sm mt-1">Spending limits & Goals</p>
             </div>
             
             {/* Mobile-friendly Add Icon Only on small screens if simpler */}
            <button 
                onClick={() => router.push('/budgets/create')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl font-bold hover:bg-gray-700 transition-colors"
            >
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">New Plan</span>
            </button>
        </div>

        {loading ? (
             <div className="space-y-4">
                 {[1,2].map(i => <div key={i} className="h-40 bg-gray-900 rounded-3xl animate-pulse" />)}
             </div>
        ) : activeBudgets.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 bg-[#18181b] rounded-3xl border border-white/5">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Target className="h-8 w-8 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold text-white">No active budgets</h3>
                <p className="text-gray-500 text-sm mt-2 text-center max-w-xs">
                    Set a limit to track expenses for holidays, events, or monthly categories.
                </p>
                <button 
                    onClick={() => router.push('/budgets/create')}
                    className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
                >
                    Create Budget
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence>
                    {activeBudgets.map((budget, index) => {
                        const totalBudget = budget.totalBudget || 1; // avoid divide by zero
                        const totalSpent = budget.totalSpent || 0;
                        const percent = Math.min((totalSpent / totalBudget) * 100, 100);
                        const isOver = totalSpent > totalBudget;
                        
                        return (
                        <motion.div
                            key={budget.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => router.push(`/budgets/${budget.id}`)}
                            className="bg-[#18181b] p-5 rounded-3xl border border-white/5 cursor-pointer hover:border-white/10 active:scale-[0.99] transition-all group relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                                        budget.budgetMode === 'EVENT' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                                    }`}>
                                        {budget.budgetMode === 'EVENT' ? <Flag className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{budget.name}</h3>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            {budget.budgetMode === 'EVENT' ? 'One-time Event' : 'Monthly Recurring'}
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(budget.id, 'DELETE'); }}
                                    className="p-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Native Pill Progress */}
                            <div className="py-2">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-2xl font-bold font-mono text-white">
                                        {Math.round(percent)}%
                                    </span>
                                    <div className="text-right">
                                        <span className={`text-sm ${isOver ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                                            ₹{totalSpent.toLocaleString()}
                                        </span>
                                        <span className="text-gray-600 text-sm"> / ₹{totalBudget.toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                <div className="h-5 bg-gray-800/50 rounded-full overflow-hidden p-1">
                                    <motion.div 
                                        className={clsx(
                                            "h-full rounded-full relative",
                                            isOver ? "bg-gradient-to-r from-red-600 to-red-500" : "bg-gradient-to-r from-blue-600 to-purple-500"
                                        )}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percent}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 rounded-full" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 40%, 0 40%)' }}></div>
                                    </motion.div>
                                </div>
                                
                                {isOver && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-red-300 font-medium animate-pulse">
                                        <AlertTriangle className="w-3 h-3" />
                                        Exceeded by ₹{(totalSpent - totalBudget).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                    })}
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
