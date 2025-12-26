'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
// import api from '../../lib/api'; // Removed direct API usage for analytics
import { useAuth } from '../../context/AuthContext';
import { useAccounts } from '../../hooks/useOfflineData';
import { useAnalytics } from '../../hooks/useAnalytics';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { accounts, loading: accLoading } = useAccounts();
  const { monthly, categories, loading: analyticsLoading } = useAnalytics();
  
  const loading = authLoading || accLoading || analyticsLoading;

  // Derive total balance from accounts
  const totalBalance = accounts?.reduce((acc: any, curr: any) => acc + Number(curr.balance), 0) || 0;
  const formattedBalance = totalBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  
  // Prepare data object for existing render logic
  const data = {
      accounts: accounts || [],
      monthly: monthly || [],
      categories: categories || [],
      context: { description: 'This Month' }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  if (loading) {
// ...
  }
// ...
// ... existing render logic uses 'data' and 'totalBalance' which are now derived above

  return (
    <div className="min-h-screen text-white font-sans selection:bg-purple-500 selection:text-white">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)]">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-[var(--color-text-muted)] mt-2">Here's your financial overview.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[var(--color-wine-surface)] p-6 rounded-2xl border border-[var(--color-border-gold)] shadow-lg backdrop-blur-sm">
            <h3 className="text-[var(--color-text-muted)] text-sm font-medium mb-2">Total Net Worth</h3>
            <div className="text-3xl font-bold text-white">{formattedBalance}</div>
          </div>
          <div className="bg-[var(--color-wine-surface)] p-6 rounded-2xl border border-[var(--color-border-gold)] shadow-lg backdrop-blur-sm">
             <h3 className="text-[var(--color-text-muted)] text-sm font-medium mb-2">Accounts</h3>
             <div className="text-3xl font-bold text-white">{data.accounts.length}</div>
          </div>
          <div className="bg-[var(--color-wine-surface)] p-6 rounded-2xl border border-[var(--color-border-gold)] shadow-lg backdrop-blur-sm">
             <h3 className="text-[var(--color-text-muted)] text-sm font-medium mb-2">Monthly Spending</h3>
             <div className="text-3xl font-bold text-red-400">
               {data.monthly.length > 0 ? Number(data.monthly[data.monthly.length - 1].expense).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '₹0.00'}
             </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Income vs Expense Chart */}
            <div className="bg-[var(--color-wine-surface)] p-6 rounded-2xl border border-[var(--color-border-gold)] shadow-lg backdrop-blur-sm">
                <h3 className="text-lg font-bold text-white mb-6">Income vs Expense (6 Months)</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.monthly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#8884d8" opacity={0.2} />
                            <XAxis dataKey="month" stroke="#E6B34B" />
                            <YAxis stroke="#E6B34B" />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#4A0E1C', border: '1px solid rgba(230, 179, 75, 0.2)', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#E6E6E6' }}
                                cursor={{fill: 'rgba(230, 179, 75, 0.05)'}}
                            />
                            <Legend />
                            <Bar dataKey="income" name="Income" fill="#E6B34B" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Expense" fill="#991B1B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Expense Categories Pie Chart */}
            <div className="bg-[var(--color-wine-surface)] p-6 rounded-2xl border border-[var(--color-border-gold)] shadow-lg backdrop-blur-sm">
                <h3 className="text-lg font-bold text-white mb-6">Expense Breakdown ({data.context?.description || 'This Month'})</h3>
                <div className="h-64 w-full">
                    {data.categories.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
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
                                    stroke="none"
                                >
                                    {data.categories.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || '#808080'} stroke="rgba(0,0,0,0.2)" />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#4A0E1C', border: '1px solid rgba(230, 179, 75, 0.2)', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#E6E6E6' }}
                                />
                                <Legend wrapperStyle={{ color: '#E6B34B' }} />
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
