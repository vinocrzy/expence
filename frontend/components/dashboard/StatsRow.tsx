
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsRowProps {
  netWorth: number;
  totalIncome: number;
  totalExpense: number;
  savingsRate: number;
}

export default function StatsRow({ netWorth, totalIncome, totalExpense, savingsRate }: StatsRowProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
        
        {/* Total Balance Card (Large) */}
        <div className="snap-center shrink-0 w-[85%] sm:w-[320px] bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-5 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Wallet className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
                <div className="space-y-1">
                    <span className="text-indigo-200 text-sm font-medium">Available Balance</span>
                    <h2 className="text-3xl font-bold tracking-tight">
                        ₹{netWorth.toLocaleString()}
                    </h2>
                </div>
                <div className="flex items-center gap-2 text-indigo-100 text-xs bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <span>Cash - CC Debt</span>
                </div>
            </div>
        </div>

        {/* Income Card */}
        <div className="snap-center shrink-0 w-[42%] sm:w-[180px] glass-panel rounded-3xl p-4 flex flex-col justify-between min-h-[140px] relative">
             <div className="absolute top-3 right-3 p-1.5 bg-emerald-500/10 rounded-full">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-auto space-y-1">
                <span className="text-gray-400 text-xs">Income</span>
                <p className="text-lg font-bold text-white">₹{totalIncome.toLocaleString()}</p>
            </div>
        </div>

        {/* Expense Card */}
        <div className="snap-center shrink-0 w-[42%] sm:w-[180px] glass-panel rounded-3xl p-4 flex flex-col justify-between min-h-[140px] relative">
             <div className="absolute top-3 right-3 p-1.5 bg-rose-500/10 rounded-full">
                <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
             <div className="mt-auto space-y-1">
                 <span className="text-gray-400 text-xs">Expense</span>
                 <p className="text-lg font-bold text-white">₹{totalExpense.toLocaleString()}</p>
             </div>
        </div>

         {/* Savings Rate Card */}
         <div className="snap-center shrink-0 w-[42%] sm:w-[180px] glass-panel rounded-3xl p-4 flex flex-col justify-between min-h-[140px] relative">
             <div className="absolute top-3 right-3 p-1.5 bg-purple-500/10 rounded-full">
                <PiggyBank className="w-4 h-4 text-purple-400" />
            </div>
             <div className="mt-auto space-y-1">
                 <span className="text-gray-400 text-xs">Savings Rate</span>
                 <p className={cn(
                     "text-lg font-bold",
                     savingsRate >= 20 ? "text-emerald-400" : "text-amber-400"
                 )}>{Math.round(savingsRate)}%</p>
             </div>
        </div>

    </div>
  );
}
