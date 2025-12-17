'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ accounts: [], monthly: [], categories: [], context: null });

  useEffect(() => {
    if (!authLoading) {
      if (user) fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      const [acc, mon, cat] = await Promise.all([
        api.get('/accounts'),
        api.get('/analytics/monthly'),
        api.get('/analytics/categories')
      ]);
      setData({ 
        accounts: acc.data, 
        monthly: mon.data, 
        categories: cat.data.data || cat.data, // Fallback if API rollback
        context: cat.data.context
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  const totalBalance = data.accounts.reduce((acc: any, curr: any) => acc + Number(curr.balance), 0);
  const formattedBalance = totalBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-400 mt-2">Here's your financial overview.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Net Worth</h3>
            <div className="text-3xl font-bold text-white">{formattedBalance}</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
             <h3 className="text-gray-400 text-sm font-medium mb-2">Accounts</h3>
             <div className="text-3xl font-bold text-white">{data.accounts.length}</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
             <h3 className="text-gray-400 text-sm font-medium mb-2">Monthly Spending</h3>
             <div className="text-3xl font-bold text-red-400">
               {data.monthly.length > 0 ? Number(data.monthly[data.monthly.length - 1].expense).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '₹0.00'}
             </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Income vs Expense Chart */}
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-6">Income vs Expense (6 Months)</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.monthly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="month" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: '#E5E7EB' }}
                            />
                            <Legend />
                            <Bar dataKey="income" name="Income" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Expense Categories Pie Chart */}
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-6">Expense Breakdown ({data.context?.description || 'This Month'})</h3>
                <div className="h-64 w-full">
                    {data.categories.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-gray-500">
                            No expenses this month
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.categories}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.categories.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || '#808080'} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: '#E5E7EB' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}
