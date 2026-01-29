'use client';

import { useMemo } from 'react';
import Navbar from '../../components/Navbar';
import { useAccounts, useLoans, useCreditCards } from '../../hooks/useLocalData';
import Link from 'next/link';
import { Wallet, CreditCard, Landmark, ChevronRight, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '../../lib/motion';

export default function FinancesPage() {
  const { accounts: allAccounts, loading: accountsLoading } = useAccounts();
  const { loans, loading: loansLoading } = useLoans();
  const { creditCards, loading: cardsLoading } = useCreditCards();
  
  const loading = accountsLoading || loansLoading || cardsLoading;
  
  const data = useMemo(() => {
    const bankAccounts = allAccounts.filter((a: any) => a.type !== 'CREDIT_CARD');
    return {
      accounts: bankAccounts,
      loans: loans,
      creditCards: creditCards
    };
  }, [allAccounts, loans, creditCards]);

  const totalBankBalance = data.accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalLoanOutstanding = data.loans.reduce((sum, l) => sum + Number(l.outstandingPrincipal), 0);
  const totalCcOutstanding = data.creditCards.reduce((sum, c) => sum + Number(c.currentOutstanding || 0), 0);

  if (loading) {
      return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans pb-24">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 py-4 md:py-8 pb-32 md:pb-8">
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
             <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700/50">
                 <div className="text-xs text-gray-400 mb-1">Cash & Bank</div>
                 <div className="text-lg font-bold text-green-400">₹{totalBankBalance.toLocaleString()}</div>
             </div>
             <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700/50">
                 <div className="text-xs text-gray-400 mb-1">Loan Debt</div>
                 <div className="text-lg font-bold text-white">₹{totalLoanOutstanding.toLocaleString()}</div>
             </div>
             <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700/50">
                 <div className="text-xs text-gray-400 mb-1">CC Debt</div>
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
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-blue-400" />
                    Accounts
                </h2>
                <Link href="/accounts" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <Plus className="h-4 w-4 text-gray-400" />
                </Link>
            </div>
            <div className="space-y-3">
                {data.accounts.map(acc => (
                    <motion.div variants={fadeInUp} key={acc.id}>
                        <Link href={`/accounts`} className="block bg-gray-800 border border-gray-700/50 p-4 rounded-xl flex justify-between items-center hover:bg-gray-750 transition-colors group">
                            <div>
                                <div className="font-bold text-white group-hover:text-blue-300 transition-colors">{acc.name}</div>
                                <div className="text-sm text-gray-400 uppercase">{acc.type}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="font-mono font-bold">₹{Number(acc.balance).toLocaleString()}</div>
                                <div className="p-1 rounded-full bg-gray-700 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                                     <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-blue-400" />
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
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-400" />
                    Credit Cards
                </h2>
                 <Link href="/credit-cards" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <Plus className="h-4 w-4 text-gray-400" />
                </Link>
            </div>
             <div className="space-y-3">
                {data.creditCards.map(acc => (
                    <motion.div variants={fadeInUp} key={acc.id}>
                        <Link href={`/credit-cards/${acc.id}`} className="block bg-gray-800 border border-gray-700/50 p-4 rounded-xl flex justify-between items-center hover:bg-gray-750 transition-colors group">
                             <div>
                                <div className="font-bold text-white group-hover:text-purple-300 transition-colors">{acc.bankName || acc.name}</div>
                                <div className="text-sm text-gray-400">{acc.name}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                 <div className="text-right">
                                    <div className="text-xs text-gray-500">Outstanding</div>
                                    <div className="font-mono font-bold text-white">₹{Number(acc.currentOutstanding || 0).toLocaleString()}</div>
                                </div>
                                <div className="p-1 rounded-full bg-gray-700 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors">
                                    <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-purple-400" />
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
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-orange-400" />
                    Loans
                </h2>
                 <Link href="/loans" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <Plus className="h-4 w-4 text-gray-400" />
                </Link>
            </div>
             <div className="space-y-3">
                {data.loans.map(loan => (
                    <motion.div variants={fadeInUp} key={loan.id}>
                        <Link href={`/loans/${loan.id}`} className="block bg-gray-800 border border-gray-700/50 p-4 rounded-xl flex justify-between items-center hover:bg-gray-750 transition-colors group">
                             <div>
                                <div className="font-bold text-white group-hover:text-orange-300 transition-colors">{loan.name}</div>
                                <div className="text-sm text-gray-400">{loan.lender} • {loan.type}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-xs text-gray-500">Outstanding</div>
                                    <div className="font-mono font-bold text-white">₹{Number(loan.outstandingPrincipal).toLocaleString()}</div>
                                </div>
                                <div className="p-1 rounded-full bg-gray-700 group-hover:bg-orange-500/20 group-hover:text-orange-400 transition-colors">
                                    <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-orange-400" />
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
