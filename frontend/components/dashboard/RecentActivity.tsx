import React from 'react';
import { ChevronRight, History } from 'lucide-react';
import { Transaction, Account, Category } from '@/lib/db-types';
import { TransactionCard } from '../TransactionCard';
import Link from 'next/link';

interface RecentActivityProps {
  transactions: Transaction[];
  accountMap: Record<string, Account>;
  categories: Category[];
}

export default function RecentActivity({ transactions, accountMap, categories }: RecentActivityProps) {
  const recent = transactions.slice(0, 5);

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
              {recent.map(transaction => (
                  <TransactionCard 
                      key={transaction.id}
                      transaction={transaction}
                      accountMap={accountMap}
                      categories={categories}
                      onDelete={() => {}} // Read only in dash
                      onEdit={() => {}} // Read only in dash
                  />
              ))}
          </div>
      )}
    </div>
  );
}
