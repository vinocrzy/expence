'use client';

import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { useSharedView } from '@/hooks/useSharedView';
import { ArrowLeft, Wallet, Receipt, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function SharedDashboardPage() {
  const { transactions, accounts, loading, refresh } = useSharedView();
  const [householdId, setHouseholdId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('All');

  useEffect(() => {
      if (typeof window !== 'undefined') {
          setHouseholdId(localStorage.getItem('joined_household_id') || '');
      }
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  
  // Get unique users from transactions for the filter
  const uniqueUsers = Array.from(new Set(transactions.map(t => t.user))).filter(Boolean);
  
  // Filter transactions
  const filteredTransactions = selectedUser === 'All' 
    ? transactions 
    : transactions.filter(t => t.user === selectedUser);

  // Calculate stats for filtered view
  const income = filteredTransactions
    .filter(t => t.type === 'income' || t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const expense = filteredTransactions
    .filter(t => t.type === 'expense' || t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
            <Link href="/household" className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Settings
            </Link>
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Household Overview</h1>
                    <p className="text-gray-400 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Live Shared View
                    </p>
                </div>
            </div>
        </div>

        {loading ? (
             <div className="text-center text-gray-400 py-12">Loading household data...</div>
        ) : (
            <div className="space-y-8">
                
                {/* User Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSelectedUser('All')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                            selectedUser === 'All' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        All Members
                    </button>
                    {uniqueUsers.map(user => (
                        <button
                            key={user}
                            onClick={() => setSelectedUser(user)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                                selectedUser === user 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {user}
                        </button>
                    ))}
                </div>

                {/* Filtered Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50">
                        <p className="text-gray-400 text-sm mb-1">Income</p>
                        <p className="text-2xl font-bold text-green-400">+₹{income.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50">
                        <p className="text-gray-400 text-sm mb-1">Expense</p>
                        <p className="text-2xl font-bold text-red-400">-₹{expense.toLocaleString()}</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* Balances - Always Show All for Context */}
                     <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <Wallet className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-bold text-white">All Balances</h3>
                        </div>
                        <div className="space-y-3">
                            {accounts.length === 0 && <p className="text-gray-500 text-sm">No accounts shared.</p>}
                            {accounts.map(acc => (
                                <div key={acc.id} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-xl">
                                    <span className="text-gray-300 font-medium">{acc.name}</span>
                                    <span className={`font-mono font-bold ${acc.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {acc.currency} {acc.balance.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                            {accounts.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                                    <span className="text-gray-400">Total Net Worth</span>
                                    <span className="text-xl font-bold text-white">
                                        ₹ {totalBalance.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                     </div>

                     {/* Recent Transactions */}
                     <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                <Receipt className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredTransactions.length === 0 && <p className="text-gray-500 text-sm">No transactions found.</p>}
                            {filteredTransactions.map(tx => (
                                <div key={tx.id} className="p-3 bg-gray-900/50 rounded-xl hover:bg-gray-900 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-white truncate max-w-[150px]">{tx.categoryName}</span>
                                        <span className={`font-mono font-bold ${['expense', 'EXPENSE'].includes(tx.type) ? 'text-red-400' : 'text-green-400'}`}>
                                            {['expense', 'EXPENSE'].includes(tx.type) ? '-' : '+'} {tx.amount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end text-xs text-gray-500">
                                        <span>{tx.description || 'No description'}</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(tx.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex justify-between items-center">
                                        <div className="text-xs text-blue-400">
                                            {tx.accountName}
                                        </div>
                                        <div className={`text-[10px] px-2 py-0.5 rounded-full ${
                                            tx.user === 'Shared' ? 'bg-gray-700 text-gray-300' : 'bg-purple-900/40 text-purple-300'
                                        }`}>
                                            {tx.user}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
