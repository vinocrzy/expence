'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useAccounts, useTransactions, useCategories, useCreditCards } from '../../hooks/useLocalData';
import { getHouseholdId } from '../../lib/localdb-services';
import { 
  getCashFlowSummary, 
  calculateTrends, 
  calculateCategoryBreakdown, 
  calculateNetWorth 
} from '../../lib/analytics';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

// Widgets
import StatCard from '../../components/dashboard/StatCard';
import CashFlowChart from '../../components/dashboard/CashFlowChart';
import RecentActivity from '../../components/dashboard/RecentActivity';
import TopCategories from '../../components/dashboard/TopCategories';
import FinancialHealth from '../../components/dashboard/FinancialHealth';
import BudgetWidget from '../../components/dashboard/BudgetWidget';

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
  const [netWorth, setNetWorth] = useState(0);

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

            const [cf, trends, cats, nw] = await Promise.all([
                getCashFlowSummary(householdId, startOfTrend, endOfTrend),
                calculateTrends(householdId, startOfTrend, endOfTrend, 'daily'),
                calculateCategoryBreakdown(householdId, startOfTrend, endOfTrend),
                calculateNetWorth(householdId)
            ]);

            setCashFlow(cf);
            setTrendData(trends);
            setCategoryBreakdown(cats);
            setNetWorth(nw);
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

  if (authLoading || loading || txLoading || accLoading) {
    return <LoadingScreen />;
  }

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500 selection:text-white pb-32 md:pb-8">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Native Header */}
        <NativeHeader />

        {/* Swipeable Stats Row */}
        <StatsRow 
            netWorth={netWorth}
            totalIncome={cashFlow?.totalIncome || 0}
            totalExpense={cashFlow?.totalExpense || 0}
            savingsRate={cashFlow?.savingsRate || 0}
        />

        {/* Hidden: Traditional Stats Grid 
           We keep this logic available if needed, but UI is replaced by StatsRow 
        */}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 mb-8">
            {/* Left Column: Charts */}
            <div className="xl:col-span-2 space-y-4 md:space-y-6">
                <CashFlowChart data={trendData} />
                <RecentActivity 
                    transactions={sortedTransactions}
                    accountMap={accountMap}
                    categories={categories}
                />
            </div>
            
            {/* Right Column: Insights */}
            <div className="space-y-4 md:space-y-6">
                <BudgetWidget />
                <FinancialHealth 
                    savingsRate={cashFlow?.savingsRate || 0}
                    netWorth={netWorth}
                />
                <TopCategories 
                    categories={categoryBreakdown} 
                />
            </div>
        </div>

        <FAB />
      </main>
    </div>
  );
}
