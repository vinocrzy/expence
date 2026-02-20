import React from 'react';
import { X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import TransactionList from './TransactionList';
import { Transaction, Category } from '../lib/db-types';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  transactions: Transaction[];
  accountMap: Record<string, any>;
  categories: Category[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (t: Transaction) => void;
  onAddTransaction: () => void;
}

export default function DayDetailsModal({
  isOpen,
  onClose,
  date,
  transactions,
  accountMap,
  categories,
  onDeleteTransaction,
  onEditTransaction,
  onAddTransaction
}: DayDetailsModalProps) {
  if (!isOpen || !date) return null;

  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {format(date, 'MMMM d, yyyy')}
            </h2>
            <div className="flex gap-4 text-sm mt-1">
               {totalIncome > 0 && <span className="text-green-400">+{totalIncome.toLocaleString()}</span>}
               {totalExpense > 0 && <span className="text-red-400">-{totalExpense.toLocaleString()}</span>}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-0">
            <TransactionList 
                transactions={transactions}
                accountMap={accountMap}
                categories={categories}
                onDelete={onDeleteTransaction}
                onEdit={onEditTransaction}
            />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 shrink-0">
            <button
                onClick={onAddTransaction}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
            >
                <Plus className="h-5 w-5" />
                Add Transaction for {format(date, 'MMM d')}
            </button>
        </div>

      </div>
    </div>
  );
}
