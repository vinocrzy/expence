'use client';

import { useState } from 'react';
import Navbar from '../../components/Navbar';
import LoanModal from '../../components/LoanModal';
import { useLoans, useAccounts } from '../../hooks/useLocalData';
import { Plus, Percent, Calendar, Landmark, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function LoansPage() {
  const { loans, loading: loansLoading, addLoan } = useLoans();
  const { accounts, loading: accountsLoading } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loading = loansLoading || accountsLoading;

  const handleCreate = async (data: any) => {
      await addLoan(data);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              Loans
            </h1>
            <p className="text-gray-400 text-sm mt-1">Track payments & EMIs</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all font-bold shadow-lg shadow-purple-500/10 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">New Loan</span>
          </button>
        </div>

        {loading ? (
             <div className="space-y-4">
                 {[1,2].map(i => <div key={i} className="h-48 bg-gray-900 rounded-3xl animate-pulse" />)}
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loans.map((loan, index) => {
                    const progress = loan.principal > 0 ? ((loan.principal - loan.outstandingPrincipal) / loan.principal) * 100 : 0;
                    
                    return (
                        <motion.div 
                            key={loan.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link href={`/loans/${loan.id}`} className="block group">
                                <div className="bg-[#18181b] border border-white/5 rounded-3xl p-6 hover:border-purple-500/30 transition-all relative overflow-hidden flex flex-col justify-between h-full">
                                    <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                                        <Landmark className="w-32 h-32" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">{loan.name}</h3>
                                                <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                                    <span className="bg-gray-800 px-2 py-0.5 rounded text-xs">{loan.lender}</span>
                                                    <span>•</span>
                                                    <span>{loan.type}</span>
                                                </div>
                                            </div>
                                            <div className="bg-gray-800/80 px-3 py-1.5 rounded-full text-xs font-bold text-gray-300 border border-gray-700/50">
                                                {loan.status}
                                            </div>
                                        </div>
                                        
                                        <div className="mb-6">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-3xl font-bold text-white tracking-tight">
                                                    ₹{Number(loan.outstandingPrincipal).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 mb-3 flex justify-between">
                                                <span>Outstanding Principal</span>
                                                <span className="text-green-400 font-medium">{Math.round(progress)}% Paid</span>
                                            </div>

                                            {/* Liquid Progress Bar */}
                                            <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 relative"
                                                >
                                                    <div className="absolute inset-0 bg-white/20" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)' }} />
                                                </motion.div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative z-10 bg-gray-900/50 rounded-2xl p-4 flex items-center justify-between border border-white/5">
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Monthly EMI</div>
                                            <div className="text-lg font-bold text-white">₹{Number(loan.emiAmount).toLocaleString()}</div>
                                        </div>
                                        <div className="h-8 w-[1px] bg-gray-700" />
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Interest</div>
                                            <div className="text-lg font-bold text-purple-400">{loan.interestRate}%</div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
                
                {loans.length === 0 && (
                     <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-800 rounded-3xl text-gray-500">
                        <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Landmark className="h-8 w-8 text-gray-600" />
                        </div>
                        <p>No active loans.</p>
                        <button onClick={() => setIsModalOpen(true)} className="mt-4 text-purple-400 font-bold hover:underline">
                            Add a Loan
                        </button>
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
