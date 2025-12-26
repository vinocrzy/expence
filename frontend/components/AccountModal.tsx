'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

export default function AccountModal({ isOpen, onClose, onSubmit, initialData }: AccountModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('BANK');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setBalance(initialData.balance.toString());
      setCurrency(initialData.currency);
    } else {
      setName('');
      setType('BANK');
      setBalance('');
      setCurrency('INR');
      setError('');
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    setError('');
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        name,
        type,
        balance: balance ? parseFloat(balance) : 0,
        currency
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-gold)]">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Account' : 'Add New Account'}
          </h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text-muted)]">Account Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-4 py-2 bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl text-white placeholder-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]"
              placeholder="e.g. Main Chase Checking"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text-muted)]">Account Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="block w-full px-4 py-2 bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]"
            >
              <option value="BANK">Bank Account</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="CASH_RESERVE">Cash Reserve</option>
              <option value="INVESTMENT">Investment</option>
              <option value="LOAN">Loan</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-muted)]">Balance</label>
                <input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="block w-full px-4 py-2 bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl text-white placeholder-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]"
                placeholder="0.00"
                required
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-muted)]">Currency</label>
                <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="block w-full px-4 py-2 bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]"
                >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-bold text-black bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 disabled:opacity-50 transition-all ml-auto shadow-lg shadow-[var(--color-gold-500)]/20"
            >
              {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Account')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
