'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../lib/api';
import Link from 'next/link';
import { Wallet, CreditCard, Landmark, ChevronRight, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '../../lib/motion';

export default function FinancesPage() {
  const [data, setData] = useState<{
      accounts: any[];
      loans: any[];
      creditCards: any[];
  }>({ accounts: [], loans: [], creditCards: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, loansRes, cardsRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/loans'),
        api.get('/credit-cards')
      ]);
      
      const allAccounts = accountsRes.data;
      const bankAccounts = allAccounts.filter((a: any) => a.type !== 'CREDIT_CARD');
      const ccAccounts = cardsRes.data; 
      
      setData({
          accounts: bankAccounts,
          loans: loansRes.data,
          creditCards: ccAccounts
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalBankBalance = data.accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalLoanOutstanding = data.loans.reduce((sum, l) => sum + Number(l.outstandingPrincipal), 0);
  const totalCcOutstanding = data.creditCards.reduce((sum, c) => sum + Number(c.creditCard?.outstandingAmount || 0), 0);

  if (loading) {
      return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
      );
  }

  return (
    <div className="min-h-screen text-white font-sans pb-24">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 py-8">
        <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold mb-8"
        >
            Finances
        </motion.h1>

        {/* Summary Header */}
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8"
        >
             <div className="bg-[var(--color-wine-surface)] p-4 rounded-2xl border border-[var(--color-border-gold)] backdrop-blur-sm">
                 <div className="text-xs text-[var(--color-text-muted)] mb-1">Cash & Bank</div>
                 <div className="text-lg font-bold text-green-400">₹{totalBankBalance.toLocaleString()}</div>
             </div>
             <div className="bg-[var(--color-wine-surface)] p-4 rounded-2xl border border-[var(--color-border-gold)] backdrop-blur-sm">
                 <div className="text-xs text-[var(--color-text-muted)] mb-1">Loan Debt</div>
                 <div className="text-lg font-bold text-white">₹{totalLoanOutstanding.toLocaleString()}</div>
             </div>
             <div className="bg-[var(--color-wine-surface)] p-4 rounded-2xl border border-[var(--color-border-gold)] backdrop-blur-sm">
                 <div className="text-xs text-[var(--color-text-muted)] mb-1">CC Debt</div>
                 <div className="text-lg font-bold text-red-400">₹{totalCcOutstanding.toLocaleString()}</div>
             </div>
        </motion.div>

        {/* Bank Accounts */}
        <motion.section 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="mb-8"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    <Wallet className="h-5 w-5 text-[var(--color-gold-500)]" />
                    Accounts
                </h2>
                <Link href="/accounts" className="p-2 bg-white/5 rounded-lg hover:bg-[var(--color-gold-500)]/10 text-[var(--color-text-muted)] hover:text-[var(--color-gold-500)] transition-colors">
                    <Plus className="h-4 w-4" />
                </Link>
            </div>
            <div className="space-y-3">
                {data.accounts.map(acc => (
                    <motion.div variants={fadeInUp} key={acc.id}>
                        <Link href={`/accounts`} className="block bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] p-4 rounded-xl flex justify-between items-center hover:bg-white/5 transition-colors group">
                            <div>
                                <div className="font-bold text-white group-hover:text-[var(--color-gold-500)] transition-colors">{acc.name}</div>
                                <div className="text-sm text-[var(--color-text-muted)] uppercase">{acc.type}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="font-mono font-bold text-white">₹{Number(acc.balance).toLocaleString()}</div>
                                <div className="p-1 rounded-full bg-white/5 group-hover:bg-[var(--color-gold-500)]/20 group-hover:text-[var(--color-gold-500)] transition-colors">
                                     <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-gold-500)]" />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </motion.section>

        {/* Credit Cards */}
        <motion.section 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="mb-8"
        >
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    <CreditCard className="h-5 w-5 text-purple-400" />
                    Credit Cards
                </h2>
                 <Link href="/credit-cards" className="p-2 bg-white/5 rounded-lg hover:bg-purple-500/10 text-[var(--color-text-muted)] hover:text-purple-400 transition-colors">
                    <Plus className="h-4 w-4" />
                </Link>
            </div>
             <div className="space-y-3">
                {data.creditCards.map(acc => (
                    <motion.div variants={fadeInUp} key={acc.id}>
                        <Link href={`/credit-cards/${acc.creditCard?.accountId}`} className="block bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] p-4 rounded-xl flex justify-between items-center hover:bg-white/5 transition-colors group">
                             <div>
                                <div className="font-bold text-white group-hover:text-purple-300 transition-colors">{acc.creditCard?.issuer || acc.name}</div>
                                <div className="text-sm text-[var(--color-text-muted)]">{acc.name}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                 <div className="text-right">
                                    <div className="text-xs text-[var(--color-text-muted)]">Outstanding</div>
                                    <div className="font-mono font-bold text-white">₹{Number(acc.creditCard?.outstandingAmount || 0).toLocaleString()}</div>
                                </div>
                                <div className="p-1 rounded-full bg-white/5 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors">
                                    <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-purple-400" />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </motion.section>

         {/* Loans */}
        <motion.section 
             variants={staggerContainer}
             initial="initial"
             animate="animate"
             className="mb-8"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    <Landmark className="h-5 w-5 text-orange-400" />
                    Loans
                </h2>
                 <Link href="/loans" className="p-2 bg-white/5 rounded-lg hover:bg-orange-500/10 text-[var(--color-text-muted)] hover:text-orange-400 transition-colors">
                    <Plus className="h-4 w-4" />
                </Link>
            </div>
             <div className="space-y-3">
                {data.loans.map(loan => (
                    <motion.div variants={fadeInUp} key={loan.id}>
                        <Link href={`/loans/${loan.id}`} className="block bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] p-4 rounded-xl flex justify-between items-center hover:bg-white/5 transition-colors group">
                             <div>
                                <div className="font-bold text-white group-hover:text-orange-300 transition-colors">{loan.name}</div>
                                <div className="text-sm text-[var(--color-text-muted)]">{loan.lender} • {loan.type}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-xs text-[var(--color-text-muted)]">Outstanding</div>
                                    <div className="font-mono font-bold text-white">₹{Number(loan.outstandingPrincipal).toLocaleString()}</div>
                                </div>
                                <div className="p-1 rounded-full bg-white/5 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                                    <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-orange-400" />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </motion.section>
      </main>
    </div>
  );
}
