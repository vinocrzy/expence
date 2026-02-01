'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import TransactionModal from '../../components/TransactionModal';
import CalendarView from '../../components/CalendarView';
import DayDetailsModal from '../../components/DayDetailsModal';
import TransactionList from '../../components/TransactionList';
import { useTransactions, useAccounts, useCreditCards, useCategories } from '../../hooks/useLocalData';

import { Plus, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Trash2, Calendar, Search, Filter, Check, ChevronDown, X, LayoutGrid, List } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

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
  
  
  // Basic filtering (can be expanded)
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategories, setFilterCategories] = useState<string[]>([]); // Empty array means ALL
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

  const handleCreate = (date?: Date) => {
    setEditingTransaction(date ? { date: date.toISOString() } : null);
    setIsModalOpen(true);
  };

  const handleEdit = (t: any) => {
      setEditingTransaction(t);
      setIsModalOpen(true);
      // If we were in Day Details, close it
      setIsDayDetailsOpen(false);
  };

  // Re-read existing hook usage. 
  // Line 13: const { transactions, loading: txLoading, addTransaction, deleteTransaction } = useTransactions();
  // It does NOT have updateTransaction.
  // I should check `useLocalData` or just import `transactionService` to perform update.
  // And calling `mutate()` of the hook if possible.
  // Or just rely on `TransactionModal` doing the work?
  // `TransactionModal` takes `onSubmit`.
  
  const handleModalSubmit = async (data: any) => {
      if (editingTransaction?.id) {
          // Edit mode
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
    return typeMatch && catMatch;
  });

  const toggleCategory = (catId: string) => {
      setFilterCategories(prev => 
          prev.includes(catId)
              ? prev.filter(id => id !== catId)
              : [...prev, catId]
      );
  };

  const handleDateSelect = (date: Date) => {
      setSelectedDate(date);
      setIsDayDetailsOpen(true);
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

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 pb-32 md:pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
            <p className="text-gray-400">Track and manage your financial activity</p>
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

             <button
                onClick={() => handleCreate()}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all font-bold shadow-lg shadow-purple-500/25"
            >
                <Plus className="h-5 w-5" />
                <span className="hidden md:inline">Add Transaction</span>
                <span className="md:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Filters */}
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
    </div>
  );
}

