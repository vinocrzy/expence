'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import TransactionModal from '../../components/TransactionModal';
import CalendarView from '../../components/CalendarView';
import DayDetailsModal from '../../components/DayDetailsModal';
import TransactionList from '../../components/TransactionList';
import QuickEditModal from '../../components/QuickEditModal';
import { useTransactions, useAccounts, useCreditCards, useCategories } from '../../hooks/useLocalData';

import { Plus, Filter, Check, ChevronDown, List, LayoutGrid, SlidersHorizontal, X } from 'lucide-react';
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
  
  
  // Data Filtering
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategories, setFilterCategories] = useState<string[]>([]); // Empty array means ALL
  const [filterAccounts, setFilterAccounts] = useState<string[]>([]); // Empty array means ALL
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [isAccDropdownOpen, setIsAccDropdownOpen] = useState(false);

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

  // transactions for the selected day
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
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 pb-32 md:pb-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Transactions</h1>
            <p className="hidden md:block text-gray-400">Track and manage your financial activity</p>
          </div>
          
          <div className="flex items-center gap-3">
             {/* View Toggle */}
             <div className="bg-gray-800 p-1 rounded-xl flex items-center border border-gray-700">
                <button
                    onClick={() => setViewMode('LIST')}
                    className={clsx(
                        "p-2 rounded-lg transition-all",
                        viewMode === 'LIST' ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-white"
                    )}
                    title="List View"
                >
                    <List className="h-5 w-5" />
                </button>
                <button
                    onClick={() => setViewMode('CALENDAR')}
                    className={clsx(
                        "p-2 rounded-lg transition-all",
                        viewMode === 'CALENDAR' ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-white"
                    )}
                    title="Calendar View"
                >
                    <LayoutGrid className="h-5 w-5" />
                </button>
             </div>

             {/* Desktop Add Button (Hidden on Mobile) */}
             <button
                onClick={() => handleCreate()}
                 className="hidden md:flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all font-bold shadow-lg shadow-purple-500/25 shrink-0"
            >
                <Plus className="h-5 w-5" />
                <span>Add Transaction</span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col gap-4 mb-6">
             
             {/* Top Row: Type Pills & Mobile Expand Toggle */}
             <div className="flex gap-3 justify-between">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
                    {['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'].map(ft => (
                        <button
                            key={ft}
                            onClick={() => setFilterType(ft)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${
                                filterType === ft 
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700/50'
                            }`}
                        >
                            {ft}
                        </button>
                    ))}
                </div>
                
                {/* Mobile Filter Toggle */}
                <button 
                    className={clsx(
                        "md:hidden p-2 rounded-xl border flex items-center justify-center gap-2 relative",
                        showMobileFilters || activeFilterCount > 0 
                            ? "bg-gray-700 border-purple-500 text-white" 
                            : "bg-gray-800 border-gray-700 text-gray-400"
                    )}
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                >
                    {activeFilterCount > 0 && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-purple-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                            {activeFilterCount}
                        </span>
                    )}
                    <SlidersHorizontal className="h-5 w-5" />
                </button>
             </div>

            {/* Expansible Complex Filters (Account/Category) */}
            <div className={clsx("flex-wrap gap-4 w-full md:w-auto", showMobileFilters ? "flex" : "hidden md:flex")}>
                
                {/* Account Dropdown */}
                <div className="relative min-w-[200px] w-full md:w-auto">
                    <button
                        onClick={() => setIsAccDropdownOpen(!isAccDropdownOpen)}
                        className="w-full bg-gray-800 text-white text-sm rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-purple-500 flex items-center justify-between group hover:border-gray-600 transition-colors"
                    >
                        <div className="flex items-center gap-2 truncate">
                            <span className="text-gray-400 group-hover:text-gray-300">Account:</span>
                            <span className="font-medium truncate">
                                {filterAccounts.length === 0 
                                    ? 'All' 
                                    : `${filterAccounts.length} selected`}
                            </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isAccDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAccDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsAccDropdownOpen(false)} />
                            <div className="absolute top-full mt-2 left-0 right-0 max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-20 p-2 space-y-1">
                                <button
                                    onClick={() => setFilterAccounts([])}
                                    className={clsx(
                                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
                                        filterAccounts.length === 0 ? "bg-purple-500/20 text-purple-200" : "text-gray-300 hover:bg-gray-700"
                                    )}
                                >
                                    <span>All Accounts</span>
                                    {filterAccounts.length === 0 && <Check className="h-4 w-4" />}
                                </button>
                                {allAccounts.map(a => (
                                    <button
                                        key={a.id}
                                        onClick={() => toggleAccount(a.id)}
                                        className={clsx(
                                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
                                            filterAccounts.includes(a.id) ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
                                        )}
                                    >
                                        <span>{a.name}</span>
                                        {filterAccounts.includes(a.id) && <Check className="h-4 w-4 text-purple-400" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Category Dropdown */}
                <div className="relative min-w-[200px] w-full md:w-auto">
                    <button
                        onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                        className="w-full bg-gray-800 text-white text-sm rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-purple-500 flex items-center justify-between group hover:border-gray-600 transition-colors"
                    >
                        <div className="flex items-center gap-2 truncate">
                            <span className="text-gray-400 group-hover:text-gray-300">Category:</span>
                            <span className="font-medium truncate">
                                {filterCategories.length === 0 
                                    ? 'All' 
                                    : `${filterCategories.length} selected`}
                            </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isCatDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsCatDropdownOpen(false)} />
                            <div className="absolute top-full mt-2 left-0 right-0 max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-20 p-2 space-y-1">
                                <button
                                    onClick={() => setFilterCategories([])}
                                    className={clsx(
                                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
                                        filterCategories.length === 0 ? "bg-purple-500/20 text-purple-200" : "text-gray-300 hover:bg-gray-700"
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
                                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
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
        </div>

        {/* Content */}
        {loading ? (
           <div className="text-center text-gray-400 py-12">Loading transactions...</div>
        ) : (
           <>
              {viewMode === 'LIST' ? (
                <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700/50 overflow-hidden">
                    <TransactionList 
                        transactions={filteredTransactions}
                        accountMap={accountMap}
                        categories={categories}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                        onQuickEdit={handleQuickEdit}
                    />
                </div>
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

      {/* Modals */}
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
            if (selectedDate) {
                handleCreate(selectedDate);
            } else {
                handleCreate();
            }
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
