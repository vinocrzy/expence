'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { X, Split } from 'lucide-react';
import { Category } from '../lib/db-types';
import { categoryService, transactionService, budgetService, getHouseholdId } from '../lib/localdb-services';
import SplitTransactionForm from './SplitTransactionForm';
import SmartTransactionInput from './SmartTransactionInput';
import { isGeminiConfigured } from '../app/actions/gemini-transaction';

interface Account {
  id: string;
  name: string;
  currency: string;
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
  
  const [subCategoryId, setSubCategoryId] = useState('');
  const [transferAccountId, setTransferAccountId] = useState('');
  
  const [categories, setCategories] = useState<Category[]>([]);
  // const { addTransaction } = useTransactionMutations(); // removed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Edit Mode Flag
  const isEditMode = !!initialData;

  // Split Transaction State
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<any[]>([]);
  const [isSplitValid, setIsSplitValid] = useState(true);
  const [splitTotal, setSplitTotal] = useState(0);

  // Smart Add
  const [showSmartAdd, setShowSmartAdd] = useState(false);
  const [smartAddAvailable, setSmartAddAvailable] = useState(false);

  useEffect(() => {
    isGeminiConfigured().then(setSmartAddAvailable);
  }, []);

  const handleSmartParsed = (data: any) => {
    if (data.amount) setAmount(data.amount.toString());
    if (data.date) setDate(data.date);
    if (data.description) setDescription(data.description);
    if (data.type) setType(data.type);

    if (data.accountName) {
        const acc = accounts.find(a => a.name.toLowerCase() === data.accountName.toLowerCase());
        if (acc) setAccountId(acc.id);
    }
    
    if (data.categoryName) {
        // Try exact match first, then partial
        const cat = categories.find(c => c.name.toLowerCase() === data.categoryName.toLowerCase()) ||
                    categories.find(c => c.name.toLowerCase().includes(data.categoryName.toLowerCase()));
        if (cat) {
            setCategoryId(cat.id);
            if (cat.type && cat.type !== data.type) setType(cat.type); // Trust category type over AI type if conflict? Or vice versa. AI usually right on context.
        }
    }

    if (data.isSplit && data.splits) {
        setIsSplit(true);
        const mappedSplits = data.splits.map((s: any) => {
            const splitCat = categories.find(c => c.name.toLowerCase() === (s.categoryName || '').toLowerCase());
            return {
                id: crypto.randomUUID(),
                amount: s.amount,
                categoryId: splitCat?.id || '',
                note: s.note || ''
            };
        });
        setSplits(mappedSplits);
        setSplitTotal(data.amount);
    }
    
    // Auto-hide smart add after successful parse to show populated form
    setShowSmartAdd(false); 
  };

