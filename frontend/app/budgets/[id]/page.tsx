'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import NativeHeader from '@/components/dashboard/NativeHeader';
import { budgetService, transactionService, categoryService, accountService, creditCardService, getHouseholdId } from '@/lib/localdb-services';
import { 
    ArrowLeft, PieChart, TrendingUp, AlertCircle, 
    Calendar, Wallet, CheckCircle2, AlertTriangle, ArrowUpRight,
    ChevronLeft, ChevronRight, Edit2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
    PieChart as RePieChart, Pie, Cell, ResponsiveContainer, 
    Tooltip as ReTooltip, BarChart, Bar, XAxis, YAxis, Legend
} from 'recharts';
import { Transaction, Budget, Category, Account, CreditCard, BudgetCategoryLimit } from '@/lib/db-types';

export default function BudgetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  // Raw Data State
  const [budget, setBudget] = useState<Budget | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allAccounts, setAllAccounts] = useState<(Account | CreditCard)[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // View State
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    if (id) fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const householdId = await getHouseholdId();
      
      const [fetchedBudget, txs, cats, accs, ccs] = await Promise.all([
          budgetService.getById(id as string),
          transactionService.getAll(householdId),
          categoryService.getAll(householdId),
          accountService.getAll(householdId),
          creditCardService.getAll(householdId)
      ]);

      if (!fetchedBudget) throw new Error('Budget not found');

      setBudget(fetchedBudget);
      setAllTransactions(txs);
      setCategories(cats);
      setAllAccounts([...accs, ...ccs]);
      
      // If event budget, set viewDate to start date to ensure we see relevant period immediately
      if (fetchedBudget.budgetMode === 'EVENT' && fetchedBudget.startDate) {
          setViewDate(new Date(fetchedBudget.startDate));
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Derived Analytics based on View Date and Budget Mode
  const analytics = useMemo(() => {
    if (!budget) return null;

    // 1. Determine Date Range
    let start: Date;
    let end: Date;

    if (budget.budgetMode === 'EVENT' && budget.startDate && budget.endDate) {
        start = new Date(budget.startDate);
        end = new Date(budget.endDate);
    } else {
        // Recurring: Use View Date Month
        start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1); 
        end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    }
    
    // Inclusive timing
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    // 2. Filter Transactions
    const expenses = allTransactions.filter((t) => {
        if (t.type !== 'EXPENSE') return false;
        const tDate = new Date(t.date);
        return tDate >= start && tDate <= end;
    });
    
    const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);

    // 3. Breakdown Calculation
    const breakdownMap = new Map<string, {
        id: string;
        name: string;
        color: string;
        limit: number;
        spent: number;
        transactions: Transaction[];
    }>();

    // Init Config
    if (budget.budgetLimitConfig && budget.budgetLimitConfig.length > 0) {
        budget.budgetLimitConfig.forEach((limit: BudgetCategoryLimit) => {
            const cat = categories.find(c => c.id === limit.categoryId);
            breakdownMap.set(limit.categoryId, {
                id: limit.categoryId,
                name: cat?.name || 'Unknown',
                color: cat?.color || '#64748b',
                limit: limit.amount,
                spent: 0,
                transactions: []
            });
        });
    }

    // Process Expenses
    expenses.forEach((t) => {
        const catId = t.categoryId || 'uncategorized';
        
        if (!breakdownMap.has(catId)) {
            const cat = categories.find(c => c.id === catId);
            breakdownMap.set(catId, {
                id: catId,
                name: cat?.name || 'Uncategorized',
                color: cat?.color || '#94a3b8',
                limit: 0,
                spent: 0,
                transactions: []
            });
        }

        const entry = breakdownMap.get(catId)!;
        entry.spent += t.amount;
        entry.transactions.push(t);
    });

    // 4. Formatting
    const categoryBreakdown = Array.from(breakdownMap.values()).map(item => {
        return {
            ...item,
            percentage: item.limit > 0 ? (item.spent / item.limit) * 100 : 0,
            isOverBudget: item.limit > 0 && item.spent > item.limit
        };
    });

    categoryBreakdown.sort((a,b) => (b.spent - a.spent));

    // 5. Timeline & Payment Methods
    const paymentBreakdown = expenses.reduce((acc: any[], t: any) => {
         let accName = 'Unknown Account';
         if (t.accountId) {
             const foundAcc = allAccounts.find((a: any) => a.id === t.accountId);
             if (foundAcc) accName = foundAcc.name || (foundAcc as any).bankName || 'Account';
         }
         const existing = acc.find((p: any) => p.name === accName);
         if (existing) existing.amount += t.amount;
         else acc.push({ name: accName, amount: t.amount });
         return acc;
    }, []);
    
    const timelineMap: Record<string, number> = {};
    expenses.forEach((t: any) => {
        const dateKey = new Date(t.date).toISOString().split('T')[0];
        timelineMap[dateKey] = (timelineMap[dateKey] || 0) + t.amount;
    });
    const timeline = Object.keys(timelineMap)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(date => ({ date, amount: timelineMap[date] }));

    // 6. Insights
    const insights: any[] = [];
    
    categoryBreakdown.filter(c => c.isOverBudget).forEach(c => {
         insights.push({
             title: `${c.name} Over Limit`,
             description: `Limit: ₹${c.limit.toLocaleString()}. Spent: ₹${c.spent.toLocaleString()}.`,
             severity: 'error'
         });
    });

    return {
        totalSpent,
        categoryBreakdown,
        timeline,
        paymentBreakdown,
        insights,
        start,
        end
    };
  }, [budget, allTransactions, categories, allAccounts, viewDate]);

  // View Helpers
  const changeMonth = (delta: number) => {
      const newDate = new Date(viewDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setViewDate(newDate);
  };

  const isRecurring = budget?.budgetMode === 'RECURRING' || !budget?.budgetMode; 
  
  if (loading || !budget || !analytics) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading breakdown...</div>;

  const { totalSpent, categoryBreakdown, timeline, paymentBreakdown, insights, start, end } = analytics;
  const budgetLimit = Number(budget.totalBudget || 0);
  const percentUsed = Math.min((totalSpent / budgetLimit || 0) * 100, 100);

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32 md:pb-8">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 md:pt-8 pb-8">
        <NativeHeader title={budget.name} backUrl="/budgets" />
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 hidden md:flex">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                     <h1 className="text-3xl font-bold flex items-center gap-3">
                        {budget.name}
                        <button 
                            onClick={() => router.push(`/budgets/edit/${budget.id}`)}
                            className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                    </h1>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>Recurring Budget Plan</span>
                    </div>
                </div>
            </div>

            {/* Month Selector for Recurring */}
            {isRecurring && (
                <div className="flex items-center bg-[#1c1c1e] rounded-xl p-1 border border-white/10">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="px-4 font-bold min-w-[140px] text-center text-sm">
                        {start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            )}
            
            {/* Date Range for Event */}
            {!isRecurring && (
                <div className="bg-[#1c1c1e] px-4 py-2 rounded-xl border border-white/10 font-mono text-sm">
                    {start.toLocaleDateString()} - {end.toLocaleDateString()}
                </div>
            )}
        </div>

        {/* Mobile Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6 md:hidden">
            <button 
                  onClick={() => router.push(`/budgets/edit/${budget.id}`)}
                  className="py-3 bg-[#1c1c1e] border border-white/10 text-white rounded-2xl font-medium flex items-center justify-center gap-2 text-sm"
            >
                <Edit2 className="h-4 w-4" /> Edit Budget
            </button>
             {isRecurring && (
                <div className="flex items-center justify-between bg-[#1c1c1e] rounded-2xl p-1 border border-white/10 px-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="font-bold text-xs text-center flex-1">
                        {start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    </div>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Overview & Insights */}
            <div className="space-y-6">
                {/* Visual Card */}
                <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 shadow-lg">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <span className="text-gray-400 text-sm">Total Spend</span>
                            <div className="text-4xl font-bold font-mono mt-1">₹{totalSpent.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                             <span className="text-gray-400 text-xs">Total Limit</span>
                             <div className="text-sm font-bold text-gray-300">₹{budgetLimit.toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <div className="h-4 bg-gray-800 rounded-full overflow-hidden mb-2">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentUsed}%` }}
                            className={`h-full rounded-full ${totalSpent > budgetLimit ? 'bg-red-500' : 'bg-purple-500'}`}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>{Math.round(percentUsed)}% Used</span>
                        <span>₹{(Math.max(0, budgetLimit - totalSpent)).toLocaleString()} Remaining</span>
                    </div>
                </div>

                {/* Insights List */}
                {insights.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-400 flex items-center gap-2 pl-2">
                            <AlertCircle className="h-4 w-4 text-yellow-400" />
                            Insights & Alerts
                        </h3>
                        {insights.map((insight: any, idx: number) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`p-4 rounded-xl border ${
                                    insight.severity === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-100' :
                                    insight.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-100' :
                                    'bg-blue-500/10 border-blue-500/20 text-blue-100'
                                }`}
                            >
                                <div className="font-bold text-sm mb-1">{insight.title}</div>
                                <div className="text-xs opacity-80">{insight.description}</div>
                            </motion.div>
                        ))}
                    </div>
                )}
                 
                 {/* Payment Methods */}
                 <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 shadow-lg">
                     <h3 className="font-bold text-gray-400 mb-4 flex items-center gap-2">
                         <Wallet className="h-4 w-4" /> Payment Methods
                     </h3>
                     <div className="space-y-3">
                         {paymentBreakdown.map((pm: any) => (
                             <div key={pm.name} className="flex justify-between items-center text-sm">
                                 <div className="flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full bg-gray-500" />
                                     <span>{pm.name}</span>
                                 </div>
                                 <div className="font-mono">₹{pm.amount.toLocaleString()}</div>
                             </div>
                         ))}
                     </div>
                 </div>

            </div>

            {/* Middle & Right Col: Visualizations */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Category Breakdown Table */}
                <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 shadow-lg">
                    <h3 className="font-bold text-gray-400 mb-6 flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-purple-400" />
                        Category Performance
                    </h3>
                    
                    {/* Header Row */}
                    <div className="grid grid-cols-12 text-xs text-gray-500 uppercase font-bold mb-4 px-2">
                        <div className="col-span-8">Category</div>
                        <div className="col-span-4 text-right">Spent / Limit</div>
                    </div>

                    <div className="space-y-4">
                        {categoryBreakdown.map((cat: any) => (
                            <div key={cat.id} className="p-3 bg-black/40 rounded-xl border border-white/5">
                                <div className="grid grid-cols-12 items-center mb-2">
                                    <div className="col-span-8 flex items-center gap-3">
                                        <div 
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-sm"
                                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                                        >
                                            {cat.icon || cat.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-white">{cat.name}</div>
                                            {cat.limit === 0 && <div className="text-[10px] text-gray-500">Unplanned</div>}
                                        </div>
                                    </div>
                                    <div className="col-span-4 text-right">
                                        <div className="font-mono text-sm text-white">₹{cat.spent.toLocaleString()}</div>
                                        {cat.limit > 0 && <div className="text-[10px] text-gray-500">of ₹{cat.limit.toLocaleString()}</div>}
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                {cat.limit > 0 && (
                                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden w-full">
                                        <div 
                                            className={`h-full rounded-full ${cat.isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                                        />
                                    </div>
                                )}
                                {cat.isOverBudget && <div className="text-[10px] text-red-400 mt-1 font-bold text-right">Exceeded by ₹{cat.spent - cat.limit}</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Spending Split Pie */}
                <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 shadow-lg">
                     <h3 className="font-bold text-gray-400 mb-6">Distribution</h3>
                     <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={categoryBreakdown}
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="spent"
                                    stroke="none"
                                >
                                    {categoryBreakdown.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <ReTooltip 
                                    contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
                                    itemStyle={{ color: '#fff' }} 
                                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                            </RePieChart>
                        </ResponsiveContainer>
                     </div>
                </div>

            </div>
        </div>

      </main>
    </div>
  );
}
