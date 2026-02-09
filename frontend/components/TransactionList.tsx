import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Calendar, Trash2, Edit2, Split, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { Transaction, Category, Account } from '../lib/db-types';

interface TransactionListProps {
  transactions: Transaction[];
  accountMap: Record<string, any>;
  categories: Category[];
  onDelete: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  onQuickEdit?: (transaction: Transaction) => void;
}

export default function TransactionList({ 
  transactions, 
  accountMap, 
  categories, 
  onEdit,
  onQuickEdit,
  onDelete
}: TransactionListProps) {
    
  const [expandedSplits, setExpandedSplits] = useState<Set<string>>(new Set());

  const toggleSplitView = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedSplits);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSplits(newSet);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INCOME': return <ArrowDownLeft className="h-5 w-5 text-green-400" />;
      case 'EXPENSE': return <ArrowUpRight className="h-5 w-5 text-red-400" />;
      case 'TRANSFER': return <ArrowRightLeft className="h-5 w-5 text-blue-400" />;
      default: return <div className="h-5 w-5" />;
    }
  };

  if (transactions.length === 0) {
    return (
        <div className="p-8 text-center text-gray-500">
            <p>No transactions found.</p>
        </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800">
        {transactions.map((t) => (
            <div key={t.id} className="group flex flex-col hover:bg-gray-800/30 transition-colors">
                <div 
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => onEdit?.(t)}
                >
                    <div className="flex items-center gap-4">
                        <div className={clsx(
                            "p-3 rounded-xl",
                            t.type === 'INCOME' && "bg-green-500/10",
                            t.type === 'EXPENSE' && "bg-red-500/10",
                            t.type === 'TRANSFER' && "bg-blue-500/10"
                        )}>
                            {getIcon(t.type)}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="font-bold text-white mb-0.5 text-sm md:text-base line-clamp-1 break-all">{t.description || 'No description'}</div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 mt-0.5">
                                <span className="flex items-center gap-1 shrink-0">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(t.date), 'MMM d, yyyy')}
                                </span>
                                <span className="hidden xs:inline text-gray-600">•</span>
                                <span className="truncate max-w-[140px] xs:max-w-none">{accountMap[t.accountId]?.name}</span>
                                <span className="hidden xs:inline text-gray-600">•</span>
                                <span className="truncate text-purple-400">
                                    {t.isSplit ? (
                                        <button 
                                            onClick={(e) => toggleSplitView(t.id, e)}
                                            className="flex items-center gap-1 text-purple-300 hover:text-purple-200 hover:underline transition-all bg-purple-500/10 px-2 py-0.5 rounded-md"
                                        >
                                            <Split className="w-3 h-3" />
                                            Split Transaction
                                            <ChevronDown className={clsx("w-3 h-3 transition-transform", expandedSplits.has(t.id) && "rotate-180")} />
                                        </button>
                                    ) : (
                                        categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized'
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 md:gap-6">
                        <div className={clsx(
                            "text-right font-mono font-bold text-base md:text-lg",
                            t.type === 'INCOME' && "text-green-400",
                            t.type === 'EXPENSE' && "text-red-400",
                            t.type === 'TRANSFER' && "text-blue-400"
                        )}>
                            {t.type === 'EXPENSE' ? '-' : '+'}
                            {accountMap[t.accountId]?.currency} {Number(t.amount).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                             <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickEdit?.(t);
                                }}
                                className="p-2 text-gray-500 hover:text-purple-400 transition-all active:scale-95 bg-gray-800 rounded-lg md:bg-transparent md:rounded-none"
                                title="Quick Edit Category/Description"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(t.id);
                                }}
                                className="p-2 text-gray-500 hover:text-red-400 transition-all active:scale-95 bg-gray-800 rounded-lg md:bg-transparent md:rounded-none"
                                title="Delete Transaction"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Expanded Split Details */}
                {t.isSplit && expandedSplits.has(t.id) && (
                    <div className="bg-gray-800/40 border-t border-gray-800 px-4 py-3 mx-4 mb-2 rounded-b-lg animate-in slide-in-from-top-2 fade-in duration-200">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2 pl-12 md:pl-16">Split Breakdown</p>
                        <div className="space-y-1 pl-12 md:pl-16">
                            {t.splits?.map((split, idx) => (
                                <div key={split.id || idx} className="flex justify-between items-center text-sm py-1 border-b border-gray-700/30 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-2 h-2 rounded-full" 
                                            style={{ backgroundColor: categories.find(c => c.id === split.categoryId)?.color || '#6b7280' }}
                                        />
                                        <span className="text-gray-300">
                                            {categories.find(c => c.id === split.categoryId)?.name || 'Uncategorized'}
                                        </span>
                                        {split.note && (
                                            <span className="text-gray-500 text-xs italic">- {split.note}</span>
                                        )}
                                    </div>
                                    <span className="font-mono text-gray-300">
                                        {accountMap[t.accountId]?.currency} {Number(split.amount).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        ))}
    </div>
  );
}
