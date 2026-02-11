'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import NativeHeader from '@/components/dashboard/NativeHeader';
import { accountService, transactionService, categoryService } from '@/lib/localdb-services';
import { 
    ArrowLeft, TrendingUp, TrendingDown, Wallet, Calendar, 
    ArrowUpRight, ArrowDownLeft, Filter, Search 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Account, Transaction, Category } from '@/lib/db-types';
import { TransactionCard } from '@/components/TransactionCard'; // Assuming we have this, or I'll implement a list item

export default function AccountDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchAccountData();
  }, [id]);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      const acc = await accountService.getById(id as string);
      if (!acc) throw new Error('Account not found');
      
      const allTxs = await transactionService.getAll(acc.householdId); // Need to filter by account
      const accountTxs = allTxs.filter(t => t.accountId === id);
      const cats = await categoryService.getAll(acc.householdId);

      setAccount(acc);
      setTransactions(accountTxs);
      setCategories(cats);
    } catch (e) {
      console.error(e);
      // router.push('/accounts');
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    if (!account) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthTxs = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = thisMonthTxs
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = thisMonthTxs
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

    // Trend Data (Last 30 days or similar - simplified to last 6 months for chart)
    const trendMap = new Map<string, { income: number, expense: number }>();
    transactions.forEach(t => {
        const k = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        // simplified logic for checking recent
        if (!trendMap.has(k)) trendMap.set(k, { income: 0, expense: 0 });
        if (t.type === 'INCOME') trendMap.get(k)!.income += t.amount;
        else if (t.type === 'EXPENSE') trendMap.get(k)!.expense += t.amount;
    });
    
    // Sort keys and take last 7-10 data points for cleaner chart
    const trendData = Array.from(trendMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-10);

    // Expense Categories
    const catMap = new Map<string, number>();
    thisMonthTxs.filter(t => t.type === 'EXPENSE').forEach(t => {
        const cid = t.categoryId || 'uncategorized';
        catMap.set(cid, (catMap.get(cid) || 0) + t.amount);
    });

    const categoryData = Array.from(catMap.entries()).map(([cid, amount]) => {
        const cat = categories.find(c => c.id === cid);
        return {
            name: cat?.name || 'Uncategorized',
            value: amount,
            color: cat?.color || '#94a3b8'
        };
    }).sort((a,b) => b.value - a.value);

    return { income, expense, trendData, categoryData };
  }, [transactions, account, categories]);

  if (loading || !account) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32 md:pb-8">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 md:pt-8 pb-8">
        <NativeHeader title={account.name} backUrl="/accounts" />

        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    {account.name}
                    <span className="text-sm font-normal text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
                        {account.type.replace('_', ' ')}
                    </span>
                </h1>
            </div>
        </div>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Balance Card */}
            <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet className="w-24 h-24 text-white" />
                </div>
                <div className="relative z-10">
                    <p className="text-gray-400 text-sm font-medium mb-1">Total Balance</p>
                    <h2 className="text-4xl font-bold font-mono tracking-tight text-white">
                        {account.currency} {(account.balance || 0).toLocaleString()}
                    </h2>
                    <div className="mt-4 flex gap-4 text-xs font-medium text-gray-500">
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active
                        </div>
                        <div className="flex items-center gap-1">
                             Last updated today
                        </div>
                    </div>
                </div>
            </div>

            {/* Income Card */}
            <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                        <ArrowDownLeft className="w-5 h-5" />
                    </div>
                    <span className="text-gray-400 text-sm">Income (This Month)</span>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                    +{account.currency} {analytics?.income.toLocaleString()}
                </div>
            </div>

            {/* Expense Card */}
             <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <span className="text-gray-400 text-sm">Expenses (This Month)</span>
                </div>
                <div className="text-2xl font-bold font-mono text-red-400">
                    -{account.currency} {analytics?.expense.toLocaleString()}
                </div>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Trend Chart */}
            <div className="lg:col-span-2 bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 h-full">
                <h3 className="text-gray-400 text-sm font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Activity Trend
                </h3>
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics?.trendData || []}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis 
                                dataKey="date" 
                                stroke="#4b5563" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis hide />
                            <ReTooltip 
                                contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
                                itemStyle={{ color: '#fff' }} 
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                            <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                            <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Category Pie */}
            <div className="bg-[#1c1c1e] p-6 rounded-3xl border border-white/5 h-full">
                 <h3 className="text-gray-400 text-sm font-bold mb-4">Spending by Category</h3>
                 <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={analytics?.categoryData || []}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {analytics?.categoryData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <ReTooltip 
                                contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
                                itemStyle={{ color: '#fff' }} 
                                formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} iconType="circle" layout="vertical" align="right" verticalAlign="middle" />
                        </PieChart>
                    </ResponsiveContainer>
                 </div>
            </div>
        </div>

        {/* Transactions List */}
        <div>
            <h3 className="text-xl font-bold mb-4 px-2">Recent Transactions</h3>
            <div className="space-y-3">
                {transactions.length > 0 ? (
                    transactions.slice(0, 50).map((transaction) => {
                         // Resolve category manually since simpler TransactionCard usage might expect populated object
                         const cat = categories.find(c => c.id === transaction.categoryId);
                         // We can also reuse TransactionCard if it helps, but let's build a simple native row for this detail view to ensure it looks perfect
                         return (
                            <div key={transaction.id} className="bg-[#1c1c1e] p-4 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div 
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                                        style={{ backgroundColor: `${cat?.color || '#333'}20`, color: cat?.color || '#888' }}
                                    >
                                        {cat?.icon || '?'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-white">{transaction.description || cat?.name || 'Unknown'}</div>
                                        <div className="text-xs text-gray-500">{new Date(transaction.date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className={`font-mono font-bold ${transaction.type === 'INCOME' ? 'text-emerald-400' : 'text-white'}`}>
                                    {transaction.type === 'INCOME' ? '+' : '-'} {account.currency} {transaction.amount.toLocaleString()}
                                </div>
                            </div>
                         );
                    })
                ) : (
                    <div className="text-center py-12 text-gray-500">No transactions found for this account.</div>
                )}
            </div>
        </div>

      </main>
    </div>
  );
}
