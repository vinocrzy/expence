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
      <div className="bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-gold)]">
          <h2 className="text-xl font-bold text-white">Make Prepayment</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm border border-red-500/20">{error}</div>}

            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-muted)]">Prepayment Amount</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">₹</span>
                    <input 
                        type="number" 
                        step="0.01" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl pl-8 pr-4 py-2 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" 
                        required 
                        placeholder="0.00"
                        max={maxAmount}
                    />
                </div>
                <div className="text-xs text-[var(--color-text-muted)] text-right">
                    Max: ₹{maxAmount.toLocaleString()}
                </div>
            </div>

            <div className="space-y-2">
                 <label className="text-sm font-medium text-[var(--color-text-muted)]">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" required />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-muted)]">Strategy</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setStrategy('REDUCE_TENURE')}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                            strategy === 'REDUCE_TENURE'
                            ? 'bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] text-black border-transparent shadow-[var(--color-gold-500)]/20 shadow-lg'
                            : 'bg-[var(--color-wine-deep)] border-[var(--color-border-gold)] text-[var(--color-text-muted)] hover:border-[var(--color-gold-500)]/50'
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
                            ? 'bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] text-black border-transparent shadow-[var(--color-gold-500)]/20 shadow-lg'
                            : 'bg-[var(--color-wine-deep)] border-[var(--color-border-gold)] text-[var(--color-text-muted)] hover:border-[var(--color-gold-500)]/50'
                        }`}
                    >
                        Reduce EMI
                        <span className="block text-[10px] opacity-70 font-normal mt-1">Lower monthly payments</span>
                    </button>
                </div>
            </div>

          <div className="flex justify-end pt-4 gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-bold text-black bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 disabled:opacity-50 transition-all ml-auto shadow-lg shadow-[var(--color-gold-500)]/20">
              {loading ? 'Processing...' : 'Confirm Prepayment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
