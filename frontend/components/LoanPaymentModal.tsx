'use client';

import { useState, useEffect } from 'react';
import { X, Check, FileText } from 'lucide-react';
import { Loan } from '../lib/db-types';

interface LoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  onPayment: (amount: number, recordTransaction: boolean, date: string) => void;
}

export default function LoanPaymentModal({ isOpen, onClose, loan, onPayment }: LoanPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen && loan) {
      setAmount(loan.emiAmount?.toString() || '');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, loan]);

  if (!isOpen || !loan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div>
            <h2 className="text-xl font-bold text-white">Pay EMI</h2>
            <p className="text-sm text-gray-400">{loan.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Amount to Pay</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-8 pr-4 py-3 text-white font-mono text-xl focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Payment Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onPayment(parseFloat(amount), false, date)}
              disabled={!amount || parseFloat(amount) <= 0}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition-all disabled:opacity-50 active:scale-95"
            >
              <Check className="h-4 w-4" />
              Mark as Paid
              <span className="text-xs opacity-60 block sm:hidden ml-1">(No Log)</span>
            </button>
            <button
              onClick={() => onPayment(parseFloat(amount), true, date)}
              disabled={!amount || parseFloat(amount) <= 0}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-purple-500/25"
            >
              <FileText className="h-4 w-4" />
              Pay & Log
            </button>
          </div>
          <p className="text-xs text-center text-gray-500">
            "Pay & Log" records a transaction transaction. <br/>"Mark as Paid" only updates the loan balance.
          </p>
        </div>
      </div>
    </div>
  );
}
