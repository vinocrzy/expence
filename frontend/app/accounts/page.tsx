'use client';

import { useState } from 'react';
import Navbar from '../../components/Navbar';
import AccountModal from '../../components/AccountModal';
import { useAccounts } from '../../hooks/useLocalData';
import { accountService } from '../../lib/localdb-services';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Wallet, Plus, Pencil, Trash2, CreditCard, Banknote, Landmark, TrendingUp, Archive } from 'lucide-react';

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
        message: 'This account will be hidden from your main list, but its transaction history will be preserved. You can restore it later if needed.',
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
      // Check if account has transactions
      const hasTransactions = await accountService.hasTransactions(id);
      if (hasTransactions) {
        setTimeout(() => {
          setConfirmModal({
            isOpen: true,
            title: 'Cannot Delete Account',
            message: 'This account has linked transactions and cannot be permanently deleted to preserve history. Would you like to ARCHIVE it instead?',
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
        console.log("Creating account");
        
        await accountService.create(data);
        await refresh();
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save account', error);
      throw error;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'CREDIT_CARD': return <CreditCard className="h-6 w-6 text-white" />;
      case 'CASH_RESERVE': return <Banknote className="h-6 w-6 text-white" />;
      case 'INVESTMENT': return <TrendingUp className="h-6 w-6 text-white" />;
      case 'LOAN': return <Landmark className="h-6 w-6 text-white" />;
      default: return <Wallet className="h-6 w-6 text-white" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 pb-32 md:pb-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wallet className="h-8 w-8 text-purple-400" />
            Accounts
          </h1>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all font-bold shadow-lg shadow-purple-500/25"
          >
            <Plus className="h-5 w-5" />
            Add Account
          </button>
        </div>

        {loading ? (
           <div className="text-center text-gray-400 py-12">Loading accounts...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {accounts.map((account) => (
              <div key={account.id} className="group bg-gray-800/50 backdrop-blur-md p-6 rounded-2xl border border-gray-700/50 hover:border-purple-500/30 transition-all relative overflow-hidden">
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="bg-gray-700 p-3 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                    {getIcon(account.type)}
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <button 
                        onClick={() => handleEdit(account)}
                        className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => handleArchiveClick(account.id)}
                        className="p-2 rounded-lg hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-400 transition-colors"
                        title="Archive Account"
                    >
                        <Archive className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => handleDeleteClick(account.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete Account"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="relative z-10">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-medium">{account.type.replace('_', ' ')}</div>
                    <div className="text-xl font-bold text-white mb-1 truncate">{account.name}</div>
                    <div className={`text-2xl font-mono ${(account.balance || 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {account.currency} {(account.balance || 0).toLocaleString()}
                    </div>
                </div>
              </div>
            ))}
            
            {accounts.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-3xl">
                    <p>No accounts found. Create one to get started.</p>
                </div>
            )}
          </div>
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
