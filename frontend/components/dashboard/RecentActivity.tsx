import React from 'react';
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Transaction } from '../../lib/db-types';
import clsx from 'clsx';
import Link from 'next/link';

interface RecentActivityProps {
  transactions: Transaction[];
  accountMap: Record<string, any>; // mapping id to account object
  categoryMap: Record<string, any>;
}

export default function RecentActivity({ transactions, accountMap, categoryMap }: RecentActivityProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'INCOME': return <ArrowDownLeft className="h-4 w-4 text-green-400" />;
      case 'EXPENSE': return <ArrowUpRight className="h-4 w-4 text-red-400" />;
      case 'TRANSFER': return <ArrowRightLeft className="h-4 w-4 text-blue-400" />;
      default: return <div className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Recent Activity</h3>
        <Link href="/transactions" className="text-sm text-purple-400 hover:text-purple-300 font-medium">
          View All
        </Link>
      </div>
      
      {transactions.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
            No recent transactions
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-gray-700/50">
            {transactions.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between group py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className={clsx(
                            "flex-shrink-0 p-2 rounded-lg transition-colors group-hover:bg-gray-700",
                            t.type === 'INCOME' && "bg-green-500/10 text-green-400",
                            t.type === 'EXPENSE' && "bg-red-500/10 text-red-400",
                            t.type === 'TRANSFER' && "bg-blue-500/10 text-blue-400"
                        )}>
                            {getIcon(t.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="font-medium text-white text-sm truncate">{t.description || 'No description'}</div>
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                                {format(new Date(t.date), 'MMM d')} • {categoryMap[t.categoryId || '']?.name || 'Uncategorized'}
                            </div>
                        </div>
                    </div>
                    <div className={clsx(
                        "font-mono font-bold text-sm whitespace-nowrap",
                        t.type === 'INCOME' && "text-green-400",
                        t.type === 'EXPENSE' && "text-red-400",
                        t.type === 'TRANSFER' && "text-blue-400"
                    )}>
                        {t.type === 'EXPENSE' ? '-' : '+'}
                        {Number(t.amount).toLocaleString()}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
