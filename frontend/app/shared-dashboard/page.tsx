'use client';

import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { useSharedView } from '@/hooks/useSharedView';
import { ArrowLeft, Wallet, Receipt, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function SharedDashboardPage() {
  const { transactions, accounts, loading, refresh } = useSharedView();
  const [householdId, setHouseholdId] = useState<string>('');

  useEffect(() => {
      if (typeof window !== 'undefined') {
          setHouseholdId(localStorage.getItem('joined_household_id') || '');
      }
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  // Calculate total expense or income from shared transactions if needed, strictly display what's there.

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
            <h1 className="text-3xl font-bold text-white mb-2">Shared Household View</h1>
            <p className="text-gray-400 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Viewing Snapshot: {householdId || 'Unknown'}
            </p>
        </div>

        {loading ? (
             <div className="text-center text-gray-400 py-12">Loading shared data...</div>
        ) : (
            <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* Balances */}
                     <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <Wallet className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Current Balances</h3>
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
                                    <span className="text-gray-400">Total</span>
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
                            <h3 className="text-lg font-bold text-white">Month Transactions</h3>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {transactions.length === 0 && <p className="text-gray-500 text-sm">No transactions this month.</p>}
                            {transactions.map(tx => (
                                <div key={tx.id} className="p-3 bg-gray-900/50 rounded-xl hover:bg-gray-900 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-white truncate max-w-[150px]">{tx.categoryName}</span>
                                        <span className={`font-mono font-bold ${tx.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                                            {tx.type === 'expense' ? '-' : '+'} {tx.amount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end text-xs text-gray-500">
                                        <span>{tx.description || 'No description'}</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(tx.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-blue-400">
                                        By {tx.user} • {tx.accountName}
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                </div>

                <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-700/30 text-center">
                    <p className="text-blue-200 text-sm">
                        This is a read-only snapshot of the shared household's current month. 
                        Historical data is not accessible.
                    </p>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
