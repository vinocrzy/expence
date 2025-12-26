'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import LoanModal from '../../components/LoanModal';
import api from '../../lib/api';
import { Plus, Percent, Calendar, Landmark } from 'lucide-react';
import Link from 'next/link';

export default function LoansPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [loansRes, accountsRes] = await Promise.all([
        api.get('/loans'),
        api.get('/accounts')
      ]);
      setLoans(loansRes.data);
      setAccounts(accountsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
      await api.post('/loans', data);
      fetchData();
  };

  return (
    <div className="min-h-screen theme-wine text-white font-sans selection:bg-[var(--color-gold-500)] selection:text-black pb-20">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Landmark className="h-8 w-8 text-[var(--color-gold-500)]" />
            Loans
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-black bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 transition-all font-bold shadow-lg shadow-[var(--color-gold-500)]/20"
          >
            <Plus className="h-5 w-5" />
            New Loan
          </button>
        </div>

        {loading ? (
             <div className="text-center text-[var(--color-text-muted)] py-12">Loading loans...</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loans.map(loan => {
                    const progress = ((loan.principal - loan.outstandingPrincipal) / loan.principal) * 100;
                    return (
                        <Link href={`/loans/${loan.id}`} key={loan.id} className="block group">
                            <div className="bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] rounded-2xl p-6 hover:border-[var(--color-gold-500)]/50 transition-all shadow-xl hover:shadow-[var(--color-gold-500)]/10 backdrop-blur-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-[var(--color-gold-500)] transition-colors">{loan.name}</h3>
                                        <div className="text-sm text-[var(--color-text-muted)]">{loan.lender} • {loan.type}</div>
                                    </div>
                                    <div className="bg-[var(--color-wine-deep)] px-3 py-1 rounded-full text-xs font-bold text-[var(--color-text-muted)] border border-[var(--color-border-gold)]/30">
                                        {loan.status}
                                    </div>
                                </div>
                                
                                <div className="mb-6">
                                    <div className="flex justify-between text-sm text-[var(--color-text-muted)] mb-1">
                                        <span>Outstanding</span>
                                        <span>{Math.round(progress)}% Paid</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="flex justify-between mt-2">
                                        <div className="text-2xl font-bold text-[var(--color-gold-500)] font-mono">₹ {Number(loan.outstandingPrincipal).toLocaleString()}</div>
                                        <div className="text-sm text-[var(--color-text-muted)] text-right">
                                            of ₹ {Number(loan.principal).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-[var(--color-border-gold)]/30 pt-4">
                                    <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm">
                                        <Percent className="h-4 w-4 text-[var(--color-gold-500)]" />
                                        <span>{loan.interestRate}% Interest</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm justify-end">
                                        <Calendar className="h-4 w-4 text-[var(--color-gold-500)]" />
                                        <span>EMI: ₹{Number(loan.emiAmount).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
                
                {loans.length === 0 && (
                    <div className="col-span-full text-center py-12 border-2 border-dashed border-[var(--color-border-gold)]/50 rounded-3xl text-[var(--color-text-muted)] bg-[var(--color-wine-surface)]/30">
                        No active loans. Click "New Loan" to get started.
                    </div>
                )}
            </div>
        )}

        <LoanModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreate}
          accounts={accounts}
        />
      </main>
    </div>
  );
}
