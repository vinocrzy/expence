'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../lib/api';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Plus, Target, Calendar, TrendingUp, AlertTriangle, CheckCircle2, Trash2, Archive, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '../../lib/motion';

// ... (imports)
import { useRouter } from 'next/navigation';

export default function BudgetsPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE, PLANNING
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDangerous: false,
    confirmText: 'Confirm'
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const res = await api.get('/budgets');
      setBudgets(res.data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const convertBudget = async (id: string) => {
      try {
          await api.post(`/budgets/${id}/convert`);
          fetchBudgets();
      } catch(e) {
          console.error(e);
      }
  };

  const handleDeleteClick = (id: string, isDraft: boolean) => {
    setConfirmModal({
        isOpen: true,
        title: isDraft ? 'Delete Draft Budget?' : 'Archive Active Budget?',
        message: isDraft 
            ? "Are you sure you want to delete this draft budget? This action cannot be undone." 
            : "Are you sure you want to archive this active budget? It will be removed from your active list, but all transaction history will be preserved.",
        isDangerous: isDraft, // Deleting is dangerous, Archiving is safer
        confirmText: isDraft ? 'Delete Draft' : 'Archive Budget',
        onConfirm: () => deleteBudget(id, isDraft)
    });
  };

  const deleteBudget = async (id: string, isDraft: boolean) => {
      const action = isDraft ? 'delete' : 'archive';
      try {
          await api.delete(`/budgets/${id}`);
          fetchBudgets();
      } catch (e) {
          console.error(e);
          alert(`Failed to ${action} budget`);
      }
  };

  const activeEvents = budgets.filter(b => b.type === 'EVENT' && b.isActive && b.status === 'ACTIVE');
  const recurringBudgets = budgets.filter(b => b.type === 'RECURRING' && b.isActive && b.status === 'ACTIVE');
  const plannedBudgets = budgets.filter(b => b.status === 'PLANNING' && b.isActive);

  return (
    <div className="min-h-screen theme-wine text-white font-sans pb-24">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
             <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl font-bold flex items-center gap-3"
            >
                <Target className="h-8 w-8 text-[var(--color-gold-500)]" />
                Budgets
            </motion.h1>
            <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] text-black rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-[var(--color-gold-500)]/20"
            >
                <Plus className="h-5 w-5" />
                {activeTab === 'PLANNING' ? 'Draft Budget' : 'Create Budget'}
            </button>
        </div>

        {/* Tabs */}
        {/* Tabs */}
        <div className="flex gap-4 border-b border-[var(--color-border-gold)] mb-8">
            <button 
                onClick={() => setActiveTab('ACTIVE')}
                className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'ACTIVE' ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
                Active Budgets
                {activeTab === 'ACTIVE' && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-gold-500)]" />
                )}
            </button>
            <button 
                onClick={() => setActiveTab('PLANNING')}
                className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'PLANNING' ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
                Budget Planner
                {activeTab === 'PLANNING' && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-gold-500)]" />
                )}
            </button>
        </div>

        {activeTab === 'PLANNING' ? (
            <motion.section 
                key="planning"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-4"
            >
                {plannedBudgets.length === 0 ? (
                     <div className="text-center py-16 bg-[var(--color-wine-surface)]/30 rounded-2xl border border-dashed border-[var(--color-border-gold)]/50">
                        <div className="w-16 h-16 bg-[var(--color-gold-500)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="h-8 w-8 text-[var(--color-gold-500)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--color-text-muted)]">No Planned Budgets</h3>
                        <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-sm mx-auto">
                            Use the planner to sandbox future events or monthly budgets without affecting your current tracking.
                        </p>
                    </div>
                ) : (
                    plannedBudgets.map(budget => (
                        <div key={budget.id} className="bg-[var(--color-wine-surface)] p-6 rounded-2xl border border-[var(--color-border-gold)] relative overflow-hidden group hover:border-[var(--color-gold-500)]/50 transition-colors">
                           <div className="absolute top-0 right-0 bg-[var(--color-gold-500)]/10 text-[var(--color-gold-500)] text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl border-l border-b border-[var(--color-border-gold)]">
                               Draft Mode
                           </div>
                           <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{budget.name}</h3>
                                    <div className="text-sm text-[var(--color-text-muted)] mt-1">
                                        {budget.type} • {budget.amount ? `₹${budget.amount.toLocaleString()}` : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(budget.id, true); }}
                                    className="px-3 py-1.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-red-400 flex items-center gap-1"
                                >
                                    <Trash2 className="h-3 w-3" /> Delete
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); router.push(`/budgets/${budget.id}/plan`); }}
                                    className="px-3 py-1.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-white"
                                >
                                    Edit Plan
                                </button>
                                <button 
                                    onClick={() => convertBudget(budget.id)}
                                    className="px-4 py-2 bg-[var(--color-wine-deep)] hover:bg-white/5 border border-[var(--color-border-gold)] text-[var(--color-gold-500)] text-sm font-bold rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    Convert to Active <CheckCircle2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </motion.section>
        ) : (
            <>
                {/* Event Budgets */}
        {activeEvents.length > 0 && (
            <motion.section 
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="mb-12"
            >
                <h2 className="text-xl font-bold text-[var(--color-text-muted)] mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[var(--color-gold-500)]" />
                    Active Events
                </h2>
                <div className="grid gap-4">
                    {activeEvents.map(budget => (
                        <motion.div 
                            variants={fadeInUp} 
                            key={budget.id} 
                            onClick={() => router.push(`/budgets/${budget.id}`)}
                            className="bg-[var(--color-wine-surface)] p-6 rounded-2xl border border-[var(--color-border-gold)] cursor-pointer hover:border-[var(--color-gold-500)]/50 transition-colors backdrop-blur-sm shadow-md"
                        >
                           {/* ... (Existing Card Content) ... */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{budget.name}</h3>
                                    <div className="text-sm text-[var(--color-text-muted)] mt-1">
                                        {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold font-mono text-[var(--color-gold-500)]">₹{budget.amount.toLocaleString()}</div>
                                    <div className="text-xs text-[var(--color-text-muted)] uppercase flex items-center justify-end gap-2 mt-1">
                                        Target
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(budget.id, false); }}
                                            className="p-1 hover:text-red-400 text-[var(--color-text-muted)] transition-colors"
                                            title="Archive Budget"
                                        >
                                            <Archive className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mb-2">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-[var(--color-text-muted)]">Spent: ₹{budget.spent.toLocaleString()}</span>
                                    <span className={budget.spent > budget.amount ? 'text-red-400 font-bold' : 'text-green-400'}>
                                        {Math.round((budget.spent / budget.amount) * 100)}%
                                    </span>
                                </div>
                                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${budget.spent > budget.amount ? 'bg-red-500' : 'bg-[var(--color-gold-500)]'}`}
                                        style={{ width: `${Math.min((budget.spent / budget.amount) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                            
                            {budget.spent > budget.amount && (
                                <div className="flex items-center gap-2 text-red-400 text-sm mt-2 font-bold bg-red-500/10 p-2 rounded-lg">
                                    <AlertTriangle className="h-4 w-4" />
                                    Over Budget by ₹{(budget.spent - budget.amount).toLocaleString()}
                                </div>
                            )}

                             {/* Hint Text */}
                            <div className="text-xs text-[var(--color-text-muted)] mt-4 text-center opacity-70">
                                Tap to view full breakdown
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.section>
        )}

        {/* ... (Recurring placeholder) ... */}
         <section className="mb-8">
             <h2 className="text-xl font-bold text-[var(--color-text-muted)] mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-[var(--color-gold-500)]" />
                Recurring Budgets
            </h2>
            {recurringBudgets.length === 0 ? (
                <div className="text-center py-12 bg-[var(--color-wine-surface)]/50 rounded-2xl border border-[var(--color-border-gold)]/30 border-dashed">
                    <p className="text-[var(--color-text-muted)]">No recurring budgets set. Create one to track monthly category spending.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                     {/* Render recurring budgets here similarly */}
                     {recurringBudgets.map(b => (
                         <div key={b.id} className="bg-[var(--color-wine-surface)] p-4 rounded-xl border border-[var(--color-border-gold)]">
                             {b.name} - ₹{b.amount}
                         </div>
                     ))}
                </div>
            )}
        </section>
        </>
      )}

      </main>

      {showCreateModal && (
          <CreateBudgetModal onClose={() => setShowCreateModal(false)} onSuccess={fetchBudgets} initialStatus={activeTab} />
      )}
      
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDangerous={confirmModal.isDangerous}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
}

function BudgetTransactionsModal({ budget, onClose }: any) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[var(--color-wine-surface)] rounded-2xl w-full max-w-lg p-6 border border-[var(--color-border-gold)] shadow-2xl max-h-[80vh] flex flex-col"
            >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--color-border-gold)]">
                    <div>
                        <h2 className="text-xl font-bold">{budget.name}</h2>
                        <span className="text-sm text-[var(--color-text-muted)]">Transactions</span>
                    </div>
                     <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-[var(--color-text-muted)] hover:text-white">
                        <Plus className="h-6 w-6 rotate-45" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {budget.transactions && budget.transactions.length > 0 ? (
                        budget.transactions.map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between p-3 bg-[var(--color-wine-deep)]/50 rounded-xl border border-[var(--color-border-gold)]/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-wine-surface)] text-lg border border-[var(--color-border-gold)]/20 text-[var(--color-gold-500)]">
                                        {/* Simple icon or first letter */}
                                        {t.category?.name?.[0] || '?'}
                                    </div>
                                    <div>
                                        <div className="font-bold">{t.description || t.category?.name || 'Unknown'}</div>
                                        <div className="text-xs text-[var(--color-text-muted)]">{new Date(t.date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className={`font-mono font-bold ${t.type === 'INCOME' ? 'text-green-400' : 'text-white'}`}>
                                    {t.type === 'EXPENSE' ? '-' : '+'}₹{Number(t.amount).toLocaleString()}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-[var(--color-text-muted)]">
                            No transactions tagged to this budget yet.
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// ... CreateBudgetModal ...

function CreateBudgetModal({ onClose, onSuccess, initialStatus }: any) {
    const [name, setName] = useState('');
    const [type, setType] = useState('EVENT'); 
    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState(initialStatus || 'ACTIVE');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/budgets', {
                name, type, amount: parseFloat(amount), startDate, endDate, status
            });
            onClose(); // Close first
            await onSuccess(); // Then refresh
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[var(--color-wine-surface)] rounded-2xl w-full max-w-md p-6 border border-[var(--color-border-gold)]">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-[var(--color-gold-500)]" />
                    Create New Budget
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-[var(--color-text-muted)]">Budget Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] p-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" required placeholder="e.g. Goa Trip" />
                    </div>
                    
                     <div>
                         <label className="text-sm text-[var(--color-text-muted)]">Status</label>
                         <select 
                            value={status} 
                            onChange={(e) => setStatus(e.target.value)} 
                            className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] p-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
                         >
                             <option value="ACTIVE">Active (Live Tracking)</option>
                             <option value="PLANNING">Planner (Sandbox)</option>
                         </select>
                         <div className="text-[10px] text-[var(--color-text-muted)] mt-1 opacity-70">
                             Use the tabs on the main screen to create different budget types.
                         </div>
                    </div>

                    <div>
                         <label className="text-sm text-[var(--color-text-muted)]">Type</label>
                         <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] p-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50">
                             <option value="EVENT">Event (One-time)</option>
                             <option value="RECURRING">Recurring (Monthly)</option>
                         </select>
                    </div>
                    <div>
                        <label className="text-sm text-[var(--color-text-muted)]">Total Amount</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] p-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" required placeholder="10000" />
                    </div>
                    
                    {type === 'EVENT' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-[var(--color-text-muted)]">Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] p-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" required />
                            </div>
                            <div>
                                <label className="text-sm text-[var(--color-text-muted)]">End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] p-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" required />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-[var(--color-text-muted)] hover:text-white transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] text-black rounded-lg font-bold hover:brightness-110 shadow-lg shadow-[var(--color-gold-500)]/20 transition-all">
                            {loading ? 'Creating...' : 'Create Budget'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
