'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import NativeHeader from '../../components/dashboard/NativeHeader';
import TransactionModal from '../../components/TransactionModal';
import CalendarView from '../../components/CalendarView';
import DayDetailsModal from '../../components/DayDetailsModal';
import TransactionList from '../../components/TransactionList';
import QuickEditModal from '../../components/QuickEditModal';
import { useTransactions, useAccounts, useCreditCards, useCategories } from '../../hooks/useLocalData';
import { Plus, List, LayoutGrid, Check, ChevronDown, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function TransactionsPage() {
  const { transactions, loading: txLoading, addTransaction, deleteTransaction, updateTransaction } = useTransactions();
  const { accounts, loading: accLoading } = useAccounts();
  const { creditCards, loading: ccLoading } = useCreditCards();
  const { categories } = useCategories();
  const loading = txLoading || accLoading || ccLoading;

  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  
  // Calendar Details State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);

  // Quick Edit State
  const [quickEditTransaction, setQuickEditTransaction] = useState<any>(null);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);

  // Filter UI State
  const [showFilters, setShowFilters] = useState(false);

  const allAccounts = useMemo(() => {
      const ccs = creditCards.map(c => ({
          id: c.id,
          name: c.name || c.bankName || 'Credit Card',
          currency: 'INR',
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
  
  // Data Filtering
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterAccounts, setFilterAccounts] = useState<string[]>([]);

  const handleCreate = (date?: Date) => {
    setEditingTransaction(date ? { date: date.toISOString() } : null);
    setIsModalOpen(true);
  };

  const handleEdit = (t: any) => {
      setEditingTransaction(t);
      setIsModalOpen(true);
      setIsDayDetailsOpen(false);
  };

  const handleModalSubmit = async (data: any) => {
      if (editingTransaction?.id) {
          await updateTransaction(editingTransaction.id, data);
      } else {
          await addTransaction(data);
      }
      setEditingTransaction(null);
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

  const filteredTransactions = transactions.filter(t => {
    const typeMatch = filterType === 'ALL' || t.type === filterType;
    const catMatch = filterCategories.length === 0 || (t.categoryId && filterCategories.includes(t.categoryId));
    const accMatch = filterAccounts.length === 0 || filterAccounts.includes(t.accountId);
    return typeMatch && catMatch && accMatch;
  });

  const toggleCategory = (catId: string) => {
      setFilterCategories(prev => 
          prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
      );
  };

  const toggleAccount = (accId: string) => {
      setFilterAccounts(prev => 
          prev.includes(accId) ? prev.filter(id => id !== accId) : [...prev, accId]
      );
  };

  const handleDateSelect = (date: Date) => {
      setSelectedDate(date);
      setIsDayDetailsOpen(true);
  };

  const handleQuickEdit = (t: any) => {
      setQuickEditTransaction(t);
      setIsQuickEditOpen(true);
  };

  const selectedDayTransactions = useMemo(() => {
      if (!selectedDate) return [];
      return filteredTransactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate.getDate() === selectedDate.getDate() &&
                 tDate.getMonth() === selectedDate.getMonth() &&
                 tDate.getFullYear() === selectedDate.getFullYear();
      });
  }, [selectedDate, filteredTransactions]);

  const activeFilterCount = (filterCategories.length > 0 ? 1 : 0) + (filterAccounts.length > 0 ? 1 : 0);

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 md:pt-4 pb-4">        

        <NativeHeader title="Transactions" />
        
        {/* Header & Controls */}
        <div className="flex items-center justify-between mb-6 sticky top-0 z-20 py-2 bg-black/80 backdrop-blur-xl">
           <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 hidden md:block">
               Transactions
           </h1>
           <div className="flex bg-gray-900 rounded-xl p-1 border border-gray-800">
               <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500'}`}>
                   <List className="w-5 h-5" />
               </button>
               <button onClick={() => setViewMode('CALENDAR')} className={`p-2 rounded-lg transition-all ${viewMode === 'CALENDAR' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500'}`}>
                   <LayoutGrid className="w-5 h-5" />
               </button>
           </div>
        </div>

        {/* Native Horizontal Scroll Filters */}
        <div className="mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide py-1 flex items-center gap-3">
             <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors border",
                    showFilters || activeFilterCount > 0 
                        ? "bg-purple-600 border-purple-500 text-white" 
                        : "bg-gray-900 border-gray-800 text-gray-500"
                )}
             >
                 {activeFilterCount > 0 ? (
                     <span className="text-xs font-bold">{activeFilterCount}</span>
                 ) : (
                     <SlidersHorizontal className="w-5 h-5" />
                 )}
             </button>

             <div className="h-8 w-[1px] bg-gray-800 mx-1 flex-shrink-0" />

             {['ALL', 'EXPENSE', 'INCOME', 'TRANSFER'].map(type => (
                 <button
                    key={type}
                    onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(5);
                        setFilterType(type);
                    }}
                    className={clsx(
                        "flex-shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all border",
                        filterType === type 
                            ? "bg-white text-black border-white"
                            : "bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700"
                    )}
                 >
                     {type}
                 </button>
             ))}
        </div>

        {/* Expanded Filters Drawer */}
        <AnimatePresence>
            {showFilters && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-6"
                >
                    <div className="bg-[#18181b] rounded-3xl p-5 border border-white/5 space-y-4">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Accounts</span>
                            <div className="flex flex-wrap gap-2">
                                {allAccounts.map(acc => (
                                    <button
                                        key={acc.id}
                                        onClick={() => toggleAccount(acc.id)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                                            filterAccounts.includes(acc.id)
                                                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                                                : "bg-gray-800 border-gray-700 text-gray-400"
                                        )}
                                    >
                                        {acc.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Categories</span>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => toggleCategory(cat.id)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                                            filterCategories.includes(cat.id)
                                                ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                                                : "bg-gray-800 border-gray-700 text-gray-400"
                                        )}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {loading ? (
           <div className="flex justify-center p-12">
               <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
           </div>
        ) : (
           <>
              {viewMode === 'LIST' ? (
                <TransactionList 
                    transactions={filteredTransactions}
                    accountMap={accountMap}
                    categories={categories}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onQuickEdit={handleQuickEdit}
                />
              ) : (
                <div className="h-[600px]">
                    <CalendarView 
                        transactions={filteredTransactions}
                        currentMonth={currentMonth}
                        onMonthChange={setCurrentMonth}
                        onDaySelect={handleDateSelect}
                    />
                </div>
              )}
           </>
        )}
      </main>

      <div className="fixed bottom-32 right-4 z-50 md:hidden">
          <button
            onClick={() => handleCreate()}
            className="w-14 h-14 bg-white text-black rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
          >
              <Plus className="w-7 h-7" />
          </button>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
        }}
        onSubmit={handleModalSubmit}
        accounts={allAccounts}
        initialData={editingTransaction}
      />

      <DayDetailsModal 
        isOpen={isDayDetailsOpen}
        onClose={() => setIsDayDetailsOpen(false)}
        date={selectedDate}
        transactions={selectedDayTransactions}
        accountMap={accountMap}
        categories={categories}
        onDeleteTransaction={handleDelete}
        onEditTransaction={handleEdit}
        onAddTransaction={() => {
            setIsDayDetailsOpen(false);
            if (selectedDate) handleCreate(selectedDate);
            else handleCreate();
        }}
      />
      
      <QuickEditModal
        isOpen={isQuickEditOpen}
        onClose={() => {
            setIsQuickEditOpen(false);
            setQuickEditTransaction(null);
        }}
        transaction={quickEditTransaction}
        categories={categories}
        accounts={allAccounts}
        onSuccess={() => {
             setIsQuickEditOpen(false);
             setQuickEditTransaction(null);
        }}
        onEditFully={(t) => {
            setIsQuickEditOpen(false);
            setQuickEditTransaction(null);
            handleEdit(t);
        }}
      />
    </div>
  );
}
