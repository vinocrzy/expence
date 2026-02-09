import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Wand2, Calculator, AlertCircle } from 'lucide-react';
import { Category } from '../lib/db-types';

interface Split {
  id: string;
  amount: number;
  categoryId: string;
  note?: string;
}

interface SplitTransactionFormProps {
  categories: Category[];
  currencySymbol: string;
  initialAmount?: string;
  onValidationChange: (isValid: boolean, totalAmount: number, splits: Split[]) => void;
}

export default function SplitTransactionForm({
  categories,
  currencySymbol,
  initialAmount = '',
  onValidationChange
}: SplitTransactionFormProps) {
  const [totalAmount, setTotalAmount] = useState<string>(initialAmount);
  // Each split: id, amount, categoryId, note
  const [splits, setSplits] = useState<Split[]>([
    { id: crypto.randomUUID(), amount: 0, categoryId: '', note: '' }
  ]);

  // Derived state
  const totalRaw = parseFloat(totalAmount) || 0;
  const currentSum = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
  const remaining = totalRaw - currentSum;
  const isValid = totalRaw > 0 && Math.abs(remaining) < 0.01 && splits.every(s => s.amount > 0 && s.categoryId);

  // Notify parent of changes
  useEffect(() => {
    onValidationChange(isValid, totalRaw, splits);
  }, [isValid, totalRaw, splits, onValidationChange]);

  const addSplit = () => {
    setSplits([...splits, { id: crypto.randomUUID(), amount: 0, categoryId: '', note: '' }]);
  };

  const removeSplit = (id: string) => {
    setSplits(splits.filter(s => s.id !== id));
  };

  const updateSplit = (id: string, field: keyof Split, value: any) => {
    setSplits(splits.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleQuickFill = () => {
    if (remaining <= 0) return;
    
    // Find 'General' or 'Uncategorized' category, otherwise first available
    const generalCat = categories.find(c => c.name.toLowerCase().includes('general') || c.name.toLowerCase().includes('uncategorized')) || categories[0];
    
    if (generalCat) {
      setSplits([...splits, { 
        id: crypto.randomUUID(), 
        amount: parseFloat(remaining.toFixed(2)), 
        categoryId: generalCat.id, 
        note: 'Balance' 
      }]);
    }
  };

  // Organize categories for easier selection (optional: grouping)
  // Assuming flattened list for now as per TransactionModal

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Total Amount Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-purple-400" />
            Total Amount
        </label>
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                {currencySymbol}
            </span>
            <input
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="block w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-mono text-lg"
                placeholder="0.00"
            />
        </div>
      </div>

      {/* Progress / Remaining Indicator */}
      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
        <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-gray-400">Sum of splits</span>
            <span className={`font-mono font-bold ${remaining === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                {currencySymbol}{currentSum.toFixed(2)} / {currencySymbol}{totalRaw.toFixed(2)}
            </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
                className={`h-full transition-all duration-300 ${remaining === 0 ? 'bg-green-500' : 'bg-yellow-500'}`}
                style={{ width: `${Math.min((currentSum / (totalRaw || 1)) * 100, 100)}%` }}
            />
        </div>
        {remaining !== 0 && (
            <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-red-300 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {remaining > 0 ? `Left to allocate: ${currencySymbol}${remaining.toFixed(2)}` : `Over by: ${currencySymbol}${Math.abs(remaining).toFixed(2)}`}
                </span>
                {remaining > 0 && (
                     <button
                        type="button"
                        onClick={handleQuickFill}
                        className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors font-medium"
                     >
                        <Wand2 className="w-3 h-3" />
                        Quick Fill
                     </button>
                )}
            </div>
        )}
      </div>

      {/* Splits List */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
        {splits.map((split, index) => (
            <div key={split.id} className="flex gap-2 items-start bg-gray-800/50 p-2 rounded-lg border border-gray-700/50 group">
                <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                        <select
                            value={split.categoryId}
                            onChange={(e) => updateSplit(split.id, 'categoryId', e.target.value)}
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="">Select Category</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <div className="relative w-1/3">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">{currencySymbol}</span>
                            <input 
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={split.amount || ''}
                                onChange={(e) => updateSplit(split.id, 'amount', parseFloat(e.target.value))}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-5 pr-2 py-1.5 text-sm text-white font-mono focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                    </div>
                    <input 
                        type="text"
                        placeholder="Note (optional)"
                        value={split.note || ''}
                        onChange={(e) => updateSplit(split.id, 'note', e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-gray-700 px-0 py-1 text-xs text-gray-300 placeholder-gray-600 focus:ring-0 focus:border-purple-500/50"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => removeSplit(split.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mt-0.5"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSplit}
        className="w-full py-2 flex items-center justify-center gap-2 border border-dashed border-gray-600 rounded-xl text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800/50 transition-all text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Split Row
      </button>

    </div>
  );
}
