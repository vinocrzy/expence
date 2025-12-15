'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import AccountModal from '../../components/AccountModal';
import api from '../../lib/api';
import { Wallet, Plus, Pencil, Trash2, CreditCard, Banknote, Landmark, TrendingUp } from 'lucide-react';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } catch (error) {
      console.error('Failed to fetch accounts', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      await api.delete(`/accounts/${id}`);
      fetchAccounts();
    } catch (error) {
      console.error('Failed to delete account', error);
      alert('Failed to delete account');
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingAccount) {
        await api.put(`/accounts/${editingAccount.id}`, data);
      } else {
        await api.post('/accounts', data);
      }
      fetchAccounts();
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <div key={account.id} className="group bg-gray-800/50 backdrop-blur-md p-6 rounded-2xl border border-gray-700/50 hover:border-purple-500/30 transition-all relative overflow-hidden">
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="bg-gray-700 p-3 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                    {getIcon(account.type)}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => handleEdit(account)}
                        className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => handleDelete(account.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="relative z-10">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-medium">{account.type.replace('_', ' ')}</div>
                    <div className="text-xl font-bold text-white mb-1 truncate">{account.name}</div>
                    <div className={`text-2xl font-mono ${account.balance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {account.currency} {account.balance.toLocaleString()}
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
      </main>
    </div>
  );
}
