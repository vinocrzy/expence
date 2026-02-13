'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useAccounts, useTransactions, useCategories, useCreditCards } from '../../hooks/useLocalData';
import { accountService, creditCardService, transactionService, recurringService, getHouseholdId } from '../../lib/localdb-services';
import { 
  getCashFlowSummary,
  calculateTrends, 
  calculateCategoryBreakdown
} from '../../lib/analytics';
import { 
  calculateAvailableBalance, 
  calculateTotalLiquidCash, 
  calculateTotalCreditCardDebt,
  calculateTotalLoanOutstanding,
  calculateTransactionTotal,
  calculateNetWorth 
} from '../../lib/financial-math';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

// Widgets
import StatCard from '../../components/dashboard/StatCard';
import CashFlowChart from '../../components/dashboard/CashFlowChart';
import RecentActivity from '../../components/dashboard/RecentActivity';
import TopCategories from '../../components/dashboard/TopCategories';
import FinancialHealth from '../../components/dashboard/FinancialHealth';
import BudgetWidget from '../../components/dashboard/BudgetWidget';
import { InsightsWidget } from '../../components/dashboard/InsightsWidget';
import TransactionModal from '../../components/TransactionModal';

import LoadingScreen from '../../components/ui/LoadingScreen';

// Native Components
import NativeHeader from '../../components/dashboard/NativeHeader';
import StatsRow from '../../components/dashboard/StatsRow';
import FAB from '../../components/dashboard/FAB';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { transactions, loading: txLoading } = useTransactions(); 
  const { accounts, loading: accLoading } = useAccounts();
  const [loading, setLoading] = useState(true);

  // Dashboard Data State
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [netWorth, setNetWorth] = useState(0); // True Net Worth
  const [availableBalance, setAvailableBalance] = useState(0); // Cash - CC
  const [investmentTotal, setInvestmentTotal] = useState(0);
  const [debtTotal, setDebtTotal] = useState(0); // Loan Outstanding
  const [totalLoanOutstanding, setTotalLoanOutstanding] = useState(0);
  const [upcomingTxs, setUpcomingTxs] = useState<any[]>([]);

  // Transaction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showLiabilities, setShowLiabilities] = useState(false);

  const handleEditTransaction = (transaction: any) => {
      setSelectedTransaction(transaction);
      setIsModalOpen(true);
  };

  const handleUpdateTransaction = async (data: any) => {
      if (!selectedTransaction) return;
      
      try {
          await transactionService.update(selectedTransaction.id, data);
          // Refresh data
          window.location.reload(); // Simple refresh for now to ensure all stats update
      } catch (err) {
          console.error("Failed to update transaction", err);
      }
  };

  const handleTypeChange = async (id: string, type: 'INVESTMENT' | 'DEBT') => {
      try {
          await transactionService.update(id, { type });
          window.location.reload();
      } catch (err) {
          console.error("Failed to update transaction type", err);
      }
  };

  useEffect(() => {
    async function loadDashboardData() {
        if (authLoading) return;
        
        try {
            const householdId = await getHouseholdId();
            if (!householdId) { 
                setLoading(false); 
                return; 
            }

            const now = new Date();
            
            // Usage: Last 30 Days for all stats to ensure data visibility at start of month
            const startOfTrend = new Date();
            startOfTrend.setDate(startOfTrend.getDate() - 30);
            startOfTrend.setHours(0, 0, 0, 0);
            
            const endOfTrend = new Date();
            endOfTrend.setHours(23, 59, 59, 999);

            const [cf, trends, cats, allAccounts, activeCards, loans, upcoming] = await Promise.all([
                getCashFlowSummary(householdId, startOfTrend, endOfTrend),
                calculateTrends(householdId, startOfTrend, endOfTrend, 'daily'),
                calculateCategoryBreakdown(householdId, startOfTrend, endOfTrend),
                accountService.getAllActive(householdId),
                creditCardService.getAllActive(householdId),
                import('../../lib/localdb-services').then(m => m.loanService.getAll(householdId)),
                recurringService.getUpcoming(householdId, 14)
            ]);

            setUpcomingTxs(upcoming);

            // Calculate Investments Total (using transaction service for now as proxy for value)
            const investments = await transactionService.getTotalInvestments(householdId, new Date(0), new Date('2100-01-01'));

            const netWorth = calculateNetWorth(allAccounts, activeCards, loans, investments);
            const availableBalance = calculateAvailableBalance(allAccounts, activeCards);
            
            setCashFlow(cf);
            setTrendData(trends);
            setCategoryBreakdown(cats);
            setNetWorth(netWorth);
            setAvailableBalance(availableBalance);
            setInvestmentTotal(investments);
            setTotalLoanOutstanding(calculateTotalLoanOutstanding(loans));
            // Debt Total from transactions? Or Loan Outstanding?
            // "Debt Summary Card" usually means Debt Transactions (Repayments) or Total Debt?
            // "Total amount, Monthly change". This implies Transaction Totals for the month?
            // User Request: "Add Debt Summary Card... Total amount, Monthly change".
            // Since it groups with "Investment Summary Card" and existing Income/Expense cards (in StatsRow),
            // it likely refers to FLOW (how much I paid in Debt/Invested this month) OR STOCK (Total Debt/Investment Value).
            // Existing cards are Income/Expense (Flow).
            // But User also asked for "Available Balance" (Stock).
            // Investment Summary: likely Current Investment Value.
            // Debt Summary: likely Total Outstanding (Loans + CC).
            
            // However, "Monthly change" implies flow.
            // Let's assume:
            // Investment Card: Total Portfolio Value (if we had it) OR Total Invested (Stock). 
            // We calculated `investments` as lifetime total.
            // Debt Card: Total Outstanding (Loans + CC).
            
            setDebtTotal(calculateTotalLoanOutstanding(loans) + calculateTotalCreditCardDebt(activeCards)); // This is now the TRUE Net Worth (Assets - Liabilities)
            // We might want to pass availableBalance to StatsRow if it expects it, 
            // or we can just pass netWorth and let StatsRow display what it needs.
            // valid: StatsRow prop 'netWorth' is displayed as 'Total Balance' or similar?
            // Actually StatsRow takes 'netWorth'. 
            // The request says "Dashboard available balance is incorrect... match My Finance".
            // My Finance shows "Available Balance" = Cash - CC Debt.
            // StatsRow likely shows "Total Balance" or "Net Worth".
            // Let's pass the correct calculated Available Balance to where it is needed.
            // If StatsRow is the main header, maybe we should pass availableBalance there if that's what the user wants "Visible".
            // But "Net Worth" is usually Assets - Liabilities. "Available Balance" is Liquidity.
            // Let's look at StatsRow usage: <StatsRow netWorth={netWorth} ... />
            // We should check what StatsRow actually displays.
            
            // For now, let's update the state with the new NetWorth (which includes loans/investments)
            // And potentially we need a new state for "AvailableBalance" if we want to show that specifically.
            // The prompt says: "Dashboard available balance... must follow ... My Finance".
            // If StatsRow holds the "Available Balance" display, we should pass `availableBalance` to it?
            // Or `netWorth`?
            // Let's assume StatsRow is "Net Worth" card.
            // Wait, the prompt says "Dashboard available balance is incorrect".
            // This implies there is a "Available Balance" displayed somewhere.
            // In the code I read:
            // <StatsRow netWorth={netWorth} ... />
            // I'll check StatsRow implementation next. For now, I'll calculate both.
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    loadDashboardData();
  }, [authLoading, transactions, accounts]); 

  // Prepare Account Map for Recent Activity
  const { creditCards } = useCreditCards(); // Added hook
  const accountMap = useMemo(() => {
    const map: Record<string, any> = {};
    accounts.forEach(acc => map[acc.id] = acc);
    creditCards.forEach(cc => map[cc.id] = { ...cc, type: 'CREDIT_CARD' }); // Add CCs to map
    return map;
  }, [accounts, creditCards]);

  const { categories } = useCategories();
  const categoryMap = useMemo(() => {
      const map: Record<string, any> = {};
      categories.forEach(c => map[c.id] = c);
      return map;
  }, [categories]);

  const isLoading = authLoading || loading || txLoading || accLoading;

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500 selection:text-white pb-32 md:pb-8">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Native Header */}
        <NativeHeader />

        {/* Swipeable Stats Row */}
        <StatsRow 
            netWorth={availableBalance} // Passing Available Balance here as requested
            totalIncome={cashFlow?.totalIncome || 0}
            totalExpense={cashFlow?.totalExpense || 0}
            savingsRate={cashFlow?.savingsRate || 0}
            loading={isLoading}
        />

        {/* Financial Overview Section (Assets vs Liabilities) */}
        <div className="bg-[#1c1c1e]/80 backdrop-blur-xl p-1 rounded-2xl flex items-center justify-between border border-white/5 mb-4 relative overflow-hidden">
             {/* Toggle */}
             <div className="grid grid-cols-2 w-full p-1 gap-1 bg-black/20 rounded-xl">
                <button 
                    onClick={() => setShowLiabilities(false)}
                    className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${!showLiabilities ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Assets & Savings
                </button>
                <button 
                    onClick={() => setShowLiabilities(true)}
                    className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${showLiabilities ? 'bg-red-900/40 text-red-200 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Liabilities
                </button>
             </div>
        </div>

        <div className="mb-6">
            {!showLiabilities ? (
                <div className="glass-panel p-5 rounded-3xl flex items-center justify-between relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="relative z-10 space-y-1">
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Assets</p>
                        <h3 className="text-2xl font-bold text-white tabular-nums tracking-tight">₹{investmentTotal.toLocaleString()}</h3>
                        <p className="text-emerald-400 text-xs flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> 
                            <span>Investments & Savings</span>
                        </p>
                    </div>
                    <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 relative z-10">
                        <PiggyBank className="w-6 h-6" />
                    </div>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
                </div>
            ) : (
                <div className="glass-panel p-5 rounded-3xl flex items-center justify-between relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500 border-l-4 border-red-500/50">
                     <div className="relative z-10 space-y-1">
                        <p className="text-red-300/80 text-xs font-medium uppercase tracking-wider">Total Liability</p>
                        <h3 className="text-2xl font-bold text-white tabular-nums tracking-tight">₹{debtTotal.toLocaleString()}</h3>
                         <p className="text-red-400 text-xs flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" /> 
                            <span>Loans & Credit Cards</span>
                        </p>
                    </div>
                    <div className="p-4 bg-red-500/10 rounded-full text-red-400 relative z-10">
                        <TrendingDown className="w-6 h-6" />
                    </div>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-red-500/10 rounded-full blur-2xl" />
                </div>
            )}
        </div>

        {/* Hidden: Traditional Stats Grid 
           We keep this logic available if needed, but UI is replaced by StatsRow 
        */}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 mb-8">
            {/* Left Column: Charts */}
            <div className="xl:col-span-2 space-y-4 md:space-y-6">
                <CashFlowChart data={trendData} loading={isLoading} />
                <RecentActivity 
                    transactions={sortedTransactions}
                    accountMap={accountMap}
                    categories={categories}
                    onEdit={handleEditTransaction}
                    onTypeChange={handleTypeChange}
                    loading={isLoading}
                />
            </div>
            
            {/* Right Column: Insights */}
            <div className="space-y-4 md:space-y-6">
                <InsightsWidget />
                
                {/* Upcoming Payments Widget */}
                {upcomingTxs.length > 0 && !isLoading && (
                    <div className="glass-panel p-5 rounded-3xl border border-white/5 space-y-4 bg-[#1c1c1e]">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-white text-lg">Upcoming Payments</h3>
                            <Link href="/recurring" className="text-xs text-blue-400 hover:text-blue-300">See All</Link>
                        </div>
                        <div className="space-y-3">
                            {upcomingTxs.slice(0, 3).map((tx: any) => (
                                <div key={tx.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg text-white">
                                            {tx.name[0]}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white text-sm">{tx.name}</p>
                                            <p className="text-xs text-gray-400">Due {new Date(tx.nextDueDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-white text-sm">₹{tx.amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <BudgetWidget />
                <FinancialHealth 
                    savingsRate={cashFlow?.savingsRate || 0}
                    netWorth={netWorth}
                    loading={isLoading}
                />
                <TopCategories 
                    categories={categoryBreakdown} 
                    loading={isLoading}
                />
            </div>
        </div>

        <FAB />

        <TransactionModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setSelectedTransaction(null); }}
            initialData={selectedTransaction}
            accounts={accounts}
            onSubmit={handleUpdateTransaction}
        />
      </main>
    </div>
  );
}
