'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import TransactionModal from '../../components/TransactionModal';
import { useTransactions, useAccounts } from '../../hooks/useLocalData';
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Trash2, Calendar, Search } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function TransactionsPage() {
  const { transactions, loading: txLoading, addTransaction, deleteTransaction } = useTransactions();
  const { accounts, loading: accLoading } = useAccounts();
  const loading = txLoading || accLoading;

  const accountMap = useMemo(() => {
    const map: Record<string, any> = {};
    accounts.forEach(acc => {
      map[acc.id] = acc;
    });
    return map;
  }, [accounts]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Basic filtering (can be expanded)
  const [filterType, setFilterType] = useState('ALL');

  const handleCreate = () => {
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      await addTransaction(data);
       // List updates automatically via hook
    } catch (error) {
      throw error; // Let modal handle error display
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction? This will revert the account balance.')) return;
    try {
        await deleteTransaction(id);
    } catch (error) {
        console.error('Failed to delete transaction', error);
        alert('Failed to delete transaction');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INCOME': return <ArrowDownLeft className="h-5 w-5 text-green-400" />;
      case 'EXPENSE': return <ArrowUpRight className="h-5 w-5 text-red-400" />;
      case 'TRANSFER': return <ArrowRightLeft className="h-5 w-5 text-blue-400" />;
      default: return <div className="h-5 w-5" />;
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'ALL') return true;
    return t.type === filterType;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
            <p className="text-gray-400">Track and manage your financial activity</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all font-bold shadow-lg shadow-purple-500/25"
          >
            <Plus className="h-5 w-5" />
            Add Transaction
          </button>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'].map(ft => (
                <button
                    key={ft}
                    onClick={() => setFilterType(ft)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        filterType === ft 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                    {ft}
                </button>
            ))}
        </div>

        {loading ? (
           <div className="text-center text-gray-400 py-12">Loading transactions...</div>
        ) : (
          <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700/50 overflow-hidden">
             
             {filteredTransactions.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
                        <Search className="h-6 w-6 text-gray-600" />
                    </div>
                    <p>No transactions found.</p>
                </div>
             ) : (
                <div className="divide-y divide-gray-800">
                    {filteredTransactions.map((t) => (
                        <div key={t.id} className="p-4 hover:bg-gray-800/50 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "p-3 rounded-xl",
                                    t.type === 'INCOME' && "bg-green-500/10",
                                    t.type === 'EXPENSE' && "bg-red-500/10",
                                    t.type === 'TRANSFER' && "bg-blue-500/10"
                                )}>
                                    {getIcon(t.type)}
                                </div>
                                <div>
                                    <div className="font-bold text-white mb-0.5">{t.description || 'No description'}</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(t.date), 'MMM d, yyyy')}
                                        </span>
                                        <span>•</span>
                                        <span>{accountMap[t.accountId]?.name}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className={clsx(
                                    "text-right font-mono font-bold text-lg",
                                    t.type === 'INCOME' && "text-green-400",
                                    t.type === 'EXPENSE' && "text-red-400",
                                    t.type === 'TRANSFER' && "text-blue-400"
                                )}>
                                    {t.type === 'EXPENSE' ? '-' : '+'}
                                    {accountMap[t.accountId]?.currency} {Number(t.amount).toLocaleString()}
                                </div>
                                <button
                                    onClick={() => handleDelete(t.id)}
                                    className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Delete Transaction"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
             )}
          </div>
        )}
      </main>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        accounts={accounts}
      />
    </div>
  );
}
