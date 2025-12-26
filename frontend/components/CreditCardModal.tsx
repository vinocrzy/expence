'use client';

import { useState } from 'react';
import { X, CreditCard as CardIcon } from 'lucide-react';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export default function CreditCardModal({ isOpen, onClose, onSubmit }: CreditCardModalProps) {
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [limit, setLimit] = useState('');
  const [billingDay, setBillingDay] = useState('1');
  const [dueDays, setDueDays] = useState('20');
  const [apr, setApr] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await onSubmit({
        name,
        issuer,
        limit: parseFloat(limit),
        billingDay: parseInt(billingDay),
        dueDays: parseInt(dueDays),
        apr: parseFloat(apr)
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to create credit card');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CardIcon className="h-6 w-6 text-purple-400" />
            Add Credit Card
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm border border-red-500/20">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Card Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white" required placeholder="e.g. HDFC Regalia" />
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Issuer / Bank</label>
                    <input type="text" value={issuer} onChange={e => setIssuer(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white" placeholder="e.g. HDFC" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Credit Limit</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input type="number" value={limit} onChange={e => setLimit(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-8 pr-4 py-2 text-white font-mono text-lg" required placeholder="100000" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Statement Day</label>
                    <input type="number" min="1" max="31" value={billingDay} onChange={e => setBillingDay(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white" required />
                    <p className="text-[10px] text-gray-500">Day of month</p>
                </div>
                <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-300">Pay Due Days</label>
                    <input type="number" min="1" value={dueDays} onChange={e => setDueDays(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white" required />
                    <p className="text-[10px] text-gray-500">After statement</p>
                </div>
                 <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-300">APR (%)</label>
                    <input type="number" step="0.1" value={apr} onChange={e => setApr(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white" required placeholder="36" />
                    <p className="text-[10px] text-gray-500">Annual Interest</p>
                </div>
            </div>

          <div className="flex justify-end pt-4 gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all ml-auto">
              {loading ? 'Adding...' : 'Add Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
