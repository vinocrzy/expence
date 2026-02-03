'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { budgetService, transactionService, categoryService, accountService, creditCardService, getHouseholdId } from '@/lib/localdb-services';
import { 
    ArrowLeft, PieChart, TrendingUp, AlertCircle, 
    Calendar, Wallet, CheckCircle2, AlertTriangle, ArrowUpRight 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
    PieChart as RePieChart, Pie, Cell, ResponsiveContainer, 
    Tooltip as ReTooltip, BarChart, Bar, XAxis, YAxis 
} from 'recharts';
import { Transaction, Budget, Category, Account, CreditCard, BudgetCategoryLimit } from '@/lib/db-types';

export default function BudgetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchBudgetDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchBudgetDetails = async () => {
    try {
      const budget = await budgetService.getById(id as string);
      if (!budget) throw new Error('Budget not found');

      // 0. Get Dynamic Household ID
      const householdId = await getHouseholdId();

      // 1. Determine Date Range
      const now = new Date();
      let start = new Date(now.getFullYear(), now.getMonth(), 1); 
      let end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      if (budget.startDate && budget.endDate) {
          start = new Date(budget.startDate);
          end = new Date(budget.endDate);
      }
      // Inclusive timing
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);

      // 2. Fetch Data using Dynamic ID
      const allTx = await transactionService.getAll(householdId); 
      const categories: Category[] = await categoryService.getAll(householdId);
      const accounts: Account[] = await accountService.getAll(householdId);
      const creditCards: CreditCard[] = await creditCardService.getAll(householdId);

      // 3. Filter Expenses
      const expenses = allTx.filter((t: any) => {
          if (t.type !== 'EXPENSE') return false;
          const tDate = new Date(t.date);
          return tDate >= start && tDate <= end;
      });
      const totalSpent = expenses.reduce((sum: number, t: any) => sum + t.amount, 0);

      // 4. Build Detailed Breakdown (Spent vs Limit)
      // Initialize with Configured Limits
      const breakdownMap = new Map<string, {
          id: string;
          name: string;
          color: string;
          limit: number;
          spent: number;
          transactions: Transaction[];
      }>();

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

      // Add Actuals (and handle unplanned)
      expenses.forEach((t: any) => {
          const catId = t.categoryId || 'uncategorized';
          
          if (!breakdownMap.has(catId)) {
              // Add Unplanned Category
              const cat = categories.find(c => c.id === catId);
              breakdownMap.set(catId, {
                  id: catId,
                  name: cat?.name || 'Uncategorized',
                  color: cat?.color || '#94a3b8',
                  limit: 0, // No limit set
                  spent: 0,
                  transactions: []
              });
          }

          const entry = breakdownMap.get(catId)!;
          entry.spent += t.amount;
          entry.transactions.push(t);
      });

      // 5. Calculate Projections & Formatting
      const nowTime = now.getTime();
      const startTime = start.getTime();
      const endTime = end.getTime();
      const totalDuration = endTime - startTime;
      const elapsed = Math.max(0, Math.min(nowTime - startTime, totalDuration));
      
      const progressFactor = totalDuration > 0 ? (elapsed / totalDuration) : 1; 

      const categoryBreakdown = Array.from(breakdownMap.values()).map(item => {
          // Linear Projection
          let projected = item.spent;
          if (progressFactor > 0 && progressFactor < 1 && nowTime <= endTime) {
              projected = item.spent / progressFactor;
          }

          return {
              ...item,
              projected: Math.round(projected),
              percentage: item.limit > 0 ? (item.spent / item.limit) * 100 : 0,
              isOverBudget: item.limit > 0 && item.spent > item.limit
          };
      });

      // Sort: Overbudget first, then higher spend
      categoryBreakdown.sort((a,b) => (b.spent - a.spent));

      // 6. Payment Breakdown (Existing Logic)
      const allAccountsCombined = [...accounts, ...creditCards];
      const paymentBreakdown = expenses.reduce((acc: any[], t: any) => {
           let accName = 'Unknown Account';
           if (t.accountId) {
               const foundAcc = allAccountsCombined.find((a: any) => a.id === t.accountId);
               if (foundAcc) accName = foundAcc.name || (foundAcc as any).bankName || 'Account';
           }
           const existing = acc.find((p: any) => p.name === accName);
           if (existing) existing.amount += t.amount;
           else acc.push({ name: accName, amount: t.amount });
           return acc;
      }, []);
      
      // 7. Timeline (Existing Logic)
      const timelineMap: Record<string, number> = {};
      expenses.forEach((t: any) => {
          const dateKey = new Date(t.date).toISOString().split('T')[0];
          timelineMap[dateKey] = (timelineMap[dateKey] || 0) + t.amount;
      });
      const timeline = Object.keys(timelineMap)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        .map(date => ({ date, amount: timelineMap[date] }));

      // 8. Generate Insights
      const insights = [];
      const totalBudget = Number(budget.totalBudget || 0);
      const mainProjection = (progressFactor > 0 && progressFactor < 1 && nowTime <= endTime) ? (totalSpent / progressFactor) : totalSpent;
      
      if (mainProjection > totalBudget && totalBudget > 0) {
          insights.push({
              title: 'Projected Over Budget',
              description: `Based on current spending, you might end up spending ₹${Math.round(mainProjection).toLocaleString()}, exceeding your budget by ₹${Math.round(mainProjection - totalBudget).toLocaleString()}.`,
              severity: 'warning'
          });
      }
      
      categoryBreakdown.filter(c => c.isOverBudget).forEach(c => {
           insights.push({
               title: `${c.name} Over Limit`,
               description: `You have exceeded the set limit for ${c.name} by ₹${(c.spent - c.limit).toLocaleString()}.`,
               severity: 'error'
           });
      });

      setData({ 
          budget, 
          analytics: {
              totalSpent,
              categoryBreakdown,
              timeline, 
              paymentBreakdown,
              insights,
              daysLeft: Math.ceil((endTime - nowTime) / (1000 * 60 * 60 * 24))
          } 
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading breakdown...</div>;
  if (!data) return null;

  const { budget, analytics } = data;
  const { categoryBreakdown, timeline, paymentBreakdown, insights } = analytics;

  const totalSpent = analytics.totalSpent;
  const budgetLimit = Number(budget.totalBudget || 0);
  const percentUsed = Math.min((totalSpent / budgetLimit || 0) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans pb-24">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
                <h1 className="text-3xl font-bold">{budget.name}</h1>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Cost Breakdown & Projections</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Overview & Insights */}
            <div className="space-y-6">
                {/* Main Card */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50">
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
                    
                    <div className="h-4 bg-gray-700 rounded-full overflow-hidden mb-2">
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
                        <h3 className="font-bold text-gray-400 flex items-center gap-2">
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
                 <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50">
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
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50">
                    <h3 className="font-bold text-gray-400 mb-6 flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-purple-400" />
                        Category Performance
                    </h3>
                    
                    {/* Header Row */}
                    <div className="grid grid-cols-12 text-xs text-gray-500 uppercase font-bold mb-4 px-2">
                        <div className="col-span-5">Category</div>
                        <div className="col-span-3 text-right">Spent / Limit</div>
                        <div className="col-span-4 text-right">Projection</div>
                    </div>

                    <div className="space-y-4">
                        {categoryBreakdown.map((cat: any) => (
                            <div key={cat.id} className="p-3 bg-gray-900/50 rounded-xl border border-gray-800/50">
                                <div className="grid grid-cols-12 items-center mb-2">
                                    <div className="col-span-5 flex items-center gap-3">
                                        <div 
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                                        >
                                            {cat.icon || cat.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">{cat.name}</div>
                                            {cat.limit === 0 && <div className="text-[10px] text-gray-500">Unplanned</div>}
                                        </div>
                                    </div>
                                    <div className="col-span-3 text-right">
                                        <div className="font-mono text-sm">₹{cat.spent.toLocaleString()}</div>
                                        {cat.limit > 0 && <div className="text-[10px] text-gray-500">of ₹{cat.limit.toLocaleString()}</div>}
                                    </div>
                                    <div className="col-span-4 text-right">
                                        <div className="font-mono text-sm text-gray-300">₹{cat.projected.toLocaleString()}</div>
                                        <div className="text-[10px] text-gray-500">Est. Month End</div>
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                {cat.limit > 0 && (
                                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden w-full">
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
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50">
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
                                >
                                    {categoryBreakdown.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <ReTooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
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
