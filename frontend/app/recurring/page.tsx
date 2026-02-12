'use client';
import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft, RefreshCw, AlertCircle, CheckCircle, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { recurringService, transactionService, accountService, getHouseholdId } from '@/lib/localdb-services';
import { RecurringTransaction, Account } from '@/lib/db-types';
import RecurringModal from '@/components/RecurringModal';
import NativeHeader from '@/components/dashboard/NativeHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function RecurringPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [itemToPay, setItemToPay] = useState<RecurringTransaction | null>(null);
  const [selectedPayAccount, setSelectedPayAccount] = useState('');

  // Load items & Accounts
  const loadData = async () => {
    try {
        const householdId = await getHouseholdId();
        const [recurringData, accountsData] = await Promise.all([
            recurringService.getAllActive(householdId),
            accountService.getAllActive(householdId)
        ]);
        
        // Sort by next due date
        recurringData.sort((a,b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
        setItems(recurringData);
        setAccounts(accountsData);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
      const action = searchParams.get('action');
      if (action === 'add') {
          // Open Modal
          setEditingItem(undefined);
          setIsModalOpen(true);
          
          // Clear URL param to prevent reopening on generic refresh
          // Using history.replaceState to verify strictly
          window.history.replaceState(null, '', window.location.pathname);
      }
  }, [searchParams]);

  const initiatePayment = (item: RecurringTransaction) => {
      setItemToPay(item);
      setSelectedPayAccount(item.accountId || ''); // Default to linked account if exists
      setPayModalOpen(true);
  };

  const confirmPayment = async () => {
      if (!itemToPay) return;
      if (!selectedPayAccount) {
          alert('Please select an account to pay from');
          return;
      }

      try {
          await recurringService.processPayment(itemToPay.id, selectedPayAccount);
          await loadData();
          setPayModalOpen(false);
          setItemToPay(null);
      } catch(e) {
          alert('Payment failed');
          console.error(e);
      }
  };

  const getStatusColor = (days: number) => {
      if (days < 0) return 'text-red-400 bg-red-500/10'; // Overdue
      if (days <= 3) return 'text-amber-400 bg-amber-500/10'; // Due soon (3 days)
      return 'text-gray-400 bg-white/5'; // Neutral
  };

  const getStatusText = (days: number) => {
      if (days < 0) return `Overdue by ${Math.abs(days)} days`;
      if (days === 0) return 'Due Today';
      if (days === 1) return 'Due Tomorrow';
      return `Due in ${days} days`;
  };

  return (
    <div className="min-h-screen bg-black pb-24">
        <Navbar />
        <NativeHeader 
            title="Subscriptions" 
            backUrl="/dashboard"
        />

        <div className="p-6 max-w-2xl mx-auto space-y-6 pt-24">
            {/* Header Action */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Your Subscriptions</h1>
            </div>

            {loading ? (
                <div className="text-center text-gray-500 mt-10">Loading...</div>
            ) : items.length === 0 ? (
                <div className="text-center py-20 bg-[#1c1c1e] rounded-3xl border border-white/5">
                    <RefreshCw className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Subscriptions</h3>
                    <p className="text-gray-400">Add insurance, EMIs, or other recurring payments.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {items.map(item => {
                        const daysResult = differenceInDays(new Date(item.nextDueDate), new Date());

                        return (
                            <motion.div 
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors group"
                            >
                                <div className="flex justify-between items-start mb-4 relative">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold bg-white/5 border border-white/5 text-white`}>
                                            {item.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{item.name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <span>{item.frequency}</span>
                                                <span>•</span>
                                                <span className={item.type === 'EXPENSE' ? 'text-red-400' : 'text-emerald-400'}>
                                                    {item.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-3">
                                            <div className="text-xl font-bold font-mono text-white">
                                                ₹{item.amount.toLocaleString()}
                                            </div>
                                            <button 
                                                onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                                className="text-gray-500 hover:text-white p-1 -mr-2"
                                            >
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl">
                                    <div className={`text-xs font-bold flex items-center gap-2 px-2.5 py-1 rounded-lg ${getStatusColor(daysResult)}`}>
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {getStatusText(daysResult)}
                                    </div>
                                    
                                    <button
                                        onClick={() => initiatePayment(item)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 flex items-center gap-2 ${
                                            daysResult <= 0 
                                            ? "bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/10" 
                                            : "text-white border border-white/10 hover:bg-white/5"
                                        }`}
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Pay Now
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Edit Modal */}
        <RecurringModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={loadData}
            editingItem={editingItem}
        />

        {/* Payment Confirmation Modal */}
        {payModalOpen && itemToPay && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm bg-[#1c1c1e] rounded-2xl p-6 border border-white/10 shadow-xl"
                >
                    <h3 className="text-lg font-bold text-white mb-2">Confirm Payment</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        Paying <span className="text-white font-bold">{itemToPay.name}</span> of <span className="text-white font-bold">₹{itemToPay.amount}</span>.
                    </p>
                    
                    <div className="mb-6">
                        <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Pay From Account</label>
                        <select
                            value={selectedPayAccount}
                            onChange={e => setSelectedPayAccount(e.target.value)}
                            className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-colors"
                        >
                            <option value="">Select Account</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setPayModalOpen(false)}
                            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmPayment}
                            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-lg shadow-blue-500/20"
                        >
                            Confirm Payment
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
    </div>
  );
}
