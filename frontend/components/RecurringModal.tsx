import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, DollarSign, RefreshCw, Tag, CreditCard } from 'lucide-react';
import { RecurringTransaction, Category, Account } from '@/lib/db-types';
import { recurringService, categoryService, accountService, getHouseholdId } from '@/lib/localdb-services';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingItem?: RecurringTransaction;
}

export default function RecurringModal({ isOpen, onClose, onSave, editingItem }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INVESTMENT' | 'DEBT'>('EXPENSE');
  const [frequency, setFrequency] = useState<'MONTHLY' | 'YEARLY' | 'QUARTERLY'>('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
         const householdId = await getHouseholdId();
         const cats = await categoryService.getAll(householdId);
         const accs = await accountService.getAllActive(householdId);
         setCategories(cats);
         setAccounts(accs);
      } catch (e) {
         console.error(e);
      }
    };
    if (isOpen) loadData();
  }, [isOpen]);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setAmount(editingItem.amount.toString());
      setType(editingItem.type as any);
      setFrequency(editingItem.frequency as any);
      setStartDate(editingItem.startDate ? new Date(editingItem.startDate).toISOString().split('T')[0] : '');
      setCategoryId(editingItem.categoryId || '');
      setSubCategoryId(editingItem.subCategoryId || '');
      setAccountId(editingItem.accountId || '');
    } else {
      setName('');
      setAmount('');
      setType('EXPENSE');
      setFrequency('MONTHLY');
      setStartDate(new Date().toISOString().split('T')[0]);
      setCategoryId('');
      setSubCategoryId('');
      setAccountId('');
    }
  }, [editingItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { // Omit types for simplicity in this implementation step
        name,
        amount: parseFloat(amount),
        type,
        frequency,
        startDate: new Date(startDate).toISOString(),
        nextDueDate: new Date(startDate).toISOString(), // Initial next due is start date? Or calculated? Assuming immediate start.
        categoryId,
        subCategoryId: subCategoryId || undefined,
        accountId,
        autoPay: false
      };

      if (editingItem) {
        await recurringService.update(editingItem.id, payload);
      } else {
        await recurringService.create(payload);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save');
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);

  const activeSubCategories = useMemo(() => {
    if (!categoryId) return [];
    const cat = categories.find(c => c.id === categoryId);
    return cat?.subCategories || [];
  }, [categories, categoryId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-[#1c1c1e] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h2 className="text-xl font-bold text-white">
              {editingItem ? 'Edit Recurring Payment' : 'New Recurring Payment'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Type Selector */}
            <div className="grid grid-cols-3 gap-2 bg-black/20 p-1 rounded-xl">
              {(['EXPENSE', 'INVESTMENT', 'DEBT'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setCategoryId(''); setSubCategoryId(''); }}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    type === t 
                      ? t === 'EXPENSE' ? 'bg-red-500 text-white' : t === 'INVESTMENT' ? 'bg-emerald-500 text-white' : 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Title</label>
              <input 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Life Insurance, Car Loan"
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                required
              />
            </div>

             {/* Amount */}
             <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Amount</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <DollarSign className="w-4 h-4" />
                </div>
                <input 
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                    required
                />
              </div>
            </div>

            {/* Frequency & Date */}
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Frequency</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                            <RefreshCw className="w-4 h-4" />
                        </div>
                        <select
                            value={frequency}
                            onChange={e => setFrequency(e.target.value as any)}
                            className="w-full bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-colors"
                        >
                            <option value="MONTHLY">Monthly</option>
                            <option value="QUARTERLY">Quarterly</option>
                            <option value="YEARLY">Yearly</option>
                        </select>
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Start Date</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                            required
                        />
                    </div>
                 </div>
            </div>

            {/* Category & Account */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Category</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                            <Tag className="w-4 h-4" />
                        </div>
                        <select
                            value={categoryId}
                            onChange={e => { setCategoryId(e.target.value); setSubCategoryId(''); }}
                            className="w-full bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-colors"
                            required
                        >
                            <option value="">Select Category</option>
                            {filteredCategories.map(c => (
                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                        </select>
                        {activeSubCategories.length > 0 && (
                          <select
                            value={subCategoryId}
                            onChange={e => setSubCategoryId(e.target.value)}
                            className="w-full mt-2 bg-black/20 border border-white/5 rounded-xl pl-4 pr-4 py-3 text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-colors"
                          >
                            <option value="">Sub-category (optional)</option>
                            {activeSubCategories.map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </select>
                        )}
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Pay From</label>
                    <div className="relative">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                            <CreditCard className="w-4 h-4" />
                        </div>
                        <select
                            value={accountId}
                            onChange={e => setAccountId(e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-colors"
                        >
                            <option value="">Select Account (Optional)</option>
                            {accounts.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                            ))}
                        </select>
                    </div>
                 </div>
            </div>

            {/* Submit */}
            <button 
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] mt-4"
            >
                {editingItem ? 'Update Subscription' : 'Create Subscription'}
            </button>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
