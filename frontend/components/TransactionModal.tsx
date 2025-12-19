'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { X } from 'lucide-react';
import api from '../lib/api';
import { useCategories, useTransactionMutations } from '../hooks/useOfflineData';

interface Account {
  id: string;
  name: string;
  currency: string;
}

interface Category {
  id: string;
  name: string;
  kind: string;
  color: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => Promise<void>;
  onSuccess?: () => void;
  initialData?: any;
  initialType?: string;
  accounts: Account[];
}

function TransactionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onSuccess,
  initialData, 
  initialType = 'EXPENSE',
  accounts 
}: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [description, setDescription] = useState('');
  
  const { categories } = useCategories({ subscribe: false });
  const { addTransaction } = useTransactionMutations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen) {
        // Categories handled by hook
        
      if (process.env.NEXT_PUBLIC_ENABLE_EVENT_BUDGETS !== 'false') {
          api.get('/budgets/events/active')
            .then(res => setActiveEvents(res.data))
            .catch(() => setActiveEvents([]));
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
        setError('');
        if (initialData) {
            setAmount(initialData.amount);
            setDate(new Date(initialData.date).toISOString().split('T')[0]);
            setAccountId(initialData.accountId);
            setCategoryId(initialData.categoryId || '');
            setType(initialData.type);
            setDescription(initialData.description || '');
        } else {
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setCategoryId('');
            setType(initialType);
            setDescription('');
            setDescription('');
            setSelectedEventId('');
        }
    }
  }, [initialData, isOpen, accounts, initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!accountId) {
        setError('Please select an account');
        setLoading(false);
        return;
    }

    const transactionData = {
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
      accountId,
      categoryId: categoryId || undefined,
      type,
      description,
      budgetId: selectedEventId || undefined
    };

    try {
      if (onSubmit) {
        await onSubmit(transactionData);
      } else {
        await addTransaction(transactionData);
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => categories.filter(c => c.kind === type), [categories, type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
        // ... header ...
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* ... Error ... */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* ... Type Toggle ... */}
            <div className="flex gap-2 p-1 bg-gray-900/50 rounded-xl border border-gray-700/50 mb-4">
                {['EXPENSE', 'INCOME', 'TRANSFER'].map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => { setType(t); setCategoryId(''); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                            type === t 
                            ? (t === 'INCOME' ? 'bg-green-500/20 text-green-400' : t === 'EXPENSE' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400')
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

          {/* ... Amount ... */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Amount</label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                    {accounts.find(a => a.id === accountId)?.currency === 'USD' ? '$' : 
                     accounts.find(a => a.id === accountId)?.currency === 'EUR' ? '€' :
                     accounts.find(a => a.id === accountId)?.currency === 'GBP' ? '£' : '₹'}
                </span>
                <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-mono text-lg"
                placeholder="0.00"
                required
                />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="block w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            >
              <option value="">Uncategorized</option>
              {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
             {/* ... Description ... */}
            <label className="text-sm font-medium text-gray-300">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              placeholder="What is this for?"
            />
          </div>

          {/* Event Budget Tag */}
          {activeEvents.length > 0 && (
             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Tag Event (Optional)</label>
                <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="block w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                >
                    <option value="">None (Regular Budget)</option>
                    {activeEvents.map(evt => (
                        <option key={evt.id} value={evt.id}>{evt.name}</option>
                    ))}
                </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
             {/* ... Account & Date ... */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Account</label>
                <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="block w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                required
                >
                <option value="" disabled>Select Account</option>
                {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                ))}
                </select>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Date</label>
                <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                required
                />
            </div>
          </div>

          <div className="flex justify-end pt-4 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 transition-all ml-auto"
            >
              {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Save Transaction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default memo(TransactionModal);
