'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { useBudgets, useCategories } from '../../hooks/useLocalData';
import { budgetService, transactionService } from '../../lib/localdb-services';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Plus, Target, Calendar, TrendingUp, AlertTriangle, CheckCircle2, Trash2, Archive, XCircle, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '../../lib/motion';
import { useRouter } from 'next/navigation';

export default function BudgetsPage() {
  const router = useRouter();
  const { budgets, loading: budgetsLoading, updateBudget, deleteBudget, refresh } = useBudgets();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE, PLANNING
  const { categories } = useCategories();
  
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
          const txs = await transactionService.getAll('household_1');
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
      let start = new Date(0); // Beginning of time
      let end = new Date(8640000000000000); // End of time

      if (b.budgetMode === 'EVENT' || (b as any).type === 'EVENT') {
          if (b.startDate) start = new Date(b.startDate);
          if (b.endDate) end = new Date(b.endDate);
          start.setHours(0,0,0,0);
          end.setHours(23,59,59,999);
      } else if (b.budgetMode === 'RECURRING' || (b as any).type === 'RECURRING' || b.budgetMode === 'CATEGORY') {
          // Current Month
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          end.setHours(23,59,59,999);
      }

      spent = transactions
        .filter(t => t.type === 'EXPENSE')
        .filter(t => {
            const tDate = new Date(t.date);
            const inDate = tDate >= start && tDate <= end;
            if (b.budgetMode === 'CATEGORY' && b.categoryId) {
                return inDate && t.categoryId === b.categoryId;
            }
            return inDate;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      return { ...b, totalSpent: spent };
  });

  const convertBudget = async (id: string) => {
      try {
          const budget = budgets.find(b => b.id === id);
          const updates: any = { status: 'ACTIVE' };
          
          // Migrate legacy data if needed
          if (budget && !budget.budgetMode && (budget as any).type) {
              updates.budgetMode = (budget as any).type;
          }
          
          await updateBudget(id, updates);
      } catch(e) {
          console.error(e);
      }
  };

  const handleDeleteClick = (id: string, action: 'DELETE' | 'ARCHIVE') => {
    setConfirmModal({
        isOpen: true,
        title: action === 'DELETE' ? 'Delete Budget?' : 'Archive Active Budget?',
        message: action === 'DELETE' 
            ? "Are you sure you want to permanently delete this budget? This action cannot be undone." 
            : "Are you sure you want to archive this active budget? It will be removed from your active list, but all transaction history will be preserved.",
        isDangerous: action === 'DELETE',
        confirmText: action === 'DELETE' ? 'Delete Budget' : 'Archive Budget',
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

  const activeEvents = budgetsWithSpent.filter(b => (b.budgetMode === 'EVENT' || (b as any).type === 'EVENT') && !b.isArchived && b.status === 'ACTIVE' && !b.categoryId);
  const recurringBudgets = budgetsWithSpent.filter(b => (b.budgetMode === 'RECURRING' || (b as any).type === 'RECURRING') && !b.isArchived && b.status === 'ACTIVE' && !b.categoryId);
  const categoryBudgets = budgetsWithSpent.filter(b => b.budgetMode === 'CATEGORY' && !b.isArchived && b.status === 'ACTIVE');
  // Composite Budgets (New Type: Recurring/Event but has budgetLimitConfig)
  const compositeBudgets = budgetsWithSpent.filter(b => b.budgetLimitConfig && b.budgetLimitConfig.length > 0 && !b.isArchived && b.status === 'ACTIVE');
  
  const plannedBudgets = budgetsWithSpent.filter(b => b.status === 'PLANNING' && !b.isArchived);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans pb-24">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 py-4 md:py-8 pb-32 md:pb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 md:gap-0">
             <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl font-bold"
            >
                Budgets
            </motion.h1>
            <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-colors w-full md:w-auto justify-center"
                style={{ backgroundColor: activeTab === 'PLANNING' ? '#F59E0B' : undefined }}
            >
                <Plus className="h-5 w-5" />
                {activeTab === 'PLANNING' ? 'Draft Budget' : 'Create Budget'}
            </button>
            <button 
                onClick={() => router.push('/budgets/create')} 
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl font-bold hover:bg-gray-700 transition-colors w-full md:w-auto justify-center"
            >
                <LayoutGrid className="h-5 w-5" />
                Advanced Plan
            </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-700 mb-8">
            <button 
                onClick={() => setActiveTab('ACTIVE')}
                className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'ACTIVE' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
                Active Budgets
                {activeTab === 'ACTIVE' && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
            </button>
            <button 
                onClick={() => setActiveTab('PLANNING')}
                className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'PLANNING' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
                Budget Planner
                {activeTab === 'PLANNING' && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500" />
                )}
            </button>
        </div>

        {activeTab === 'PLANNING' ? (
            <motion.section 
                key="planning"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-4"
            >
                {plannedBudgets.length === 0 ? (
                     <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-dashed border-gray-700">
                        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="h-8 w-8 text-yellow-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-300">No Planned Budgets</h3>
                        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                            Use the planner to sandbox future events or monthly budgets without affecting your current tracking.
                        </p>
                    </div>
                ) : (
                    plannedBudgets.map(budget => (
                        <div key={budget.id} className="bg-gray-800 p-4 md:p-6 rounded-2xl border border-yellow-500/20 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-500 text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl">
                               Draft Mode
                           </div>
                           <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{budget.name}</h3>
                                    <div className="text-sm text-gray-400 mt-1">
                                        {budget.budgetMode || (budget as any).type} • {budget.totalBudget ? `₹${budget.totalBudget.toLocaleString()}` : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(budget.id, 'DELETE'); }}
                                    className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-red-400 flex items-center gap-1"
                                >
                                    <Trash2 className="h-3 w-3" /> Delete
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); router.push(`/budgets/${budget.id}/plan`); }}
                                    className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white"
                                >
                                    Edit Plan
                                </button>
                                <button 
                                    onClick={() => convertBudget(budget.id)}
                                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-yellow-900/20"
                                >
                                    Convert to Active <CheckCircle2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </motion.section>
        ) : (
            <>
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
                     {/* Composite Budgets (Grouped Plans) */}
                     {compositeBudgets.map(budget => (
                         <motion.div 
                            variants={fadeInUp}
                            key={budget.id}
                            onClick={() => router.push(`/budgets/${budget.id}`)}
                            className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 cursor-pointer hover:border-gray-600 transition-colors"
                         >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{budget.name}</h3>
                                    <div className="text-sm text-gray-400 mt-1">
                                        Comprehensive Plan • {budget.budgetLimitConfig?.length} Categories
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold font-mono">₹{(budget.totalBudget || 0).toLocaleString()}</div>
                                    <div className="text-xs text-gray-500 uppercase flex items-center justify-end gap-2 mt-1">
                                            Limit
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(budget.id, 'DELETE'); }}
                                                className="p-1 hover:text-red-400 text-gray-600 transition-colors"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                    </div>
                                </div>
                            </div>
                            {/* Simple Progress for Composite */}
                            <div className="mb-2">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">Total Spent: ₹{(budget.totalSpent || 0).toLocaleString()}</span>
                                        <span className={(budget.totalSpent || 0) > (budget.totalBudget || 0) ? 'text-red-400 font-bold' : 'text-green-400'}>
                                            {Math.round(((budget.totalSpent || 0) / (budget.totalBudget || 1)) * 100)}%
                                        </span>
                                    </div>
                                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${(budget.totalSpent || 0) > (budget.totalBudget || 0) ? 'bg-red-500' : 'bg-purple-500'}`}
                                            style={{ width: `${Math.min(((budget.totalSpent || 0) / (budget.totalBudget || 1)) * 100, 100)}%` }}
                                        />
                                    </div>
                            </div>
                         </motion.div>
                     ))}

                    {/* Standard Events */}
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
                                        {budget.startDate && budget.endDate ? `${new Date(budget.startDate).toLocaleDateString()} - ${new Date(budget.endDate).toLocaleDateString()}` : 'No date set'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold font-mono">₹{(budget.totalBudget || 0).toLocaleString()}</div>
                                    <div className="text-xs text-gray-500 uppercase flex items-center justify-end gap-2 mt-1">
                                        Target
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(budget.id, 'DELETE'); }}
                                            className="p-1 hover:text-red-400 text-gray-600 transition-colors"
                                            title="Delete Budget"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(budget.id, 'ARCHIVE'); }}
                                            className="p-1 hover:text-yellow-400 text-gray-600 transition-colors"
                                            title="Archive Budget"
                                        >
                                            <Archive className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mb-2">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-400">Spent: ₹{(budget.totalSpent || 0).toLocaleString()}</span>
                                    <span className={(budget.totalSpent || 0) > (budget.totalBudget || 0) ? 'text-red-400 font-bold' : 'text-green-400'}>
                                        {Math.round(((budget.totalSpent || 0) / (budget.totalBudget || 1)) * 100)}%
                                    </span>
                                </div>
                                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${(budget.totalSpent || 0) > (budget.totalBudget || 0) ? 'bg-red-500' : 'bg-purple-500'}`}
                                        style={{ width: `${Math.min(((budget.totalSpent || 0) / (budget.totalBudget || 1)) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                            
                            {(budget.totalSpent || 0) > (budget.totalBudget || 0) && (
                                <div className="flex items-center gap-2 text-red-400 text-sm mt-2 font-bold bg-red-500/10 p-2 rounded-lg">
                                    <AlertTriangle className="h-4 w-4" />
                                    Over Budget by ₹{((budget.totalSpent || 0) - (budget.totalBudget || 0)).toLocaleString()}
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
                     {/* Category Budgets First */}
                     {categoryBudgets.map(budget => {
                         const category = categories.find(c => c.id === budget.categoryId);
                         return (
                            <motion.div 
                                variants={fadeInUp} 
                                key={budget.id} 
                                onClick={() => router.push(`/budgets/${budget.id}`)}
                                className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 cursor-pointer hover:border-gray-600 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        {category && (
                                            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg">
                                                {category.icon || category.name[0]}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-xl font-bold">{budget.name}</h3>
                                            <div className="text-sm text-gray-400 mt-1">
                                                Monthly Category Budget
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold font-mono">₹{(budget.totalBudget || 0).toLocaleString()}</div>
                                        <div className="text-xs text-gray-500 uppercase flex items-center justify-end gap-2 mt-1">
                                            Limit
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(budget.id, 'DELETE'); }}
                                                className="p-1 hover:text-red-400 text-gray-600 transition-colors"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="mb-2">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">Spent: ₹{(budget.totalSpent || 0).toLocaleString()}</span>
                                        <span className={(budget.totalSpent || 0) > (budget.totalBudget || 0) ? 'text-red-400 font-bold' : 'text-green-400'}>
                                            {Math.round(((budget.totalSpent || 0) / (budget.totalBudget || 1)) * 100)}%
                                        </span>
                                    </div>
                                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${(budget.totalSpent || 0) > (budget.totalBudget || 0) ? 'bg-red-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min(((budget.totalSpent || 0) / (budget.totalBudget || 1)) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                                {(budget.totalSpent || 0) > (budget.totalBudget || 0) && (
                                    <div className="flex items-center gap-2 text-red-400 text-sm mt-2 font-bold bg-red-500/10 p-2 rounded-lg">
                                        <AlertTriangle className="h-4 w-4" />
                                        Over Budget by ₹{((budget.totalSpent || 0) - (budget.totalBudget || 0)).toLocaleString()}
                                    </div>
                                )}
                            </motion.div>
                         );
                     })}

                     {/* Recurring Budgets */}
                     {recurringBudgets.map(budget => (
                         <motion.div 
                             variants={fadeInUp} 
                             key={budget.id} 
                             onClick={() => router.push(`/budgets/${budget.id}`)}
                             className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 cursor-pointer hover:border-gray-600 transition-colors"
                         >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{budget.name}</h3>
                                    <div className="text-sm text-gray-400 mt-1">
                                        Recurring • Monthly Reset
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold font-mono">₹{(budget.totalBudget || 0).toLocaleString()}</div>
                                    <div className="text-xs text-gray-500 uppercase flex items-center justify-end gap-2 mt-1">
                                        Target
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(budget.id, 'DELETE'); }}
                                            className="p-1 hover:text-red-400 text-gray-600 transition-colors"
                                            title="Delete Budget"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(budget.id, 'ARCHIVE'); }}
                                            className="p-1 hover:text-yellow-400 text-gray-600 transition-colors"
                                            title="Archive Budget"
                                        >
                                            <Archive className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mb-2">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-400">Spent: ₹{(budget.totalSpent || 0).toLocaleString()}</span>
                                    <span className={(budget.totalSpent || 0) > (budget.totalBudget || 0) ? 'text-red-400 font-bold' : 'text-green-400'}>
                                        {Math.round(((budget.totalSpent || 0) / (budget.totalBudget || 1)) * 100)}%
                                    </span>
                                </div>
                                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${(budget.totalSpent || 0) > (budget.totalBudget || 0) ? 'bg-red-500' : 'bg-purple-500'}`}
                                        style={{ width: `${Math.min(((budget.totalSpent || 0) / (budget.totalBudget || 1)) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                            
                            {(budget.totalSpent || 0) > (budget.totalBudget || 0) && (
                                <div className="flex items-center gap-2 text-red-400 text-sm mt-2 font-bold bg-red-500/10 p-2 rounded-lg">
                                    <AlertTriangle className="h-4 w-4" />
                                    Over Budget by ₹{((budget.totalSpent || 0) - (budget.totalBudget || 0)).toLocaleString()}
                                </div>
                            )}

                             {/* Hint Text */}
                            <div className="text-xs text-gray-500 mt-4 text-center">
                                Tap to view full breakdown
                            </div>
                         </motion.div>
                     ))}
                </div>
            )}
        </section>
        </>
      )}

      </main>

      {showCreateModal && (
          <CreateBudgetModal onClose={() => setShowCreateModal(false)} onSuccess={refresh} initialStatus={activeTab} categories={categories} />
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

function CreateBudgetModal({ onClose, onSuccess, initialStatus, categories }: any) {
    const [name, setName] = useState('');
    const [type, setType] = useState('EVENT'); 
    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState(initialStatus || 'ACTIVE');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await budgetService.create({
                name, 
                budgetMode: type as any, 
                categoryId: type === 'CATEGORY' ? categoryId : undefined,
                totalBudget: parseFloat(amount), 
                startDate, 
                endDate, 
                status,
                planItems: [], // Initialize plan items
                totalSpent: 0
            });
            onClose(); // Close first
            await onSuccess(); // Then refresh
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
                    
                    {/* Status Selection (Simplified: if creating from Planner tab, default to PLANNING, user can override) */}
                     <div>
                         <label className="text-sm text-gray-400">Status</label>
                         <select 
                            value={status} 
                            onChange={(e) => setStatus(e.target.value)} 
                            className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg"
                         >
                             <option value="ACTIVE">Active (Live Tracking)</option>
                             <option value="PLANNING">Planner (Sandbox)</option>
                         </select>
                         <div className="text-[10px] text-gray-500 mt-1">
                             Use the tabs on the main screen to create different budget types.
                         </div>
                    </div>

                    <div>
                         <label className="text-sm text-gray-400">Type</label>
                         <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg">
                             <option value="EVENT">Event (One-time)</option>
                             <option value="RECURRING">Recurring (Monthly)</option>
                             <option value="CATEGORY">Category Budget (Monthly)</option>
                         </select>
                    </div>
                    
                    {type === 'CATEGORY' && (
                        <div>
                            <label className="text-sm text-gray-400">Category</label>
                            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg" required>
                                <option value="">Select Category</option>
                                {categories && categories.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
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