  const handleDescriptionBlur = async () => {
    if (!description || categoryId) return; 

    setIsSuggesting(true);
    try {
        const res = await fetch('/api/suggest-category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                description,
                categories: categories.map(c => c.name) 
            })
        });
        const data = await res.json();
        
        if (data.category) {
            const foundCategory = categories.find(c => c.name.toLowerCase() === data.category.toLowerCase());
            
            if (foundCategory) {
                if (foundCategory.type && foundCategory.type !== type) {
                    setType(foundCategory.type);
                }
                setCategoryId(foundCategory.id);
            }
        }
    } catch (err) {
        console.error('Failed to get suggestion', err);
    } finally {
        setIsSuggesting(false);
    }
  };

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen) {
        // Fetch household and then categories
        getHouseholdId().then(householdId => {
            if (householdId) {
                categoryService.getAll(householdId).then(cats => setCategories(cats as any));
            }
        });

        if (process.env.NEXT_PUBLIC_ENABLE_EVENT_BUDGETS !== 'false') {
          // Load active active budgets from local database
            budgetService.getActiveEventBudgets().then(budgets => {
              setActiveEvents(budgets.map((b: any) => ({ 
                id: b.id, 
                name: b.name, 
                type: b.budgetMode,
                status: b.status 
              })));
            }).catch(() => setActiveEvents([]));
        }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setAmount(initialData.amount);
            setDate(new Date(initialData.date).toISOString().split('T')[0]);
            setAccountId(initialData.accountId);
            setCategoryId(initialData.categoryId || '');
            setSubCategoryId(initialData.subCategoryId || '');
            setTransferAccountId(initialData.transferAccountId || '');
            setType(initialData.type);
            setDescription(initialData.description || '');
            setSelectedEventId(initialData.budgetId || '');
            
            if (initialData.isSplit && initialData.splits) {
                setIsSplit(true);
                setSplits(initialData.splits);
                setSplitTotal(initialData.amount);
            } else {
                setIsSplit(false);
                setSplits([]);
            }
        } else {
            setAmount('');
            // ... (rest of reset logic)
            setAccountId('');
            setCategoryId('');
            setSubCategoryId('');
            setTransferAccountId('');
            setType(initialType);
            setDescription('');
            setSelectedEventId('');
             // Default date to today unless provided in a "partial" initialData
             setDate(new Date().toISOString().split('T')[0]);
             
             setIsSplit(false);
             setSplits([]);
        }
    }
  }, [initialData, isOpen, initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!accountId) {
        setError('Please select an account');
        setLoading(false);
        return;
    }

    if (type === 'TRANSFER') {
        if (!transferAccountId) {
            setError('Please select a destination account');
            setLoading(false);
            return;
        }
        if (accountId === transferAccountId) {
            setError('Source and destination accounts cannot be the same');
            setLoading(false);
            return;
        }
    }

    const transactionData = {
      amount: isSplit ? splitTotal : parseFloat(amount),
      date: new Date(date).toISOString(),
      accountId,
      transferAccountId: type === 'TRANSFER' ? transferAccountId : undefined,
      categoryId: (isSplit || type === 'TRANSFER') ? undefined : (categoryId || undefined),
      subCategoryId: (isSplit || type === 'TRANSFER') ? undefined : (subCategoryId || undefined),
      type: type as any,
      description,
      budgetId: selectedEventId || undefined,
      isSplit,
      splits: isSplit ? splits : undefined
    };

    if (isSplit && !isSplitValid) {
        setError('Please fix split transaction errors (sum must match total)');
        setLoading(false);
        return;
    }

    try {
      if (onSubmit) {
        await onSubmit(transactionData);
      } else {
        if (isSplit) {
            await transactionService.saveSplitTransaction(transactionData);
        } else {
            await transactionService.create(transactionData);
        }
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

  const filteredCategories = useMemo(() => categories.filter(c => c.type === type), [categories, type]);
  
  // Get sub-categories for selected category
  const activeSubCategories = useMemo(() => {
      if (!categoryId) return [];
      const cat = categories.find(c => c.id === categoryId);
      return cat?.subCategories || [];
  }, [categories, categoryId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">

                {/* Smart Add Toggle */}
                {!isEditMode && smartAddAvailable && (
                    <div className="flex justify-end mb-2">
                        <button
                            type="button"
                            onClick={() => setShowSmartAdd(!showSmartAdd)}
                            className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 hover:opacity-80 transition-opacity"
                        >
                            {showSmartAdd ? 'Hide Smart Add' : '✨ Use AI Smart Add'}
                        </button>
                    </div>
                )}
                
                {showSmartAdd && (
                    <SmartTransactionInput 
                        onParsed={handleSmartParsed}
                        categories={categories.map(c => c.name)}
                        accounts={accounts.map(a => a.name)}
                    />
                )}

                {/* ... Error ... */}
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* ... Type Toggle (New UX Grid) ... */}
                <div className="space-y-2 mb-4">
                    {/* Primary Actions (Top Row) */}
                    <div className="grid grid-cols-2 gap-2">
                        {['EXPENSE', 'INCOME'].map((t) => (
                             <button
                                key={t}
                                type="button"
                                disabled={isEditMode}
                                onClick={() => { setType(t); setCategoryId(''); setSubCategoryId(''); setTransferAccountId(''); }}
                                className={`py-3 text-sm font-bold rounded-xl transition-all shadow-sm ${
                                    type === t 
                                    ? (t === 'INCOME' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50' : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50')
                                    : 'bg-zinc-900/50 text-gray-400 hover:text-white hover:bg-zinc-800'
                                } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* Secondary Actions (Bottom Row) */}
                     <div className="grid grid-cols-3 gap-2">
                        {['TRANSFER', 'INVESTMENT', 'DEBT'].map((t) => (
                             <button
                                key={t}
                                type="button"
                                disabled={isEditMode}
                                onClick={() => { setType(t); setCategoryId(''); setSubCategoryId(''); setTransferAccountId(''); }}
                                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                                    type === t 
                                    ? (t === 'INVESTMENT' ? 'bg-amber-500/20 text-amber-400' : t === 'DEBT' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400')
                                    : 'bg-zinc-900/30 text-zinc-500 hover:text-white hover:bg-zinc-800'
                                } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Split Toggle */}
                <div className="flex justify-end mb-2">
                    <button
                        type="button"
                        onClick={() => {
                             const newIsSplit = !isSplit;
                             setIsSplit(newIsSplit);
                             
                             // If turning on split and no splits exist, convert current transaction to first split
                             if (newIsSplit && splits.length === 0 && amount) {
                                 setSplits([{
                                     id: crypto.randomUUID(),
                                     amount: parseFloat(amount),
                                     categoryId: categoryId,
                                     note: description
                                 }]);
                                 setSplitTotal(parseFloat(amount));
                             }
                             
                             // Clear error when toggling
                             setError('');
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isSplit 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                            : 'text-gray-400 hover:bg-gray-800 border border-transparent'
                        }`}
                    >
                        <Split className="w-4 h-4" />
                        {isSplit ? 'Split Transaction Active' : 'Split Transaction?'}
                    </button>
                </div>

                {isSplit ? (
                    <SplitTransactionForm
                        categories={filteredCategories}
                        currencySymbol={accounts.find(a => a.id === accountId)?.currency === 'USD' ? '$' : accounts.find(a => a.id === accountId)?.currency === 'EUR' ? '€' : accounts.find(a => a.id === accountId)?.currency === 'GBP' ? '£' : '₹'}
                        initialAmount={initialData?.amount?.toString() || amount}
                        initialSplits={splits}
                        isReadOnly={isEditMode}
                        onValidationChange={(valid, total, newSplits) => {
                            setIsSplitValid(valid);
                            setSplitTotal(total);
                            setSplits(newSplits);
                        }}
                    />
                ) : (
                    <>
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
                            disabled={isEditMode}
                            className={`block w-full pl-8 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-mono text-lg ${isEditMode ? 'opacity-50 cursor-not-allowed bg-gray-800' : ''}`}
                            placeholder="0.00"
                            required={!isSplit}
                            />
                        </div>
                      </div>

                    {/* Show Category/Subcategory only if NOT Transfer */ }
                    {type !== 'TRANSFER' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Category</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <select
                              value={categoryId}
                              onChange={(e) => { setCategoryId(e.target.value); setSubCategoryId(''); }}
                              className="block w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                              required={!isSplit}
                            >
                              <option value="">Uncategorized</option>
                              {filteredCategories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                            
                            {activeSubCategories.length > 0 && (
                                 <select
                                    value={subCategoryId}
                                    onChange={(e) => setSubCategoryId(e.target.value)}
                                    className="block w-full sm:w-1/2 px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                                  >
                                    <option value="">Sub-category</option>
                                    {activeSubCategories.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                    ))}
                                  </select>
                            )}
                        </div>
                      </div>
                    )}
                    </>
                )}

              <div className="space-y-2">
                  {/* ... Description ... */}
                <label className="text-sm font-medium text-gray-300 flex justify-between">
                    <span>Description</span>
                    {isSuggesting && <span className="text-xs text-purple-400 animate-pulse">✨ AI Suggesting...</span>}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  className="block w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  placeholder="What is this for? (e.g. Uber, Netflix)"
                />
              </div>

              {/* Event Budget Tag */}
              {activeEvents.length > 0 && (
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Tag Event (Optional)</label>
                    <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="block w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
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
                    <label className="text-sm font-medium text-gray-300">
                        {type === 'TRANSFER' ? 'From Account' : 'Account'}
                    </label>
                    <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className={`block w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${isEditMode ? 'opacity-50 cursor-not-allowed bg-gray-800' : ''}`}
                    required
                    disabled={isEditMode}
                    >
                    <option value="" disabled>Select Account</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                    ))}
                    </select>
                </div>

                {type === 'TRANSFER' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">To Account</label>
                        <select
                        value={transferAccountId}
                        onChange={(e) => setTransferAccountId(e.target.value)}
                        className={`block w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${isEditMode ? 'opacity-50 cursor-not-allowed bg-gray-800' : ''}`}
                        required
                        disabled={isEditMode}
                        >
                        <option value="" disabled>Select Destination</option>
                        {accounts.filter(a => a.id !== accountId).map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                        ))}
                        </select>
                    </div>
                )}
                
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Date</label>
                    <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`block w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${isEditMode ? 'opacity-50 cursor-not-allowed bg-gray-800' : ''}`}
                    required
                    disabled={isEditMode}
                    />
                </div>
              </div>
          </div>

          <div className="flex justify-end p-6 border-t border-white/10 gap-3 bg-[#1c1c1e] z-10 shrink-0 rounded-b-2xl">
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
              className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:opacity-50 transition-all"
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
