import React from 'react';
import { ChevronRight, History } from 'lucide-react';
import { Transaction, Account, Category } from '@/lib/db-types';
import { TransactionCard } from '../TransactionCard';
import Link from 'next/link';

interface RecentActivityProps {
  transactions: Transaction[];
  accountMap: Record<string, Account>;
  categories: Category[];
  onEdit?: (transaction: Transaction) => void;
  onTypeChange?: (id: string, type: 'INVESTMENT' | 'DEBT') => void;
  loading?: boolean;
}


export default function RecentActivity({ transactions, accountMap, categories, onEdit, onTypeChange, loading }: RecentActivityProps) {
  const recent = transactions.slice(0, 5);

  if (loading) {
      return (
          <div className="space-y-4">
               <div className="flex items-center justify-between px-2">
                   <div className="h-6 w-32 bg-[#1c1c1e] rounded-lg animate-pulse" />
                   <div className="h-4 w-16 bg-[#1c1c1e] rounded-lg animate-pulse" />
               </div>
               <div className="space-y-3">
                   {[1, 2, 3].map(i => (
                       <div key={i} className="bg-[#1c1c1e] p-4 rounded-2xl border border-white/5 animate-pulse flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white/10" />
                                <div className="space-y-2">
                                    <div className="h-4 w-24 bg-white/10 rounded-full" />
                                    <div className="h-3 w-16 bg-white/10 rounded-full" />
                                </div>
                            </div>
                            <div className="h-5 w-16 bg-white/10 rounded-lg" />
                       </div>
                   ))}
               </div>
          </div>
      );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
           <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <History className="w-5 h-5 text-gray-400" /> Recent Activity
           </h3>
           <Link href="/transactions" className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
               View All <ChevronRight className="w-3 h-3" />
           </Link>
      </div>

      {recent.length === 0 ? (
          <div className="bg-[#1c1c1e]/80 backdrop-blur-xl p-8 rounded-3xl border border-white/5 text-center">
              <p className="text-gray-500 text-sm">No recent transactions</p>
          </div>
      ) : (
          <div className="space-y-3">
              {recent.map(transaction => {
                  const account = accountMap[transaction.accountId] || {}; // Handle missing account gracefully
                  const category = categories.find(c => c.id === transaction.categoryId);
                  
                  return (
                      <TransactionCard 
                          key={transaction.id}
                          transaction={transaction}
                          account={account as Account}
                          category={category}
                          categories={categories}
                          onDelete={() => {}} // Read only in dash
                          onEdit={onEdit} 
                          onTypeChange={onTypeChange}
                          destinationAccount={transaction.type === 'TRANSFER' && transaction.transferAccountId ? accountMap[transaction.transferAccountId] : undefined}
                      />
                  );
              })}
          </div>
      )}
    </div>
  );
}
