'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import NativeHeader from '../../components/dashboard/NativeHeader';
import { useTransactions, useCategories } from '../../hooks/useLocalData';
import { usePortfolio } from '../../hooks/usePortfolio';
import { 
    BarChart2, TrendingUp, TrendingDown, 
    RefreshCw, Layers, PieChart as PieIcon, Activity,
    AlertCircle, Check, ChevronDown, Filter, ArrowUpRight,
    PiggyBank, HandCoins, Tag, Briefcase, ExternalLink, Calendar
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, BarChart, Bar, 
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import clsx from 'clsx';
import { format } from 'date-fns';
import NativeSegmentedControl from '../../components/ui/NativeSegmentedControl';
import MultiSelect from '../../components/ui/MultiSelect';

// Colors for charts
const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

export default function AnalyticsPage() {
    const [view, setView] = useState<'EXPENSES' | 'PORTFOLIO'>('EXPENSES');
    const [range, setRange] = useState<'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM'>('MONTH');
    const months = range === 'YEAR' ? 12 : range === 'QUARTER' ? 3 : 1;

    // Custom date range state
    const today = new Date().toISOString().substring(0, 10);
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);
    const [customStart, setCustomStart] = useState(firstOfMonth);
    const [customEnd, setCustomEnd] = useState(today);
    
    // Load raw data
    const { transactions, loading: txLoading } = useTransactions();
    const { categories, loading: catLoading } = useCategories();
    const loading = txLoading || catLoading;

    // Portfolio data
    const {
        holdings,
        summary: portfolioSummary,
        analytics: portfolioAnalytics,
        loading: portfolioLoading,
    } = usePortfolio();

    // -- State for Independent Filters --
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]); // Empty = ALL
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]); // Empty = ALL
    
    // Drill-down State
    const [selectedDrilldownCategory, setSelectedDrilldownCategory] = useState<string | null>(null);
    
    // Calculate date range for filtering transactions
    const dateRange = useMemo(() => {
        if (range === 'CUSTOM' && customStart && customEnd) {
            const start = new Date(customStart);
            const end = new Date(customEnd);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - months);
        start.setHours(0,0,0,0);
        return { start, end };
    }, [range, months, customStart, customEnd]);

    const categoryOptions = useMemo(() => categories.map(c => ({ 
        id: c.id, 
        label: c.name, 
        color: c.color 
    })), [categories]);

    // Compute available tag options from transactions in range
    const tagOptions = useMemo(() => {
        const tagSet = new Set<string>();
        transactions.forEach(t => {
            const d = new Date(t.date);
            if (d >= dateRange.start && d <= dateRange.end && t.tags) {
                t.tags.forEach(tag => tagSet.add(tag));
            }
        });
        return Array.from(tagSet).sort().map(tag => ({ id: tag, label: tag }));
    }, [transactions, dateRange]);

    // Helper: does a transaction match the selected tags filter?
    const matchesTags = (t: any) => {
        if (selectedTagIds.length === 0) return true;
        return t.tags && t.tags.some((tag: string) => selectedTagIds.includes(tag));
    };

    // Filter transactions (Global - Date Range + Tag filter)
    const filteredTransactions = useMemo(() => {
         return transactions.filter(t => {
            const d = new Date(t.date);
            const inDate = d >= dateRange.start && d <= dateRange.end;
            const isExpense = t.type === 'EXPENSE';
            return inDate && isExpense && matchesTags(t);
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, dateRange, selectedTagIds]);
    
    // 1. Calculate Monthly Trend Data
    const chartMonthlyData = useMemo(() => {
        const data: Record<string, { income: number; expense: number; investment: number; debt: number }> = {};
        
        // Initialize months map
        let current = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        while (current <= end) {
            const key = format(current, 'MMM');
            data[key] = { income: 0, expense: 0, investment: 0, debt: 0 };
            current.setMonth(current.getMonth() + 1);
        }

        transactions.forEach(t => {
            const d = new Date(t.date);
            if (d >= dateRange.start && d <= dateRange.end && matchesTags(t)) {
                const key = format(d, 'MMM');
                if (data[key]) {
                    if (t.type === 'INCOME') data[key].income += t.amount;
                    if (t.type === 'EXPENSE') data[key].expense += t.amount;
                    if (t.type === 'INVESTMENT') data[key].investment += t.amount;
                    if (t.type === 'DEBT') data[key].debt += t.amount;
                }
            }
        });

        return {
            data: Object.entries(data).map(([month, stats]) => ({
                month,
                income: stats.income,
                expense: stats.expense,
                investment: stats.investment || 0,
                debt: stats.debt || 0
            }))
        };
    }, [transactions, dateRange, selectedTagIds]);

    // 2. Calculate Category Breakdown (with Drill-down)
    const chartCategoryData = useMemo(() => {
        const catMap = new Map<string, number>();
        
        // If drill-down is active, find the category object
        const activeCategory = selectedDrilldownCategory ? categories.find(c => c.name === selectedDrilldownCategory) : null;

        transactions.forEach(t => {
            const d = new Date(t.date);
            if (d >= dateRange.start && d <= dateRange.end && t.type === 'EXPENSE' && matchesTags(t)) {
                
                // Helper to process a single entry (either full tx or split)
                const processEntry = (catId: string, amount: number, subCatId?: string) => {
                    if (selectedCategoryIds.length > 0 && catId && !selectedCategoryIds.includes(catId)) return;

                    // Get Category object
                    const cat = categories.find(c => c.id === catId);
                    
                    // Exclude DEBT/INVESTMENT types from Expense Breakdown
                    // (Even if transaction type is EXPENSE, if category is improper, exclude it to match user request)
                    if (cat && (cat.type === 'DEBT' || cat.type === 'INVESTMENT')) return;

                    const catName = cat?.name || 'Uncategorized';

                    if (selectedDrilldownCategory) {
                        // DRILL-DOWN MODE
                        if (catName === selectedDrilldownCategory) {
                            let subCatName = catName; // Default to Parent Name if no sub-category
                            if (subCatId && cat?.subCategories) {
                                 const sub = cat.subCategories.find(s => s.id === subCatId);
                                 if (sub) subCatName = sub.name;
                            }
                            catMap.set(subCatName, (catMap.get(subCatName) || 0) + amount);
                        }
                    } else {
                        // TOP-LEVEL MODE
                        catMap.set(catName, (catMap.get(catName) || 0) + amount);
                    }
                };

                if (t.isSplit && t.splits && t.splits.length > 0) {
                    // Process Splits
                    t.splits.forEach(split => {
                        processEntry(split.categoryId, split.amount, undefined); // Splits don't have subCategoryId in current interface
                    });
                } else {
                    // Process Whole Transaction
                    processEntry(t.categoryId || '', t.amount, t.subCategoryId);
                }
            }
        });

        // Determine colors based on mode
        return {
            chartData: Array.from(catMap.entries())
                .map(([name, value], i) => {
                    let color;
                    if (selectedDrilldownCategory) {
                        // Sub-category colors (shades of parent or palette)
                        // Use base colors for now, maybe lighter opacity or standard palette
                        color = COLORS[i % COLORS.length]; 
                    } else {
                        // Parent category color
                        color = categories.find(c => c.name === name)?.color || COLORS[i % COLORS.length];
                    }
                    const cat = !selectedDrilldownCategory ? categories.find(c => c.name === name) : null;
                    const hasSubCategories = !selectedDrilldownCategory && (cat?.subCategories?.length ?? 0) > 0;
                    return { name, value, color, hasSubCategories };
                })
                .sort((a, b) => b.value - a.value)
        };
    }, [transactions, dateRange, categories, selectedCategoryIds, selectedDrilldownCategory, selectedTagIds]);

    // 3. Current Period Stats
    const currentStats = useMemo(() => {
        return chartMonthlyData.data.reduce((acc, curr) => ({
            income: acc.income + curr.income,
            expense: acc.expense + curr.expense,
            investment: acc.investment + curr.investment,
            debt: acc.debt + curr.debt,
            net: acc.net + (curr.income - curr.expense)
        }), { income: 0, expense: 0, investment: 0, debt: 0, net: 0 });
    }, [chartMonthlyData]);

    const savingsRate = currentStats.income > 0 ? (currentStats.net / currentStats.income) * 100 : 0;

    // 4. Comparison Chart Data
    const comparisonData = useMemo(() => {
        const now = new Date();
        const thisMonthKey = format(now, 'yyyy-MM');
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthKey = format(lastMonthDate, 'yyyy-MM');

        let thisMonthTotal = 0;
        let lastMonthTotal = 0;

        transactions.forEach(t => {
             if (t.type !== 'EXPENSE') return;
             if (!matchesTags(t)) return;
             
             const tDate = new Date(t.date);
             const tKey = format(tDate, 'yyyy-MM');
             if (tKey !== thisMonthKey && tKey !== lastMonthKey) return;

             const processAmount = (catId: string, amount: number) => {
                 if (selectedCategoryIds.length > 0) {
                     if (!catId || !selectedCategoryIds.includes(catId)) return;
                 }
                 
                 if (tKey === thisMonthKey) thisMonthTotal += amount;
                 if (tKey === lastMonthKey) lastMonthTotal += amount;
             };

             if (t.isSplit && t.splits && t.splits.length > 0) {
                 t.splits.forEach(split => processAmount(split.categoryId, split.amount));
             } else {
                 processAmount(t.categoryId || '', t.amount);
             }
        });

        return [
            { name: 'Last', amount: lastMonthTotal, fill: '#6b7280' },
            { name: 'This', amount: thisMonthTotal, fill: thisMonthTotal > lastMonthTotal ? '#ef4444' : '#10b981' }
        ];
    }, [selectedCategoryIds, transactions, selectedTagIds]);

    // 5. Tag Breakdown Data
    const tagBreakdownData = useMemo(() => {
        const tagMap = new Map<string, number>();
        transactions.forEach(t => {
            const d = new Date(t.date);
            if (d >= dateRange.start && d <= dateRange.end && t.type === 'EXPENSE' && t.tags) {
                t.tags.forEach(tag => {
                    tagMap.set(tag, (tagMap.get(tag) || 0) + t.amount);
                });
            }
        });
        return Array.from(tagMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions, dateRange]);


    // Portfolio allocation chart data
    const portfolioAllocationData = useMemo(() =>
        holdings.map(h => ({
            name: h.symbol,
            value: h.currentValue,
            invested: h.investedValue,
            pnl: h.unrealisedPnL,
            pnlPct: h.unrealisedPnLPercent,
        })).sort((a, b) => b.value - a.value),
    [holdings]);

    // Top gainers/losers
    const portfolioGainersLosers = useMemo(() => {
        return [...holdings]
            .filter(h => h.unrealisedPnL !== 0)
            .sort((a, b) => Math.abs(b.unrealisedPnLPercent) - Math.abs(a.unrealisedPnLPercent))
            .slice(0, 8)
            .map(h => ({
                symbol: h.symbol,
                pnlPct: h.unrealisedPnLPercent,
                pnl: h.unrealisedPnL,
                fill: h.unrealisedPnL >= 0 ? '#10b981' : '#ef4444',
            }));
    }, [holdings]);

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-32">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-0 md:pt-4">
                <NativeHeader title="Analytics" />
                {/* Header & Controls */}
                <div className="flex flex-col gap-4">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 w-fit hidden md:block">
                        Analytics
                    </h1>

                    {/* View Toggle: Expenses vs Portfolio */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setView('EXPENSES')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                view === 'EXPENSES' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30' : 'bg-[#1c1c1e] text-gray-400 hover:text-white border border-white/5'
                            }`}
                        >
                            <BarChart2 className="w-4 h-4" /> Expenses
                        </button>
                        <button
                            onClick={() => setView('PORTFOLIO')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                view === 'PORTFOLIO' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30' : 'bg-[#1c1c1e] text-gray-400 hover:text-white border border-white/5'
                            }`}
                        >
                            <Briefcase className="w-4 h-4" /> Portfolio
                        </button>
                    </div>

                    {view === 'EXPENSES' && (
                        <>
                            {/* Date range selector */}
                            <NativeSegmentedControl 
                                value={range}
                                onChange={(v) => setRange(v as any)}
                                options={[
                                    { label: '1M', value: 'MONTH' },
                                    { label: '3M', value: 'QUARTER' },
                                    { label: '1Y', value: 'YEAR' },
                                    { label: 'Custom', value: 'CUSTOM' },
                                ]}
                            />

                            {/* Custom date pickers – shown only when CUSTOM is selected */}
                            {range === 'CUSTOM' && (
                                <div className="flex items-center gap-2 bg-[#1c1c1e] border border-white/10 rounded-2xl px-4 py-3">
                                    <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                                    <input
                                        type="date"
                                        value={customStart}
                                        max={customEnd}
                                        onChange={e => setCustomStart(e.target.value)}
                                        className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                                    />
                                    <span className="text-gray-600 text-xs">→</span>
                                    <input
                                        type="date"
                                        value={customEnd}
                                        min={customStart}
                                        max={today}
                                        onChange={e => setCustomEnd(e.target.value)}
                                        className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── EXPENSES VIEW ─────────────────────────────────────────── */}
                {view === 'EXPENSES' && (
                  loading ? (
                     <div className="flex justify-center py-20"><RefreshCw className="animate-spin h-8 w-8 text-gray-500" /></div>
                  ) : (
                    <>
                        {/* Summary Grid (Responsive) */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <SummaryCard 
                                title="Income" 
                                value={currentStats.income} 
                                icon={TrendingUp} 
                                color="text-green-400" 
                                bg="bg-[#18181b]" 
                            />
                            <SummaryCard 
                                title="Expense" 
                                value={currentStats.expense} 
                                icon={TrendingDown} 
                                color="text-red-400" 
                                bg="bg-[#18181b]" 
                            />
                             <SummaryCard 
                                title="Investments" 
                                value={currentStats.investment} 
                                icon={PiggyBank} 
                                color="text-amber-400" 
                                bg="bg-[#18181b]" 
                            />
                            <SummaryCard 
                                title="Debt Paid" 
                                value={currentStats.debt} 
                                icon={HandCoins} 
                                color="text-purple-400" 
                                bg="bg-[#18181b]" 
                            />
                            <SummaryCard 
                                title="Net Savings" 
                                value={currentStats.net} 
                                icon={Layers} 
                                color={currentStats.net >= 0 ? "text-blue-400" : "text-orange-400"} 
                                bg="bg-[#18181b]" 
                            />
                            <div className="bg-[#18181b] rounded-2xl p-4 flex flex-col justify-between border border-white/5">
                                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Savings Rate</span>
                                <div className="mt-2 text-right">
                                     <span className="text-xl font-bold text-purple-400">{savingsRate.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Charts Area */}
                        <div className="space-y-4">
                            
                            {/* Monthly Trends */}
                            <div className="bg-[#18181b] rounded-3xl p-5 border border-white/5">
                                <h3 className="text-sm font-bold text-gray-300 mb-6 flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-blue-500" /> Income vs Expense
                                </h3>
                                {chartMonthlyData?.data?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={chartMonthlyData.data}>
                                            <XAxis 
                                                dataKey="month" 
                                                stroke="#4b5563" 
                                                fontSize={12} 
                                                tickLine={false} 
                                                axisLine={false} 
                                            />
                                            <YAxis 
                                                stroke="#4b5563" 
                                                fontSize={10} 
                                                tickLine={false} 
                                                axisLine={false} 
                                                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                                            />
                                            <Tooltip 
                                                cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 4 }}
                                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                                                itemStyle={{ color: '#fff' }}
                                                formatter={(value: any, name: any) => [`₹${(Number(value)/1000).toFixed(1)}k`, name]}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                                            <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 4, 4]} maxBarSize={12} />
                                            <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 4, 4]} maxBarSize={12} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyState text="No data" />
                                )}
                            </div>

                            {/* Monthly Comparison */}
                            <div className="bg-[#18181b] rounded-3xl p-5 border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                     <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-purple-500" /> vs Last Month
                                    </h3>
                                </div>

                                <ResponsiveContainer width="100%" height={150}>
                                    <BarChart data={comparisonData} layout="vertical" barGap={2}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={50} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                                            formatter={(value: any, name: any) => [`₹${Math.round(Number(value || 0)).toLocaleString()}`, name]}
                                        />
                                        <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#fff', fontSize: 12, formatter: (val: any) => `₹${(val/1000).toFixed(1)}k` }}>
                                            {comparisonData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Expense Breakdown */}
                            <div className="bg-[#18181b] rounded-3xl p-5 border border-white/5 min-h-[300px]">
                                {/* Header row */}
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                        <PieIcon className="h-4 w-4 text-pink-500" /> 
                                        {selectedDrilldownCategory ? `${selectedDrilldownCategory} Breakdown` : 'Expense Breakdown'}
                                    </h3>
                                    {selectedDrilldownCategory && (
                                        <button 
                                            onClick={() => setSelectedDrilldownCategory(null)}
                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            <ArrowUpRight className="w-3 h-3 rotate-180" /> Back
                                        </button>
                                    )}
                                </div>

                                {/* Category + Tag filters local to this section */}
                                {!selectedDrilldownCategory && (
                                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                                        <div className="flex-1">
                                            <MultiSelect
                                                options={categoryOptions}
                                                selectedIds={selectedCategoryIds}
                                                onChange={setSelectedCategoryIds}
                                                placeholder="Filter Categories"
                                            />
                                        </div>
                                        {tagOptions.length > 0 && (
                                            <div className="flex-1">
                                                <MultiSelect
                                                    options={tagOptions}
                                                    selectedIds={selectedTagIds}
                                                    onChange={setSelectedTagIds}
                                                    placeholder="Filter Tags"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {chartCategoryData?.chartData?.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie
                                                    data={chartCategoryData.chartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    stroke="none"
                                                    onClick={(e) => {
                                                        if (!selectedDrilldownCategory && e.hasSubCategories) {
                                                            setSelectedDrilldownCategory(e.name);
                                                        }
                                                    }}
                                                >
                                                    {chartCategoryData.chartData.map((entry: any, index: number) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={entry.color || COLORS[index % COLORS.length]} 
                                                            style={{ outline: 'none', cursor: (!selectedDrilldownCategory && entry.hasSubCategories) ? 'pointer' : 'default' }}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                    formatter={(value: any, name: any) => [`₹ ${Math.round(Number(value || 0)).toLocaleString()}`, name]}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        
                                        {/* Mobile Details List */}
                                        <div className="mt-8 space-y-4 md:hidden">
                                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Details</div>
                                            {chartCategoryData.chartData.map((item: any) => {
                                                const total = chartCategoryData.chartData.reduce((acc, curr) => acc + curr.value, 0);
                                                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                                                
                                                return (
                                                    <div
                                                        key={item.name}
                                                        className={`flex items-center justify-between text-sm group ${(!selectedDrilldownCategory && item.hasSubCategories) ? 'cursor-pointer active:opacity-70' : ''}`}
                                                        onClick={() => {
                                                            if (!selectedDrilldownCategory && item.hasSubCategories) {
                                                                setSelectedDrilldownCategory(item.name);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                                                            <span className="text-gray-200 font-medium">{item.name}</span>
                                                            {(!selectedDrilldownCategory && item.hasSubCategories) && (
                                                                <ChevronDown className="w-3 h-3 text-gray-500 -rotate-90" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                             <span className="text-white font-semibold">₹{Math.round(item.value).toLocaleString()}</span>
                                                             <div className="w-12 text-right">
                                                                 <span className="text-gray-500 text-xs bg-white/5 px-1.5 py-0.5 rounded ml-auto">
                                                                    {percentage}%
                                                                 </span>
                                                             </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <EmptyState text="No data" />
                                )}
                            </div>

                            {/* Tag Breakdown */}
                            {tagBreakdownData.length > 0 && (
                                <div className="bg-[#18181b] rounded-3xl p-5 border border-white/5">
                                    <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-teal-500" /> Spend by Tag
                                    </h3>
                                    <div className="space-y-3">
                                        {tagBreakdownData.map((item, i) => {
                                            const maxVal = tagBreakdownData[0]?.value || 1;
                                            const pct = Math.round((item.value / maxVal) * 100);
                                            return (
                                                <div key={item.name} className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-300 font-medium flex items-center gap-1.5">
                                                            <Tag className="w-3 h-3 text-teal-400" />
                                                            {item.name}
                                                        </span>
                                                        <span className="text-white font-semibold font-mono">
                                                            ₹{Math.round(item.value).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-white/5 rounded-full h-2">
                                                        <div 
                                                            className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>
                    </>
                  )
                )}

                {/* ── PORTFOLIO VIEW ────────────────────────────────────────── */}
                {view === 'PORTFOLIO' && (
                  portfolioLoading ? (
                    <div className="flex justify-center py-20"><RefreshCw className="animate-spin h-8 w-8 text-gray-500" /></div>
                  ) : portfolioSummary.totalHoldings === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                      <Briefcase className="h-12 w-12 text-gray-500" />
                      <p className="text-gray-400 font-medium">No portfolio holdings yet.</p>
                      <Link href="/portfolio" className="text-purple-400 text-sm hover:underline flex items-center gap-1">
                        Add stocks <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Portfolio Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-[#18181b] rounded-2xl p-4 border border-white/5 space-y-1">
                          <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Invested</span>
                          <p className="text-xl font-bold text-white">₹{portfolioSummary.totalInvestment.toLocaleString()}</p>
                        </div>
                        <div className="bg-[#18181b] rounded-2xl p-4 border border-white/5 space-y-1">
                          <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Current Value</span>
                          <p className="text-xl font-bold text-white">₹{portfolioSummary.totalCurrentValue.toLocaleString()}</p>
                        </div>
                        <div className={`bg-[#18181b] rounded-2xl p-4 border space-y-1 ${portfolioSummary.totalUnrealisedPnL >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                          <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Unrealised P&L</span>
                          <p className={`text-xl font-bold ${portfolioSummary.totalUnrealisedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {portfolioSummary.totalUnrealisedPnL >= 0 ? '+' : ''}₹{portfolioSummary.totalUnrealisedPnL.toLocaleString()}
                          </p>
                          <p className={`text-xs font-medium ${portfolioSummary.totalUnrealisedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {portfolioSummary.totalUnrealisedPnLPercent >= 0 ? '+' : ''}{portfolioSummary.totalUnrealisedPnLPercent.toFixed(2)}%
                          </p>
                        </div>
                        <div className={`bg-[#18181b] rounded-2xl p-4 border space-y-1 ${(portfolioAnalytics?.todayPnL ?? 0) >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                          <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Today P&L</span>
                          <p className={`text-xl font-bold ${(portfolioAnalytics?.todayPnL ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {(portfolioAnalytics?.todayPnL ?? 0) >= 0 ? '+' : ''}₹{(portfolioAnalytics?.todayPnL ?? 0).toLocaleString()}
                          </p>
                          <p className={`text-xs font-medium ${(portfolioAnalytics?.todayPnLPercent ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {(portfolioAnalytics?.todayPnLPercent ?? 0) >= 0 ? '+' : ''}{(portfolioAnalytics?.todayPnLPercent ?? 0).toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {/* Asset Allocation Pie */}
                      {portfolioAllocationData.length > 0 && (
                        <div className="bg-[#18181b] rounded-3xl p-5 border border-white/5">
                          <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                            <PieIcon className="h-4 w-4 text-purple-500" /> Asset Allocation
                          </h3>
                          <div className="flex flex-col md:flex-row gap-6 items-center">
                            <ResponsiveContainer width="100%" height={220}>
                              <PieChart>
                                <Pie
                                  data={portfolioAllocationData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={55}
                                  outerRadius={80}
                                  paddingAngle={3}
                                  dataKey="value"
                                  nameKey="name"
                                  stroke="none"
                                >
                                  {portfolioAllocationData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ outline: 'none' }} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '12px' }}
                                  formatter={(value: any, name: any) => [`₹${Number(value).toLocaleString()}`, name]}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-2 space-y-2">
                            {portfolioAllocationData.map((item, i) => {
                              const total = portfolioAllocationData.reduce((s, h) => s + h.value, 0);
                              const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                              return (
                                <div key={item.name} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="text-gray-200 font-medium">{item.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`text-xs font-semibold ${item.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {item.pnl >= 0 ? '+' : ''}{item.pnlPct.toFixed(1)}%
                                    </span>
                                    <span className="text-white font-bold tabular-nums">₹{item.value.toLocaleString()}</span>
                                    <span className="text-gray-500 text-xs w-10 text-right">{pct}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Gainers / Losers */}
                      {portfolioGainersLosers.length > 0 && (
                        <div className="bg-[#18181b] rounded-3xl p-5 border border-white/5">
                          <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-500" /> Gainers & Losers
                          </h3>
                          <ResponsiveContainer width="100%" height={portfolioGainersLosers.length * 40 + 20}>
                            <BarChart data={portfolioGainersLosers} layout="vertical" barGap={2}>
                              <XAxis type="number" hide tickFormatter={(v) => `${v}%`} />
                              <YAxis dataKey="symbol" type="category" stroke="#9ca3af" fontSize={11} width={70} tickLine={false} axisLine={false} />
                              <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                                formatter={(value: any, name: any) => [`${Number(value).toFixed(2)}%`, 'P&L %']}
                              />
                              <Bar dataKey="pnlPct" radius={[0, 4, 4, 0]} barSize={18}
                                label={{ position: 'right', fill: '#d1d5db', fontSize: 11, formatter: (val: any) => `${(Number(val) >= 0 ? '+' : '')}${Number(val).toFixed(1)}%` }}>
                                {portfolioGainersLosers.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Link to full portfolio */}
                      <div className="flex justify-center pb-2">
                        <Link href="/portfolio" className="flex items-center gap-2 px-5 py-2.5 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-xl text-sm font-semibold hover:bg-purple-600/30 transition-colors">
                          <Briefcase className="w-4 h-4" /> Open Full Portfolio
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  )
                )}

            </main>
        </div>
    );
}

function SummaryCard({ title, value, icon: Icon, color, bg }: any) {
    return (
        <div className={`${bg} rounded-2xl p-4 flex flex-col justify-between border border-white/5`}>
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
                <Icon className={`h-3 w-3 ${color}`} /> {title}
            </span>
            <div className="mt-2 text-right">
                 <span className={`text-xl font-bold text-white`}>
                    ₹{(value/1000).toFixed(1)}k
                 </span>
            </div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 opacity-50">
            <AlertCircle className="h-6 w-6" />
            <p className="text-xs">{text}</p>
        </div>
    );
}
