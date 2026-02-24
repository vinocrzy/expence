'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PieChart, TrendingUp, AlertCircle, ChevronRight, Plus, Target } from 'lucide-react';
import { Budget } from '@/lib/db-types';
import { useBudgets, useTransactions } from '@/hooks/useLocalData';
import { calculateBudgetSpent, getBudgetPeriodWindow } from '@/lib/budget-engine';

export default function BudgetWidget() {
  const router = useRouter();
  const { budgets, loading: budgetsLoading } = useBudgets();
  const { transactions, loading: txLoading } = useTransactions();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [spent, setSpent] = useState(0);

  const loading = budgetsLoading || txLoading;

  useEffect(() => {
    if (budgetsLoading || txLoading) return;

    // Prioritize Active Recurring Budget
    const activeBudget = budgets.find(b => b.status === 'ACTIVE' && b.budgetMode === 'RECURRING');
    
    if (activeBudget) {
        setBudget(activeBudget);
        const { start, end } = getBudgetPeriodWindow(activeBudget);
        const relevantAmount = calculateBudgetSpent(activeBudget, transactions, start, end);
        setSpent(relevantAmount);
    } else {
        setBudget(null);
        setSpent(0);
    }
  }, [budgets, transactions, budgetsLoading, txLoading]);

  if (loading) return (
    <div className="glass-panel p-6 rounded-3xl animate-pulse h-48">
        <div className="h-6 w-32 bg-white/10 rounded-full mb-4" />
        <div className="h-2 w-full bg-white/5 rounded-full mb-6" />
        <div className="h-4 w-24 bg-white/10 rounded-full" />
    </div>
  );

  if (!budget) return (
    <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
        <div className="absolute -bottom-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
            <Target className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10">
             <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-gray-400" />
             </div>
             <h3 className="text-white font-bold text-lg mb-1">No Budget Set</h3>
             <p className="text-gray-400 text-sm mb-6">Create a budget to track your spending habits.</p>
             <button 
                 onClick={() => router.push('/budgets/create')}
                 className="bg-white text-black px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg shadow-white/5"
             >
                 <Plus className="w-4 h-4" /> Create Plan
             </button>
        </div>
    </div>
  );

  const limit = budget.totalBudget || 0;
  const percentage = Math.min((spent / limit) * 100, 100);
  const remaining = Math.max(0, limit - spent);
  const isOver = spent > limit;

  return (
    <div 
        onClick={() => router.push(`/budgets/${budget.id}`)}
        className="glass-panel p-6 rounded-3xl relative overflow-hidden group cursor-pointer hover:bg-[#1c1c1e] transition-all duration-300"
    >
        {/* Background Gradients */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${isOver ? 'from-red-500/10 to-orange-500/0' : 'from-blue-500/10 to-purple-500/0'} rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-50 group-hover:opacity-80 transition-opacity duration-500`} />

        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-gray-400 font-medium text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                       <Target className="w-3 h-3" /> Monthly Budget
                    </h3>
                    <div className="text-lg font-bold text-white truncate max-w-[150px]">
                        {budget.name}
                    </div>
                </div>
                <div className={`flex flex-col items-end`}>
                    <span className={`text-2xl font-bold tracking-tight ${isOver ? 'text-red-400' : 'text-white'}`}>
                        {Math.round(percentage)}%
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Used</span>
                </div>
            </div>

            {/* Premium Progress Bar */}
            <div className="mb-6 relative">
                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        className={`h-full rounded-full relative ${
                            isOver 
                            ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                            : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500'
                        }`}
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -translate-x-full animate-shimmer" />
                    </motion.div>
                </div>
                
                {/* Tick marks or limit indicators could go here */}
            </div>

            {/* Footer Stats */}
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Remaining</p>
                    <p className={`text-base font-bold flex items-center gap-1.5 ${isOver ? 'text-red-400' : 'text-green-400'}`}>
                         {isOver ? (
                            <><AlertCircle className="w-4 h-4" /> -₹{(spent - limit).toLocaleString()}</>
                         ) : (
                            `₹${remaining.toLocaleString()}`
                         )}
                    </p>
                </div>
                
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                </div>
            </div>
        </div>
    </div>
  );
}
