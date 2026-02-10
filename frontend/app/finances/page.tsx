'use client';

import { useMemo } from 'react';
import Navbar from '../../components/Navbar';
import NativeHeader from '../../components/dashboard/NativeHeader';
import { useAccounts, useLoans, useCreditCards } from '../../hooks/useLocalData';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { Wallet, CreditCard, Landmark, ChevronRight, Plus, TrendingUp, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '../../lib/motion';

export default function FinancesPage() {
  const { user } = useAuth();
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

  // Net Position
  const netPosition = totalBankBalance - totalLoanOutstanding - totalCcOutstanding;

  if (loading) {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-24 selection:bg-purple-500 selection:text-white">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Native Header */}
        <NativeHeader 
            userName={user?.firstName || user?.username || 'User'} 
            photoUrl={user?.imageUrl}
            title="My Finances"
        />

        {/* Total Net Worth Card */}
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1c1c1e] rounded-3xl p-6 border border-white/5 relative overflow-hidden"
        >
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
             
             <div className="relative z-10">
                 <div className="text-gray-400 text-sm font-medium mb-1">Net Liquid Position</div>
                 <div className="text-3xl font-bold text-white mb-6">₹{netPosition.toLocaleString()}</div>
                 
                 <div className="grid grid-cols-3 gap-4">
                     <div>
                         <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Cash</div>
                         <div className="text-green-400 font-bold">₹{totalBankBalance.toLocaleString()}</div>
                     </div>
                     <div>
                         <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Loans</div>
                         <div className="text-white font-bold">₹{totalLoanOutstanding.toLocaleString()}</div>
                     </div>
                     <div>
                         <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">CC Debt</div>
                         <div className="text-red-400 font-bold">₹{totalCcOutstanding.toLocaleString()}</div>
                     </div>
                 </div>
             </div>
        </motion.div>

        {/* Bank Accounts */}
        <motion.section 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
        >
            <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Wallet className="h-5 w-5 text-blue-500" />
                    Accounts
                </h2>
                <Link href="/accounts" className="p-1.5 bg-[#1c1c1e] rounded-full hover:bg-white/10 transition-colors border border-white/5">
                    <Plus className="h-4 w-4 text-white" />
                </Link>
            </div>
            
            <div className="space-y-3">
                {data.accounts.length === 0 ? (
                    <div className="p-8 text-center bg-[#1c1c1e] rounded-3xl border border-white/5 text-gray-500 text-sm">
                        No bank accounts added
                    </div>
                ) : (
                    data.accounts.map(acc => (
                        <motion.div variants={fadeInUp} key={acc.id}>
                            <Link href={`/accounts`} className="block bg-[#1c1c1e] border border-white/5 p-4 rounded-3xl flex justify-between items-center hover:bg-white/5 transition-all group active:scale-[0.98]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-[15px]">{acc.name}</div>
                                        <div className="text-xs text-gray-500 uppercase font-medium tracking-wide">{acc.type}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-white">₹{Number(acc.balance).toLocaleString()}</div>
                                </div>
                            </Link>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.section>

        {/* Credit Cards */}
        <motion.section 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
        >
             <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                    <CreditCard className="h-5 w-5 text-purple-500" />
                    Credit Cards
                </h2>
                 <Link href="/credit-cards" className="p-1.5 bg-[#1c1c1e] rounded-full hover:bg-white/10 transition-colors border border-white/5">
                    <Plus className="h-4 w-4 text-white" />
                </Link>
            </div>
             <div className="space-y-3">
                {data.creditCards.length === 0 ? (
                     <div className="p-8 text-center bg-[#1c1c1e] rounded-3xl border border-white/5 text-gray-500 text-sm">
                        No credit cards added
                    </div>
                ) : (
                    data.creditCards.map(acc => (
                        <motion.div variants={fadeInUp} key={acc.id}>
                            <Link href={`/credit-cards/${acc.id}`} className="block bg-[#1c1c1e] border border-white/5 p-4 rounded-3xl flex justify-between items-center hover:bg-white/5 transition-all group active:scale-[0.98]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                     <div>
                                        <div className="font-bold text-white text-[15px]">{acc.bankName || acc.name}</div>
                                        <div className="text-xs text-gray-500">{acc.name}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Due</div>
                                    <div className="font-mono font-bold text-white">₹{Number(acc.currentOutstanding || 0).toLocaleString()}</div>
                                </div>
                            </Link>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.section>

         {/* Loans */}
        <motion.section 
             variants={staggerContainer}
             initial="initial"
             animate="animate"
        >
            <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Landmark className="h-5 w-5 text-orange-500" />
                    Loans
                </h2>
                 <Link href="/loans" className="p-1.5 bg-[#1c1c1e] rounded-full hover:bg-white/10 transition-colors border border-white/5">
                    <Plus className="h-4 w-4 text-white" />
                </Link>
            </div>
             <div className="space-y-3">
                {data.loans.length === 0 ? (
                     <div className="p-8 text-center bg-[#1c1c1e] rounded-3xl border border-white/5 text-gray-500 text-sm">
                        No active loans
                    </div>
                ) : (
                    data.loans.map(loan => (
                        <motion.div variants={fadeInUp} key={loan.id}>
                            <Link href={`/loans/${loan.id}`} className="block bg-[#1c1c1e] border border-white/5 p-4 rounded-3xl flex justify-between items-center hover:bg-white/5 transition-all group active:scale-[0.98]">
                                <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
                                        <Landmark className="w-5 h-5" />
                                    </div>
                                     <div>
                                        <div className="font-bold text-white text-[15px]">{loan.name}</div>
                                        <div className="text-xs text-gray-500">{loan.lender}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Outstanding</div>
                                    <div className="font-mono font-bold text-white">₹{Number(loan.outstandingPrincipal).toLocaleString()}</div>
                                </div>
                            </Link>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.section>
      </main>
    </div>
  );
}
