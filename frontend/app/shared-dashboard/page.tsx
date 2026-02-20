'use client';

import { useEffect, useState, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import { useSharedView } from '@/hooks/useSharedView';
import { ArrowLeft, Wallet, Receipt, Users } from 'lucide-react';
import Link from 'next/link';
import TransactionCard from '@/components/TransactionCard';
import { Category } from '@/lib/db-types';

export default function SharedDashboardPage() {
  const { transactions, accounts, loading } = useSharedView();
  const [selectedUser, setSelectedUser] = useState<string>('All');

  const formattedTransactions = useMemo(() => {
      // Convert shared transactions to match standard Transaction type for the card
      return transactions.map(t => ({
          ...t,
          categoryId: t.categoryId || 'unknown',
          // Mock category object if needed by card, or ensure card handles missing category gracefully
          // In SharedView we have categoryName, let's map it.
      }));
  }, [transactions]);

  // Unique users from transactions
  const uniqueUsers = Array.from(new Set(transactions.map(t => t.user))).filter(Boolean);
  
  // Filter transactions
  const filteredTransactions = selectedUser === 'All' 
    ? formattedTransactions 
    : formattedTransactions.filter(t => t.user === selectedUser);

  // Income/Expense stats
  const income = filteredTransactions
    .filter(t => t.type === 'income' || t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const expense = filteredTransactions
    .filter(t => t.type === 'expense' || t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  // Helper Maps for TransactionCard (Since we don't have full local DB access to categories/accounts in guest mode easily, we mock or allow partials)
  // Shared view hooks should ideally provide these maps. For now we pass minimal needed.
  const accountMap = {}; // Not strictly needed if we just display accountName in card? 
  // TransactionCard expects accountMap to find currency etc.
  // We might need to adjust TransactionCard to handle "shared view" mode or pass raw strings.
  // Actually, let's just create a dummy map from the shared accounts list.
  const sharedAccountMap = useMemo(() => {
      const map: any = {};
      accounts.forEach(acc => map[acc.id] = acc);
      return map;
  }, [accounts]);
  
  // Dummy category map
  const categoryMap: any = {}; // TransactionCard will use categoryId to lookup.
  
  // We need to pass categories array to TransactionCard ?? No, it takes categories prop.
  // We will construct dummy categories from the transaction data itself so colors/icons work if possible, 
  // or just pass empty and let it fallback.

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-24">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
            <div>
                 <Link href="/household" className="text-gray-500 text-sm flex items-center gap-1 hover:text-white mb-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                 </Link>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                    Shared Dashboard
                </h1>
                <p className="text-gray-400 text-sm flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live Guest View
                </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-2xl">
                <Users className="w-6 h-6 text-blue-400" />
            </div>
        </div>

        {loading ? (
             <div className="space-y-4">
                 <div className="h-40 bg-gray-900 rounded-3xl animate-pulse" />
             </div>
        ) : (
            <div className="space-y-8">
                
                {/* User Filter Pills */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setSelectedUser('All')}
                        className={`px-5 py-2 rounded-full text-sm font-bold transition-all border ${
                            selectedUser === 'All' 
                            ? 'bg-white text-black border-white' 
                            : 'bg-gray-900 text-gray-500 border-gray-800'
                        }`}
                    >
                        All
                    </button>
                    {uniqueUsers.map(user => (
                        <button
                            key={user}
                            onClick={() => setSelectedUser(user)}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all border ${
                                selectedUser === user 
                                ? 'bg-white text-black border-white' 
                                : 'bg-gray-900 text-gray-500 border-gray-800'
                            }`}
                        >
                            {user}
                        </button>
                    ))}
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1c1c1e] p-5 rounded-3xl border border-white/5">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Income</p>
                        <p className="text-2xl font-bold text-green-400">+₹{income.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#1c1c1e] p-5 rounded-3xl border border-white/5">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Expense</p>
                        <p className="text-2xl font-bold text-red-400">-₹{expense.toLocaleString()}</p>
                    </div>
                </div>

                {/* Account Balances */}
                <div className="bg-[#1c1c1e] rounded-3xl p-6 border border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Balances</h3>
                    </div>
                    <div className="space-y-3">
                        {accounts.map(acc => (
                            <div key={acc.id} className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-white/5">
                                <span className="text-gray-300 font-medium">{acc.name}</span>
                                <span className={`font-mono font-bold ${acc.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {acc.currency} {acc.balance.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Transactions List */}
                <div>
                     <h3 className="text-lg font-bold text-white mb-4 px-2">Transactions</h3>
                     
                     {filteredTransactions.length === 0 ? (
                         <div className="text-center py-12 text-gray-500 bg-[#1c1c1e] rounded-3xl border border-dashed border-gray-800">
                             No transactions found for this selection.
                         </div>
                     ) : (
                         <div className="space-y-3">
                             {filteredTransactions.map(transaction => (
                                 <TransactionCard 
                                    key={transaction.id}
                                    transaction={transaction as any} // Cast because shared types might be slightly different
                                    accountMap={sharedAccountMap}
                                    categories={[]} // We don't have categories in guest mode easily, card will fallback to generic icon
                                    onDelete={() => {}} // Read only
                                    onEdit={() => {}} // Read only
                                 />
                             ))}
                         </div>
                     )}
                </div>

            </div>
        )}
      </main>
    </div>
  );
}
