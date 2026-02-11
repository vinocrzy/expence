
import { useState } from "react"
import { format } from "date-fns"
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, MoreHorizontal, Edit, Trash2, Split, ChevronDown, TrendingUp, HandCoins } from "lucide-react"
import { Transaction, Category } from "../lib/db-types"
import { cn } from "@/lib/utils"

interface TransactionCardProps {
  transaction: Transaction
  category?: Category
  account?: any
  onEdit?: (t: Transaction) => void
  onDelete: (id: string) => void
  categories: Category[]
  accountCurrency?: string
  onTypeChange?: (id: string, type: 'INVESTMENT' | 'DEBT') => void
}

export function TransactionCard({
  transaction,
  category,
  account,
  onEdit,
  onDelete,
  categories,
  accountCurrency,
  onTypeChange
}: TransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Icon Logic
  const getIcon = (type: string) => {
    switch (type) {
      case 'INCOME': return <ArrowDownLeft className="h-5 w-5 text-emerald-400" />
      case 'EXPENSE': return <ArrowUpRight className="h-5 w-5 text-rose-400" />
      case 'TRANSFER': return <ArrowRightLeft className="h-5 w-5 text-blue-400" />
      case 'INVESTMENT': return <TrendingUp className="h-5 w-5 text-amber-400" />
      case 'DEBT': return <HandCoins className="h-5 w-5 text-purple-400" />
      default: return <div className="h-5 w-5" />
    }
  }

  // Amount Color Logic
  const getAmountColor = (type: string) => {
    switch (type) {
      case 'INCOME': return "text-emerald-400"
      case 'EXPENSE': return "text-white" // Standard white for expense in dark mode often looks cleaner
      case 'TRANSFER': return "text-blue-400"
      case 'INVESTMENT': return "text-amber-400"
      case 'DEBT': return "text-purple-400"
      default: return "text-white"
    }
  }

  const isSplit = transaction.isSplit
  const displayCategory = isSplit ? 'Split Transaction' : (category?.name || 'Uncategorized')
  const currency = accountCurrency || account?.currency || '₹'

  return (
    <div 
        className={cn(
            "relative overflow-hidden rounded-2xl transition-all duration-300",
            "glass-panel active:scale-[0.98] touch-manipulation", // Native-like touch feedback
            isExpanded ? "ring-1 ring-white/10" : "" // Subtle highlight when expanded
        )}
        onClick={() => isSplit && setIsExpanded(!isExpanded)}
    >
      <div className="p-4 flex items-center gap-4">
        
        {/* ICON (Col 1) */}
        <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center shrink-0",
            "bg-white/5 border border-white/5", // Subtle glass effect
            transaction.type === 'INCOME' && "bg-emerald-500/10 border-emerald-500/20",
            transaction.type === 'EXPENSE' && "bg-rose-500/10 border-rose-500/20",
            transaction.type === 'TRANSFER' && "bg-blue-500/10 border-blue-500/20",
            transaction.type === 'INVESTMENT' && "bg-amber-500/10 border-amber-500/20",
            transaction.type === 'DEBT' && "bg-purple-500/10 border-purple-500/20"
        )}>
            {getIcon(transaction.type)}
        </div>

        {/* MAIN CONTENT (Col 2 & 3 Combined for layout control) */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            {/* Row 1: Title & Amount */}
            <div className="flex justify-between items-baseline gap-2">
                <h3 className="text-[17px] font-semibold text-white truncate leading-tight">
                    {transaction.description || 'No description'}
                </h3>
                <span className={cn(
                    "text-[17px] font-bold font-mono tracking-tight whitespace-nowrap",
                    getAmountColor(transaction.type)
                )}>
                    {transaction.type === 'EXPENSE' || transaction.type === 'INVESTMENT' || transaction.type === 'DEBT' ? '-' : '+'}
                    {currency} {Number(transaction.amount).toLocaleString()}
                </span>
            </div>

            {/* Row 2: Subtitle & Date */}
            <div className="flex justify-between items-center text-[13px] text-zinc-400">
                <div className="flex items-center gap-1.5 truncate pr-2">
                    <span className="truncate">{account?.name || 'Unknown Account'}</span>
                    <span className="text-zinc-600">•</span>
                    <div className="flex items-center gap-1 truncate">
                        {!isSplit && category?.color && (
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }} />
                        )}
                        <span className={cn("truncate", isSplit && "text-indigo-400 font-medium")}>
                            {displayCategory}
                        </span>
                        {isSplit && <ChevronDown className={cn("h-3 w-3 text-indigo-400 transition-transform", isExpanded && "rotate-180")} />}
                    </div>
                </div>
                <span className="whitespace-nowrap shrink-0">
                    {format(new Date(transaction.date), 'MMM d')}
                </span>
            </div>
        </div>

        {/* ACTIONS MENU (Col 4 - Floating) */}
        <button 
            onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
            }}
            className="p-2 -mr-2 text-zinc-500 hover:text-white transition-colors"
        >
            <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* EXPANDED DETAILS (Split or Standard details if we wanted to show more) */}
      {isSplit && isExpanded && (
          <div className="bg-black/20 border-t border-white/5 px-4 py-3 animate-in slide-in-from-top-1">
             <div className="space-y-2">
                {transaction.splits?.map((split, idx) => {
                    const splitCat = categories.find(c => c.id === split.categoryId);
                    return (
                        <div key={split.id || idx} className="flex justify-between items-center text-[13px]">
                            <div className="flex items-center gap-2 text-zinc-300">
                                <div 
                                    className="w-1.5 h-1.5 rounded-full" 
                                    style={{ backgroundColor: splitCat?.color || '#71717a' }}
                                />
                                <span>{splitCat?.name || 'Uncategorized'}</span>
                                {split.note && <span className="text-zinc-500 italic">- {split.note}</span>}
                            </div>
                            <span className="font-mono text-zinc-400">
                                {currency} {Number(split.amount).toLocaleString()}
                            </span>
                        </div>
                    )
                })}
             </div>
          </div>
      )}

      {/* CUSTOM DROPDOWN OVERLAY */}
      {isMenuOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-end pr-14 bg-black/60 backdrop-blur-[1px] animate-in fade-in duration-150" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}>
            <div className="flex gap-2 animate-in slide-in-from-right-4 duration-200">
                <button 
                    onClick={(e) => { e.stopPropagation(); onEdit?.(transaction); setIsMenuOpen(false); }}
                    className="h-10 w-10 rounded-full bg-zinc-700 text-white flex items-center justify-center shadow-lg hover:bg-zinc-600 active:scale-95 transition-all"
                    title="Edit"
                >
                    <Edit className="h-4 w-4" />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(transaction.id); setIsMenuOpen(false); }}
                    className="h-10 w-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg hover:bg-rose-500/30 active:scale-95 transition-all"
                    title="Delete"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
            
            {/* Type Conversion Options */}
            {onTypeChange && transaction.type !== 'INVESTMENT' && transaction.type !== 'DEBT' && (
                <div className="flex gap-2 animate-in slide-in-from-right-8 duration-300 delay-75">
                     <div className="w-[1px] bg-white/20 h-10 mx-1" />
                     <button 
                        onClick={(e) => { e.stopPropagation(); onTypeChange(transaction.id, 'INVESTMENT'); setIsMenuOpen(false); }}
                        className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg hover:bg-amber-500/30 active:scale-95 transition-all"
                        title="Mark as Investment"
                    >
                        <TrendingUp className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onTypeChange(transaction.id, 'DEBT'); setIsMenuOpen(false); }}
                        className="h-10 w-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-lg hover:bg-purple-500/30 active:scale-95 transition-all"
                        title="Mark as Debt Repayment"
                    >
                        <HandCoins className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  )
}
