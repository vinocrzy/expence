'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useAccounts, useTransactions, useCategories } from '../../hooks/useLocalData';
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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { transactions, loading: txLoading } = useTransactions(); // Fetches all for recent activity
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
  }, [authLoading, transactions, accounts]); // Reload when data changes

  // Prepare Account Map for Recent Activity
  const accountMap = useMemo(() => {
    const map: Record<string, any> = {};
    accounts.forEach(acc => map[acc.id] = acc);
    return map;
  }, [accounts]);

  // Use imported helper for categories is better, but creating simple inline map if needed or use hook
  // We can fetch categories separately or just rely on what we have. 
  // Let's use `useCategories` hook? No, unnecessary network call if we can avoid. 
  // Getting category names might be needed for transactions list.
  // Actually RecentActivity needs category names. 
  // Let's just create a quick map if we have categories, or pass a fetcher.
  // Simplest: fetch all categories
  const { categories } = useCategories();
  const categoryMap = useMemo(() => {
      const map: Record<string, any> = {};
      categories.forEach(c => map[c.id] = c);
      return map;
  }, [categories]);


  if (authLoading || loading || txLoading || accLoading) {
    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
    );
  }

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 md:pb-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Overview
          </h1>
          <p className="text-sm md:text-base text-gray-400 mt-1">
             Financial summary for the last 30 days
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
            <StatCard 
                title="Net Worth"
                value={`₹${netWorth.toLocaleString()}`}
                icon={Wallet}
                color="blue"
            />
            <StatCard 
                title="Income"
                value={`₹${(cashFlow?.totalIncome || 0).toLocaleString()}`}
                icon={TrendingUp}
                color="green"
            />
            <StatCard 
                title="Expenses"
                value={`₹${(cashFlow?.totalExpense || 0).toLocaleString()}`}
                icon={TrendingDown}
                color="red"
            />
             <StatCard 
                title="Savings Rate"
                value={`${Math.round(cashFlow?.savingsRate || 0)}%`}
                icon={PiggyBank}
                color="purple"
            />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 mb-8">
            {/* Left Column: Charts */}
            <div className="xl:col-span-2 space-y-4 md:space-y-6">
                <CashFlowChart data={trendData} />
                <RecentActivity 
                    transactions={sortedTransactions}
                    accountMap={accountMap}
                    categoryMap={categoryMap}
                />
            </div>
            
            {/* Right Column: Insights */}
            <div className="space-y-4 md:space-y-6">
                <FinancialHealth 
                    savingsRate={cashFlow?.savingsRate || 0}
                    netWorth={netWorth}
                />
                <TopCategories 
                    categories={categoryBreakdown} 
                />
            </div>
        </div>

      </main>
    </div>
  );
}
