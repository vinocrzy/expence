'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import api from '../../../lib/api';
import { 
    ArrowLeft, PieChart, TrendingUp, AlertCircle, 
    Calendar, Wallet, CheckCircle2, AlertTriangle, ArrowUpRight 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
    PieChart as RePieChart, Pie, Cell, ResponsiveContainer, 
    Tooltip as ReTooltip, BarChart, Bar, XAxis, YAxis 
} from 'recharts';

export default function BudgetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchBudgetDetails();
  }, [id]);

  const fetchBudgetDetails = async () => {
    try {
      const res = await api.get(`/budgets/${id}/breakdown`);
      setData(res.data);
    } catch (e) {
      console.error(e);
      // router.push('/budgets');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading breakdown...</div>;
  if (!data) return null;

  const { budget, analytics } = data;
  const { categoryBreakdown, timeline, paymentBreakdown, insights } = analytics;

  const totalSpent = analytics.totalSpent;
  const budgetLimit = Number(budget.amount);
  const percentUsed = Math.min((totalSpent / budgetLimit) * 100, 100);

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
                <p className="text-gray-400 text-sm">Trip Cost Breakdown</p>
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
                             <span className="text-gray-400 text-xs">Budget</span>
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
                        <span>₹{(budgetLimit - totalSpent).toLocaleString()} Remaining</span>
                    </div>
                </div>

                {/* Insights List */}
                {insights.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-400 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-400" />
                            Smart Insights
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
                
                {/* Category Breakdown Chart */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50">
                    <h3 className="font-bold text-gray-400 mb-6 flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-purple-400" />
                        Category Split
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={categoryBreakdown}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="amount"
                                    >
                                        {categoryBreakdown.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <ReTooltip 
                                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                        formatter={(value: number) => [`₹${value}`, 'Spend']}
                                    />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                             {categoryBreakdown.map((cat: any) => (
                                 <div key={cat.name} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
                                     <div className="flex items-center gap-3">
                                         <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: cat.color }} />
                                         <span className="font-medium">{cat.name}</span>
                                     </div>
                                     <div className="text-right">
                                         <div className="font-bold font-mono text-sm">₹{cat.amount.toLocaleString()}</div>
                                         <div className="text-xs text-gray-500">{Math.round(cat.percentage)}%</div>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>

                {/* Timeline Chart */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50">
                    <h3 className="font-bold text-gray-400 mb-6 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-400" />
                        Spending Timeline
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                    stroke="#4B5563"
                                    fontSize={12}
                                />
                                <YAxis stroke="#4B5563" fontSize={12} />
                                <ReTooltip
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                                    formatter={(value: number) => [`₹${value}`, 'Spent']}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                />
                                <Bar dataKey="amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Transaction List Link (or embedded if preferred, keeping as link for now) */}
                <div className="flex justify-end">
                    <button className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                        View Full Transaction History <ArrowUpRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}
