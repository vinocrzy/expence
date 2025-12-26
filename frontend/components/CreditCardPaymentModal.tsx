'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';

interface CreditCardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  accounts: any[];
  minDue: number;
  totalDue: number;
}

export default function CreditCardPaymentModal({ isOpen, onClose, onSubmit, accounts, minDue, totalDue }: CreditCardPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && accounts.length > 0) {
        setSourceAccountId(accounts[0].id);
        setError('');
        setAmount('');
    }
  }, [isOpen, accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await onSubmit({
        amount: parseFloat(amount),
        sourceAccountId,
        date: new Date(date).toISOString(),
        type: parseFloat(amount) >= totalDue ? 'FULL' : 'PARTIAL'
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuickAmount = (val: number) => {
      setAmount(val.toString());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-white">Pay Credit Card Bill</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm border border-red-500/20">{error}</div>}

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Amount</label>
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
                    />
                </div>
            </div>
            
            <div className="flex gap-2">
                {minDue > 0 && (
                    <button 
                        type="button" 
                        onClick={() => handleQuickAmount(minDue)}
                        className="flex-1 py-1 px-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 transition-colors"
                    >
                        Min Due: ₹{minDue.toLocaleString()}
                    </button>
                )}
                 {totalDue > 0 && (
                    <button 
                        type="button" 
                        onClick={() => handleQuickAmount(totalDue)}
                        className="flex-1 py-1 px-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 transition-colors"
                    >
                        Total Due: ₹{totalDue.toLocaleString()}
                    </button>
                )}
            </div>

            <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-300">Pay From (Bank Account)</label>
                 <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white">
                    {accounts.map(acc => (
                         <option key={acc.id} value={acc.id}>
                            {acc.name} (₹{Number(acc.balance).toLocaleString()})
                         </option>
                    ))}
                 </select>
            </div>

            <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-300">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white" required />
            </div>

          <div className="flex justify-end pt-4 gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all ml-auto">
              {loading ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
