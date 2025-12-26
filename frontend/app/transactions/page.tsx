'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import TransactionModal from '../../components/TransactionModal';
import { useTransactions, useAccounts } from '../../hooks/useOfflineData';
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Trash2, Calendar, Search } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function TransactionsPage() {
  const { transactions, loading: txLoading, addTransaction, deleteTransaction } = useTransactions();
  const { accounts, loading: accLoading } = useAccounts();
  const loading = txLoading || accLoading;
  
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
    <div className="min-h-screen text-white font-sans selection:bg-[var(--color-gold-500)] selection:text-black">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
            <p className="text-gray-400">Track and manage your financial activity</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-black bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 transition-all font-bold shadow-lg shadow-yellow-900/25"
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
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap border ${
                        filterType === ft 
                        ? 'bg-[var(--color-gold-500)] text-black border-[var(--color-gold-500)]' 
                        : 'bg-[var(--color-wine-surface)] text-[var(--color-text-muted)] border-[var(--color-border-gold)] hover:bg-white/10 hover:text-white'
                    }`}
                >
                    {ft}
                </button>
            ))}
        </div>

        {loading ? (
           <div className="text-center text-[var(--color-text-muted)] py-12">Loading transactions...</div>
        ) : (
          <div className="bg-[var(--color-wine-surface)] backdrop-blur-md rounded-2xl border border-[var(--color-border-gold)] overflow-hidden shadow-lg">
             
             {filteredTransactions.length === 0 ? (
                <div className="p-12 text-center text-[var(--color-text-muted)]">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                        <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <p>No transactions found.</p>
                </div>
             ) : (
                <div className="divide-y divide-[var(--color-border-gold)]">
                    {filteredTransactions.map((t) => (
                        <div key={t.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "p-3 rounded-xl",
                                    t.type === 'INCOME' && "bg-green-500/10 text-green-500",
                                    t.type === 'EXPENSE' && "bg-red-500/10 text-red-500",
                                    t.type === 'TRANSFER' && "bg-blue-500/10 text-blue-500"
                                )}>
                                    {getIcon(t.type)}
                                </div>
                                <div>
                                    <div className="font-bold text-white mb-0.5">{t.description || 'No description'}</div>
                                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(t.date), 'MMM d, yyyy')}
                                        </span>
                                        <span>•</span>
                                        <span>{t.account?.name}</span>
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
                                    {t.account?.currency} {Number(t.amount).toLocaleString()}
                                </div>
                                <button
                                    onClick={() => handleDelete(t.id)}
                                    className="p-2 text-[var(--color-text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
