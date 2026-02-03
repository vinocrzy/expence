'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PieChart, TrendingUp, AlertCircle, ChevronRight, Plus } from 'lucide-react';
import { budgetService, transactionService, getHouseholdId } from '@/lib/localdb-services';
import { Budget, Transaction } from '@/lib/db-types';

export default function BudgetWidget() {
  const router = useRouter();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [spent, setSpent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBudget() {
      try {
        const householdId = await getHouseholdId();
        const allBudgets = await budgetService.getAll(householdId);
        // Prioritize Active Recurring Budget
        const activeBudget = allBudgets.find(b => b.status === 'ACTIVE' && b.budgetMode === 'RECURRING');
        
        if (activeBudget) {
            setBudget(activeBudget);
            
            // Calculate Spend for Current Month
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);

            const txs = await transactionService.getAll(householdId);
            const relativeExpenses = txs.filter(t => {
                const tDate = new Date(t.date);
                return t.type === 'EXPENSE' && tDate >= start && tDate <= end;
            });

            // Filter by budget categories if specific config exists
            let relevantAmount = 0;
            if (activeBudget.budgetLimitConfig && activeBudget.budgetLimitConfig.length > 0) {
                const categoryIds = activeBudget.budgetLimitConfig.map(c => c.categoryId);
                relevantAmount = relativeExpenses
                    .filter(t => categoryIds.includes(t.categoryId || ''))
                    .reduce((sum, t) => sum + t.amount, 0);
            } else {
                // If no specific config, maybe all expenses? Or 0? 
                // Usually "Monthly Budget" implies all expenses unless specified.
                // But our Create flow forces category selection.
                // Fallback to all if empty config? Let's stick to config match for accuracy.
                relevantAmount = relativeExpenses.reduce((sum, t) => sum + t.amount, 0);
            }
            setSpent(relevantAmount);
        }
      } catch (e) {
        console.error('Failed to load budget widget', e);
      } finally {
        setLoading(false);
      }
    }
    loadBudget();
  }, []);

  if (loading) return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 animate-pulse h-48">
        <div className="h-6 w-32 bg-gray-700 rounded mb-4" />
        <div className="h-2 w-full bg-gray-700 rounded mb-6" />
        <div className="h-4 w-24 bg-gray-700 rounded" />
    </div>
  );

  if (!budget) return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <PieChart className="w-24 h-24 text-gray-400" />
        </div>
        <h3 className="text-gray-400 font-medium mb-1 flex items-center gap-2">
            <PieChart className="w-4 h-4" /> Monthly Budget
        </h3>
        <div className="mt-4">
            <p className="text-gray-400 text-sm mb-4">No active plan found.</p>
            <button 
                onClick={() => router.push('/budgets/create')}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
                <Plus className="w-4 h-4" /> Create Budget
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
        className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 relative overflow-hidden group cursor-pointer hover:border-purple-500/30 transition-all"
    >
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="text-gray-400 font-medium flex items-center gap-2 text-sm">
                    <PieChart className="w-4 h-4 text-purple-400" /> Monthly Budget
                </h3>
                <div className="text-xl font-bold mt-1 text-white truncate max-w-[150px]">
                    {budget.name}
                </div>
            </div>
            <div className={`text-right px-2 py-1 rounded-lg text-xs font-bold ${
                isOver ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'
            }`}>
                {Math.round(percentage)}%
            </div>
        </div>

        {/* Progress System */}
        <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>₹{spent.toLocaleString()} spent</span>
                <span>₹{limit.toLocaleString()} limit</span>
            </div>
            <div className="h-2.5 bg-gray-700/50 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${isOver ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                />
            </div>
        </div>

        {/* Footer Info */}
        <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
                {isOver ? (
                    <span className="text-red-400 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Over by ₹{(spent - limit).toLocaleString()}
                    </span>
                ) : (
                    <span className="text-gray-300">
                        <span className="font-bold text-white">₹{remaining.toLocaleString()}</span> left
                    </span>
                )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
        </div>
    </div>
  );
}
