'use client';

import { useState } from 'react';
import Navbar from '../../components/Navbar';
import LoanModal from '../../components/LoanModal';
import { useLoans, useAccounts } from '../../hooks/useLocalData';
import { Plus, Percent, Calendar, Landmark } from 'lucide-react';
import Link from 'next/link';

export default function LoansPage() {
  const { loans, loading: loansLoading, addLoan } = useLoans();
  const { accounts, loading: accountsLoading } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const loading = loansLoading || accountsLoading;

  const handleCreate = async (data: any) => {
      await addLoan(data);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white pb-20">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Loans
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-purple-600 hover:bg-purple-500 transition-all font-bold shadow-lg shadow-purple-500/25"
          >
            <Plus className="h-5 w-5" />
            New Loan
          </button>
        </div>

        {loading ? (
             <div className="text-center text-gray-500 py-12">Loading loans...</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loans.map(loan => {
                    const progress = ((loan.principal - loan.outstandingPrincipal) / loan.principal) * 100;
                    return (
                        <Link href={`/loans/${loan.id}`} key={loan.id} className="block group">
                            <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-all shadow-lg hover:shadow-purple-500/10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">{loan.name}</h3>
                                        <div className="text-sm text-gray-400">{loan.lender} • {loan.type}</div>
                                    </div>
                                    <div className="bg-gray-700 px-3 py-1 rounded-full text-xs font-bold text-gray-300">
                                        {loan.status}
                                    </div>
                                </div>
                                
                                <div className="mb-6">
                                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                                        <span>Outstanding</span>
                                        <span>{Math.round(progress)}% Paid</span>
                                    </div>
                                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="flex justify-between mt-2">
                                        <div className="text-2xl font-bold text-white">₹ {Number(loan.outstandingPrincipal).toLocaleString()}</div>
                                        <div className="text-sm text-gray-500 text-right">
                                            of ₹ {Number(loan.principal).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-gray-700/50 pt-4">
                                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                                        <Percent className="h-4 w-4" />
                                        <span>{loan.interestRate}% Interest</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400 text-sm justify-end">
                                        <Landmark className="h-4 w-4" />
                                        <span>EMI: ₹{Number(loan.emiAmount).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
                
                {loans.length === 0 && (
                    <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-700 rounded-3xl text-gray-500">
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
