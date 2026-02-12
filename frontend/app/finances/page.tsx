'use client';

import { useMemo } from 'react';
import Navbar from '../../components/Navbar';
import NativeHeader from '../../components/dashboard/NativeHeader';
import { useAccounts, useLoans, useCreditCards } from '../../hooks/useLocalData';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { 
  calculateTotalLiquidCash, 
  calculateTotalCreditCardDebt, 
  calculateAvailableBalance,
  calculateTotalLoanOutstanding
} from '../../lib/financial-math';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, Landmark, Plus, ChevronRight, TrendingUp, AlertCircle } from 'lucide-react';
import { staggerContainer, fadeInUp } from '../../lib/motion';

export default function FinancesPage() {
  const { user } = useAuth();
  const { accounts: allAccounts, loading: accountsLoading } = useAccounts();
  const { loans, loading: loansLoading } = useLoans();
  const { creditCards, loading: cardsLoading } = useCreditCards();
  
  const loading = accountsLoading || loansLoading || cardsLoading;
  
  const { bankAccounts, allLoans, allCreditCards } = useMemo(() => {
    // Filter out archived and credit cards from accounts
    const banks = allAccounts.filter((a: any) => a.type !== 'CREDIT_CARD' && !a.isArchived);
    const activeLoans = loans.filter((l: any) => !l.isArchived); // Assuming loans have isArchived
    const activeCreditCards = creditCards.filter((c: any) => !c.isArchived);

    return {
      bankAccounts: banks,
      allLoans: activeLoans,
      allCreditCards: activeCreditCards
    };
  }, [allAccounts, loans, creditCards]);

  // Calculate totals using shared utility
  const totalLiquidCash = calculateTotalLiquidCash(bankAccounts);
  const totalCreditCardDebt = calculateTotalCreditCardDebt(allCreditCards);
  const availableBalance = calculateAvailableBalance(bankAccounts, allCreditCards);
  const totalLoanOutstanding = calculateTotalLoanOutstanding(allLoans);
  
  const netAvailableBalance = availableBalance;
  const totalDebt = totalCreditCardDebt + totalLoanOutstanding;

  // if (loading) return ... (Removed blocking loader)

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32 md:pb-8 selection:bg-purple-500 selection:text-white">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Native Header */}
        <NativeHeader 
            title="My Finances"
        />

        {/* Net Available Balance */}
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-6 shadow-lg shadow-purple-500/20 relative overflow-hidden"
        >
             {loading ? (
                 <div className="animate-pulse">
                     <div className="h-4 w-32 bg-white/20 rounded mb-2"></div>
                     <div className="h-8 w-48 bg-white/20 rounded mb-2"></div>
                     <div className="h-3 w-40 bg-white/20 rounded"></div>
                 </div>
             ) : (
                 <div className="relative z-10 flex justify-between items-center">
                    <div>
                         <div className="text-blue-100 text-sm font-medium mb-1">Available Balance</div>
                         <div className="text-3xl font-bold text-white tracking-tight">
                            ₹{(totalLiquidCash - totalCreditCardDebt).toLocaleString()}
                         </div>
                         <div className="text-xs text-blue-200 mt-1">Total Cash - Credit Card Due</div>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                        <Wallet className="w-8 h-8 text-white" />
                    </div>
                 </div>
             )}
        </motion.div>

        {/* Total Cash & CC Due Hero */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#1c1c1e] rounded-3xl p-6 border border-white/5 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/10 rounded-xl text-green-400">
                            <Landmark className="w-5 h-5" />
                        </div>
                        <span className="text-gray-400 text-sm font-medium">Total Cash Assets</span>
                    </div>
                    {loading ? (
                        <div className="h-8 w-32 bg-white/10 rounded animate-pulse"></div>
                    ) : (
                        <div className="text-3xl font-bold text-white tracking-tight">
                            ₹{totalLiquidCash.toLocaleString()}
                        </div>
                    )}
                </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#1c1c1e] rounded-3xl p-6 border border-white/5 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-500/10 rounded-xl text-red-400">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <span className="text-gray-400 text-sm font-medium">Total Credit Card Due</span>
                    </div>
                    {loading ? (
                        <div className="h-8 w-32 bg-white/10 rounded animate-pulse"></div>
                    ) : (
                        <div className="text-3xl font-bold text-white tracking-tight">
                            ₹{totalCreditCardDebt.toLocaleString()}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>

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
                {loading ? (
                     [1, 2].map(i => (
                        <div key={i} className="bg-[#1c1c1e] border border-white/5 p-4 rounded-3xl flex justify-between items-center animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white/10"></div>
                                <div>
                                    <div className="h-4 w-32 bg-white/10 rounded mb-2"></div>
                                    <div className="h-3 w-20 bg-white/10 rounded"></div>
                                </div>
                            </div>
                            <div className="h-5 w-24 bg-white/10 rounded"></div>
                        </div>
                     ))
                ) : bankAccounts.length === 0 ? (
                    <div className="p-8 text-center bg-[#1c1c1e] rounded-3xl border border-white/5 text-gray-500 text-sm">
                        No bank accounts added
                    </div>
                ) : (
                    bankAccounts.map((account: any) => (
                        <motion.div variants={fadeInUp} key={account.id}>
                            <Link href={`/accounts/${account.id}`} className="block bg-[#1c1c1e] border border-white/5 p-4 rounded-3xl flex justify-between items-center hover:bg-white/5 transition-all group active:scale-[0.98]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-[15px]">{account.name}</div>
                                        <div className="text-xs text-gray-500 capitalize">{account.type?.replace('_', ' ').toLowerCase()}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-white">₹{Number(account.balance).toLocaleString()}</div>
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
                {loading ? (
                     <div className="bg-[#1c1c1e] border border-white/5 p-4 rounded-3xl flex justify-between items-center animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10"></div>
                            <div>
                                <div className="h-4 w-32 bg-white/10 rounded mb-2"></div>
                                <div className="h-3 w-20 bg-white/10 rounded"></div>
                            </div>
                        </div>
                        <div className="h-5 w-24 bg-white/10 rounded"></div>
                    </div>
                ) : allCreditCards.length === 0 ? (
                     <div className="p-8 text-center bg-[#1c1c1e] rounded-3xl border border-white/5 text-gray-500 text-sm">
                        No credit cards added
                    </div>
                ) : (
                    allCreditCards.map(card => (
                        <motion.div variants={fadeInUp} key={card.id}>
                            <Link href={`/credit-cards/${card.id}`} className="block bg-[#1c1c1e] border border-white/5 p-4 rounded-3xl flex justify-between items-center hover:bg-white/5 transition-all group active:scale-[0.98]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                     <div>
                                        <div className="font-bold text-white text-[15px]">{card.bankName || card.name}</div>
                                        <div className="text-xs text-gray-500">{card.name}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Due</div>
                                    <div className="font-mono font-bold text-white">₹{Number(card.currentOutstanding || 0).toLocaleString()}</div>
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
                {loading ? (
                     <div className="bg-[#1c1c1e] border border-white/5 p-4 rounded-3xl flex justify-between items-center animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10"></div>
                            <div>
                                <div className="h-4 w-32 bg-white/10 rounded mb-2"></div>
                                <div className="h-3 w-20 bg-white/10 rounded"></div>
                            </div>
                        </div>
                        <div className="h-5 w-24 bg-white/10 rounded"></div>
                    </div>
                ) : allLoans.length === 0 ? (
                     <div className="p-8 text-center bg-[#1c1c1e] rounded-3xl border border-white/5 text-gray-500 text-sm">
                        No active loans
                    </div>
                ) : (
                    allLoans.map((loan: any, index: number) => (
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
