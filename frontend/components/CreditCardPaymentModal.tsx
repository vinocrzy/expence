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
      <div className="bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-gold)]">
          <h2 className="text-xl font-bold text-white">Pay Credit Card Bill</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm border border-red-500/20">{error}</div>}

            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-muted)]">Amount</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">₹</span>
                    <input 
                        type="number" 
                        step="0.01" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl pl-8 pr-4 py-2 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]" 
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
                        className="flex-1 py-1 px-2 rounded-lg bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] hover:bg-[var(--color-gold-500)]/10 text-xs text-[var(--color-gold-500)] transition-colors"
                    >
                        Min Due: ₹{minDue.toLocaleString()}
                    </button>
                )}
                 {totalDue > 0 && (
                    <button 
                        type="button" 
                        onClick={() => handleQuickAmount(totalDue)}
                        className="flex-1 py-1 px-2 rounded-lg bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] hover:bg-[var(--color-gold-500)]/10 text-xs text-[var(--color-gold-500)] transition-colors"
                    >
                        Total Due: ₹{totalDue.toLocaleString()}
                    </button>
                )}
            </div>

            <div className="space-y-2">
                 <label className="text-sm font-medium text-[var(--color-text-muted)]">Pay From (Bank Account)</label>
                 <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]">
                    {accounts.map(acc => (
                         <option key={acc.id} value={acc.id}>
                            {acc.name} (₹{Number(acc.balance).toLocaleString()})
                         </option>
                    ))}
                 </select>
            </div>

            <div className="space-y-2">
                 <label className="text-sm font-medium text-[var(--color-text-muted)]">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]" required />
            </div>

          <div className="flex justify-end pt-4 gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-bold text-black bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 disabled:opacity-50 transition-all ml-auto shadow-lg shadow-[var(--color-gold-500)]/20">
              {loading ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
