'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import TransactionModal from '../../components/TransactionModal';
import { useTransactions, useAccounts, useCreditCards, useCategories } from '../../hooks/useLocalData';

import { Plus, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Trash2, Calendar, Search, Filter, Check, ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function TransactionsPage() {
  const { transactions, loading: txLoading, addTransaction, deleteTransaction } = useTransactions();
  const { accounts, loading: accLoading } = useAccounts();
  const { creditCards, loading: ccLoading } = useCreditCards();
  const { categories } = useCategories();
  const loading = txLoading || accLoading || ccLoading;

  const allAccounts = useMemo(() => {
      const ccs = creditCards.map(c => ({
          id: c.id,
          name: c.name || c.bankName || 'Credit Card',
          currency: 'INR', // Default/Fallback
          type: 'CREDIT_CARD'
      }));
      return [...accounts, ...ccs];
  }, [accounts, creditCards]);


  const accountMap = useMemo(() => {
    const map: Record<string, any> = {};
    allAccounts.forEach(acc => {
      map[acc.id] = acc;
    });
    return map;
  }, [allAccounts]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Basic filtering (can be expanded)
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategories, setFilterCategories] = useState<string[]>([]); // Empty array means ALL
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

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
    const typeMatch = filterType === 'ALL' || t.type === filterType;
    const catMatch = filterCategories.length === 0 || (t.categoryId && filterCategories.includes(t.categoryId));
    return typeMatch && catMatch;
  });

  const toggleCategory = (catId: string) => {
      setFilterCategories(prev => 
          prev.includes(catId)
              ? prev.filter(id => id !== catId)
              : [...prev, catId]
      );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 pb-32 md:pb-8">
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

        <div className="flex flex-col md:flex-row gap-4 mb-6">
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
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

            <div className="relative min-w-[240px]">
                <button
                    onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                    className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:border-purple-500 flex items-center justify-between"
                >
                    <div className="flex items-center gap-2 truncate">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <span className="truncate">
                            {filterCategories.length === 0 
                                ? 'All Categories' 
                                : `${filterCategories.length} Selected`}
                        </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>

                {isCatDropdownOpen && (
                    <>
                        <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setIsCatDropdownOpen(false)}
                        />
                        <div className="absolute top-full mt-2 left-0 right-0 max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 p-2 space-y-1">
                            <button
                                onClick={() => setFilterCategories([])}
                                className={clsx(
                                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between",
                                    filterCategories.length === 0 ? "bg-purple-500 text-white" : "text-gray-300 hover:bg-gray-700"
                                )}
                            >
                                <span>All Categories</span>
                                {filterCategories.length === 0 && <Check className="h-4 w-4" />}
                            </button>
                            {categories.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => toggleCategory(c.id)}
                                    className={clsx(
                                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between",
                                        filterCategories.includes(c.id) ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
                                    )}
                                >
                                    <span>{c.name}</span>
                                    {filterCategories.includes(c.id) && <Check className="h-4 w-4 text-purple-400" />}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
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

                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-white mb-0.5 text-sm md:text-base line-clamp-1 break-all">{t.description || 'No description'}</div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 mt-0.5">
                                        <span className="flex items-center gap-1 shrink-0">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(t.date), 'MMM d, yyyy')}
                                        </span>
                                        <span className="hidden xs:inline text-gray-600">•</span>
                                        <span className="truncate max-w-[140px] xs:max-w-none">{accountMap[t.accountId]?.name}</span>
                                        <span className="hidden xs:inline text-gray-600">•</span>
                                        <span className="truncate text-purple-400">
                                            {categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 md:gap-6">
                                <div className={clsx(
                                    "text-right font-mono font-bold text-base md:text-lg",
                                    t.type === 'INCOME' && "text-green-400",
                                    t.type === 'EXPENSE' && "text-red-400",
                                    t.type === 'TRANSFER' && "text-blue-400"
                                )}>
                                    {t.type === 'EXPENSE' ? '-' : '+'}
                                    {accountMap[t.accountId]?.currency} {Number(t.amount).toLocaleString()}
                                </div>
                                <button
                                    onClick={() => handleDelete(t.id)}
                                    className="p-2 text-gray-500 hover:text-red-400 transition-all active:scale-95"
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
        accounts={allAccounts}
      />
    </div>
  );
}
