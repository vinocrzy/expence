'use client';

import { useState } from 'react';
import { X, Calculator } from 'lucide-react';

interface PrepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  maxAmount: number;
}

export default function PrepaymentModal({ isOpen, onClose, onSubmit, maxAmount }: PrepaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [strategy, setStrategy] = useState('REDUCE_TENURE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (parseFloat(amount) > maxAmount) {
        setError('Amount cannot be greater than outstanding balance');
        setLoading(false);
        return;
    }

    try {
      await onSubmit({
        amount: parseFloat(amount),
        date: new Date(date).toISOString(),
        strategy
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to process prepayment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-white">Make Prepayment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm border border-red-500/20">{error}</div>}

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Prepayment Amount</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input 
                        type="number" 
                        step="0.01" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-8 pr-4 py-2 text-white font-mono text-lg" 
                        required 
                        placeholder="0.00"
                        max={maxAmount}
                    />
                </div>
                <div className="text-xs text-gray-500 text-right">
                    Max: ₹{maxAmount.toLocaleString()}
                </div>
            </div>

            <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-300">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white" required />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Strategy</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setStrategy('REDUCE_TENURE')}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                            strategy === 'REDUCE_TENURE'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                    >
                        Reduce Tenure
                        <span className="block text-[10px] opacity-70 font-normal mt-1">Keep EMI same, finish earlier</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStrategy('REDUCE_EMI')}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                            strategy === 'REDUCE_EMI'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                    >
                        Reduce EMI
                        <span className="block text-[10px] opacity-70 font-normal mt-1">Lower monthly payments</span>
                    </button>
                </div>
            </div>

          <div className="flex justify-end pt-4 gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all ml-auto">
              {loading ? 'Processing...' : 'Confirm Prepayment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
