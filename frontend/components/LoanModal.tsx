'use client';

import { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import api from '../lib/api';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  accounts: any[];
}

export default function LoanModal({ isOpen, onClose, onSubmit, accounts }: LoanModalProps) {
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [type, setType] = useState('PERSONAL');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [linkedAccountId, setLinkedAccountId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emiPreview, setEmiPreview] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
        setName('');
        setLender('');
        setType('PERSONAL');
        setPrincipal('');
        setRate('');
        setTenure('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setLinkedAccountId('');
        setError('');
        setEmiPreview(null);
        if (accounts.length > 0) setLinkedAccountId(accounts[0].id);
    }
  }, [isOpen]);

  const calculateEmi = () => {
      const p = parseFloat(principal);
      const r = parseFloat(rate) / 12 / 100;
      const n = parseFloat(tenure);
      
      if (p && r && n) {
          const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
          setEmiPreview(emi);
      } else {
          setEmiPreview(null);
      }
  };

  useEffect(() => {
      calculateEmi();
  }, [principal, rate, tenure]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await onSubmit({
        name,
        lender,
        type,
        principal: parseFloat(principal),
        interestRate: parseFloat(rate),
        tenureMonths: parseFloat(tenure),
        startDate: new Date(startDate).toISOString(),
        linkedAccountId
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to create loan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-gold)]">
          <h2 className="text-xl font-bold text-white">Add New Loan</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm border border-red-500/20">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text-muted)]">Loan Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" required placeholder="e.g. Home Loan" />
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text-muted)]">Lender</label>
                    <input type="text" value={lender} onChange={e => setLender(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" placeholder="e.g. HDFC" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text-muted)]">Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50">
                        <option value="PERSONAL">Personal Loan</option>
                        <option value="HOME">Home Loan</option>
                        <option value="AUTO">Auto Loan</option>
                        <option value="EDUCATION">Education Loan</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text-muted)]">Linked Account</label>
                    <select value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50">
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-muted)]">Principal Amount</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">₹</span>
                    <input type="number" step="0.01" value={principal} onChange={e => setPrincipal(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl pl-8 pr-4 py-2 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" required placeholder="0.00" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text-muted)]">Interest (%)</label>
                    <input type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" required placeholder="8.5" />
                </div>
                <div className="space-y-2">
                     <label className="text-sm font-medium text-[var(--color-text-muted)]">Tenure (Mos)</label>
                    <input type="number" value={tenure} onChange={e => setTenure(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" required placeholder="12" />
                </div>
                 <div className="space-y-2">
                     <label className="text-sm font-medium text-[var(--color-text-muted)]">Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" required />
                </div>
            </div>

            {emiPreview && (
                <div className="bg-[var(--color-gold-500)]/10 border border-[var(--color-gold-500)]/30 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[var(--color-gold-500)]">
                        <Calculator className="h-5 w-5" />
                        <span className="text-sm font-medium">Estimated EMI</span>
                    </div>
                    <div className="text-xl font-bold text-white font-mono">
                        ₹ {emiPreview.toFixed(2)}
                    </div>
                </div>
            )}

          <div className="flex justify-end pt-4 gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-bold text-black bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 disabled:opacity-50 transition-all ml-auto shadow-lg shadow-[var(--color-gold-500)]/20">
              {loading ? 'Creating...' : 'Create Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
