
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
        <div className="snap-center shrink-0 w-[85%] sm:w-[320px] bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
            {/* Abstract Shapes */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-10 -mb-10 pointer-events-none" />
            
            <div className="absolute top-5 right-5 p-2 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
                <Wallet className="w-6 h-6 text-white" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
                <div className="space-y-2">
                    <span className="text-indigo-100 text-sm font-medium tracking-wide">Available Balance</span>
                    <h2 className="text-4xl font-bold tracking-tight tabular-nums text-white drop-shadow-sm">
                        ₹{netWorth.toLocaleString()}
                    </h2>
                </div>
                <div className="flex items-center gap-2 text-indigo-50 text-[10px] font-medium bg-white/10 w-fit px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/5">
                    <span>Cash - Credit Card Debt</span>
                </div>
            </div>
        </div>

        {/* Income Card */}
        <div className="snap-center shrink-0 w-[42%] sm:w-[180px] glass-panel rounded-3xl p-4 flex flex-col justify-between min-h-[140px] relative transition-transform active:scale-95">
             <div className="absolute top-3 right-3 p-2 bg-emerald-500/10 rounded-full border border-emerald-500/10">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-auto space-y-1">
                <span className="text-gray-400 text-xs font-medium">Income</span>
                <p className="text-xl font-bold text-white tabular-nums">₹{totalIncome.toLocaleString()}</p>
            </div>
        </div>

        {/* Expense Card */}
        <div className="snap-center shrink-0 w-[42%] sm:w-[180px] glass-panel rounded-3xl p-4 flex flex-col justify-between min-h-[140px] relative transition-transform active:scale-95">
             <div className="absolute top-3 right-3 p-2 bg-rose-500/10 rounded-full border border-rose-500/10">
                <TrendingDown className="w-5 h-5 text-rose-400" />
            </div>
             <div className="mt-auto space-y-1">
                 <span className="text-gray-400 text-xs font-medium">Expense</span>
                 <p className="text-xl font-bold text-white tabular-nums">₹{totalExpense.toLocaleString()}</p>
             </div>
        </div>

         {/* Savings Rate Card */}
         <div className="snap-center shrink-0 w-[42%] sm:w-[180px] glass-panel rounded-3xl p-4 flex flex-col justify-between min-h-[140px] relative transition-transform active:scale-95">
             <div className="absolute top-3 right-3 p-2 bg-purple-500/10 rounded-full border border-purple-500/10">
                <PiggyBank className="w-5 h-5 text-purple-400" />
            </div>
             <div className="mt-auto space-y-1">
                 <span className="text-gray-400 text-xs font-medium">Savings Rate</span>
                 <p className={cn(
                     "text-xl font-bold tabular-nums",
                     savingsRate >= 20 ? "text-emerald-400" : "text-amber-400"
                 )}>{Math.round(savingsRate)}%</p>
             </div>
        </div>

    </div>
  );
}
