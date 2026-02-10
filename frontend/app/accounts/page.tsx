'use client';

import { useState } from 'react';
import Navbar from '../../components/Navbar';
import NativeHeader from '../../components/dashboard/NativeHeader';
import AccountModal from '../../components/AccountModal';
import { useAccounts } from '../../hooks/useLocalData';
import { accountService } from '../../lib/localdb-services';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Plus, Pencil, Trash2, Archive, Wifi, CreditCard, Wallet, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"; // Using native implementation logic if this path doesn't exist, but we deleted UI folder. I will use standard standard div/button logic or simpler menu if needed. Wait, I deleted ui folder. I should implement a simple native dropdown or just use action buttons. The plan said "stacked list". I'll use a direct action menu or simple buttons.

// Let's stick to standard Tailwind for dropdown to avoid dependency issues since I deleted shadcn.

export default function AccountsPage() {
  const { accounts, loading, updateAccount, deleteAccount, refresh } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDangerous: false,
    confirmText: 'Confirm'
  });

  const handleCreate = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleArchiveClick = (id: string) => {
    setConfirmModal({
        isOpen: true,
        title: 'Archive Account?',
        message: 'This account will be hidden from your main list, but its transaction history will be preserved.',
        isDangerous: false,
        confirmText: 'Archive',
        onConfirm: () => handleArchive(id)
    });
  };

  const handleDeleteClick = (id: string) => {
    setConfirmModal({
        isOpen: true,
        title: 'Delete Account?',
        message: 'Are you sure you want to delete this account? This action cannot be undone.',
        isDangerous: true,
        confirmText: 'Delete',
        onConfirm: () => handleDelete(id)
    });
  };

  const handleArchive = async (id: string) => {
    try {
        await updateAccount(id, { isArchived: true });
    } catch (e) {
        console.error(e);
        alert('Failed to archive account');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const hasTransactions = await accountService.hasTransactions(id);
      if (hasTransactions) {
        setTimeout(() => {
          setConfirmModal({
            isOpen: true,
            title: 'Cannot Delete Account',
            message: 'This account has linked transactions and cannot be permanently deleted. Would you like to ARCHIVE it instead?',
            isDangerous: false,
            confirmText: 'Archive Instead',
            onConfirm: () => handleArchive(id)
          });
        }, 200);
      } else {
        await deleteAccount(id);
      }
    } catch (error: any) {
      console.error('Failed to delete account', error);
      alert('Failed to delete account');
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, data);
      } else {
        await accountService.create(data);
        await refresh();
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save account', error);
      throw error;
    }
  };

  // Card Gradient Generator based on Type/Index
  const getCardStyle = (account: any, index: number) => {
      if (account.type === 'CREDIT_CARD') {
          return 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700';
      }
      if (account.type === 'CASH_RESERVE' || account.type === 'WALLET') {
          return 'bg-gradient-to-br from-emerald-900 to-emerald-800 border-emerald-700/50';
      }
      if (account.type === 'INVESTMENT') {
          return 'bg-gradient-to-br from-indigo-900 to-purple-900 border-indigo-700/50';
      }
      // Default / Checking
      const gradients = [
          'from-blue-900 to-blue-800',
          'from-purple-900 to-purple-800',
          'from-cyan-900 to-cyan-800',
      ];
      return `bg-gradient-to-br ${gradients[index % gradients.length]} border-white/10`;
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <NativeHeader title="Your Wallet" />
        <div className="flex flex-col gap-4 mb-6 hidden md:flex">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 w-fit">
                Your Wallet
            </h1>
            <p className="text-gray-400 text-sm -mt-2">Manage your accounts and cards</p>
        </div>

        {loading ? (
           <div className="flex flex-col gap-4">
               {[1,2,3].map(i => (
                   <div key={i} className="h-48 w-full bg-gray-900 rounded-3xl animate-pulse" />
               ))}
           </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Add New Card (First Item) */}
                <button
                    onClick={handleCreate}
                    className="group relative h-56 rounded-3xl border-2 border-dashed border-gray-800 hover:border-gray-700 hover:bg-gray-900/50 transition-all flex flex-col items-center justify-center gap-3"
                >
                    <div className="w-12 h-12 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors">
                        <Plus className="h-6 w-6 text-gray-400 group-hover:text-white" />
                    </div>
                    <span className="font-medium text-gray-500 group-hover:text-gray-300">Add New Account</span>
                </button>

                {accounts.map((account, index) => (
                    <motion.div
                        key={account.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleEdit(account)}
                        className={clsx(
                            "relative h-56 rounded-3xl p-6 flex flex-col justify-between shadow-2xl overflow-hidden cursor-pointer group border transition-all hover:scale-[1.02]",
                            getCardStyle(account, index)
                        )}
                    >
                        {/* Background Decoration */}
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
                        
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="flex items-center gap-2 text-white/70">
                                {account.type === 'CREDIT_CARD' ? <CreditCard className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                                <span className="text-xs font-bold tracking-widest uppercase opacity-80">{account.type.replace('_', ' ')}</span>
                            </div>
                            
                            {/* Actions Menu Trigger (Visual only, simulates chip if no actions needed, but we need edit/delete) */}
                            {/* We'll use a simple row of refined buttons for quick actions instead of a menu for speed */}
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                <button onClick={() => handleEdit(account)} className="p-1.5 bg-black/20 hover:bg-black/40 rounded-lg text-white/80">
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteClick(account.id)} className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-200">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="relative z-10 space-y-1">
                             {/* Chip Simulation */}
                             <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500 opacity-80 mb-4 shadow-sm flex items-center justify-center">
                                <div className="w-8 h-px bg-black/10 rounded-full" />
                             </div>

                             <h3 className="text-2xl font-bold text-white tracking-wide truncate" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {account.name}
                             </h3>
                             <p className="text-white/60 text-sm font-mono tracking-wider">
                                **** **** **** {account.id.slice(-4).toUpperCase()}
                             </p>
                        </div>

                        <div className="relative z-10 flex justify-between items-end mt-4">
                            <div>
                                <span className="text-[10px] text-white/50 uppercase block font-bold">Current Balance</span>
                                <span className={clsx(
                                    "text-xl font-mono font-medium tracking-tight",
                                    (account.balance || 0) < 0 ? "text-red-300" : "text-white"
                                )}>
                                    {account.currency} {(account.balance || 0).toLocaleString()}
                                </span>
                            </div>
                            
                            {/* Contactless Icon */}
                            <Wifi className="w-6 h-6 text-white/30 rotate-90" />
                        </div>
                    </motion.div>
                ))}
            </div>
            
            {accounts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <p>Get started by adding your first bank account or wallet.</p>
                </div>
            )}
          </>
        )}

        <AccountModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingAccount}
        />
        
        <ConfirmationModal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmModal.onConfirm}
            title={confirmModal.title}
            message={confirmModal.message}
            isDangerous={confirmModal.isDangerous}
            confirmText={confirmModal.confirmText}
        />
      </main>
    </div>
  );
}
