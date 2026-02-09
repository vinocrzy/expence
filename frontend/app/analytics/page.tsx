'use client';

import { useState, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import { useTransactions, useCategories } from '../../hooks/useLocalData';
import { 
    BarChart2, Calendar, TrendingUp, TrendingDown, 
    RefreshCw, Layers, PieChart as PieIcon, Activity,
    AlertCircle, CheckCircle, Database, Filter, ArrowUpRight,
    Check, ChevronDown, X
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

// Colors for charts
const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

export default function AnalyticsPage() {
    const [range, setRange] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('MONTH');
    const months = range === 'YEAR' ? 12 : range === 'QUARTER' ? 3 : 1;
    
    // Load raw data
    const { transactions, loading: txLoading } = useTransactions();
    const { categories, loading: catLoading } = useCategories();
    const loading = txLoading || catLoading;

    // -- State for Independent Filters --
    
    // 1. Expense Breakdown (Pie) - Multi-Select
    const [pieFilterIds, setPieFilterIds] = useState<string[]>([]); // Empty = ALL
    const [isPieDropdownOpen, setIsPieDropdownOpen] = useState(false);

    const togglePieCategory = (catId: string) => {
        setPieFilterIds(prev => 
            prev.includes(catId)
                ? prev.filter(id => id !== catId)
                : [...prev, catId]
        );
    };

    // 2. Comparison Chart (Bar) - Single-Select
    const [barFilterId, setBarFilterId] = useState<string>('ALL'); // 'ALL' = Global Comparison
    const [isBarDropdownOpen, setIsBarDropdownOpen] = useState(false);
    
    // Calculate date range for filtering transactions
    const dateRange = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - months);
        // Normalize to verify inclusion
        start.setHours(0,0,0,0);
        return { start, end };
    }, [months]);

    // Filter transactions (Global - only Date Range applies)
    const filteredTransactions = useMemo(() => {
         return transactions.filter(t => {
            const d = new Date(t.date);
            const inDate = d >= dateRange.start && d <= dateRange.end;
            const isExpense = t.type === 'EXPENSE';
            // Global list ignores category filter now
            return inDate && isExpense;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, dateRange]);
    
    // Placeholder network status
    const isOnline = false;
    const isSyncing = false;

    // -- Client-Side Analytics Calculations --

    // 1. Calculate Monthly Trend Data (Global - ignores category filter)
    const chartMonthlyData = useMemo(() => {
        const data: Record<string, { income: number; expense: number }> = {};
        
        // Initialize months map
        let current = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        while (current <= end) {
            const key = format(current, 'MMM yyyy');
            data[key] = { income: 0, expense: 0 };
            current.setMonth(current.getMonth() + 1);
        }

        transactions.forEach(t => {
            const d = new Date(t.date);
            if (d >= dateRange.start && d <= dateRange.end) {
                // Global chart ignores category filter now
                
                const key = format(d, 'MMM yyyy');
                if (data[key]) {
                    if (t.type === 'INCOME') data[key].income += t.amount;
                    if (t.type === 'EXPENSE') data[key].expense += t.amount;
                }
            }
        });

        return {
            data: Object.entries(data).map(([month, stats]) => ({
                month,
                income: stats.income,
                expense: stats.expense
            }))
        };
    }, [transactions, dateRange]); // Removed selectedCategoryId dep

    // 2. Calculate Category Breakdown (Pie Chart)
    // Supports Multi-Select Filtering
    const chartCategoryData = useMemo(() => {
        const catMap = new Map<string, number>();
        let total = 0;

        transactions.forEach(t => {
            const d = new Date(t.date);
            // Date Filter always applies
            if (d >= dateRange.start && d <= dateRange.end && t.type === 'EXPENSE') {
                
                // Apply Multi-Select Filter if active (pieFilterIds)
                if (pieFilterIds.length > 0 && t.categoryId && !pieFilterIds.includes(t.categoryId)) {
                    return;
                }

                const catName = categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
                catMap.set(catName, (catMap.get(catName) || 0) + t.amount);
                total += t.amount;
            }
        });

        return {
            chartData: Array.from(catMap.entries())
                .map(([name, value], i) => ({
                    name,
                    value,
                    color: categories.find(c => c.name === name)?.color || COLORS[i % COLORS.length]
                }))
                .sort((a, b) => b.value - a.value)
        };

    }, [transactions, dateRange, categories, pieFilterIds]);

    // 3. Sub-Category Breakdown Data
    const [selectedCategoryForBreakdown, setSelectedCategoryForBreakdown] = useState<string | null>(null);

    const subCategoryData = useMemo(() => {
        if (!selectedCategoryForBreakdown) return [];

        const category = categories.find(c => c.id === selectedCategoryForBreakdown);
        if (!category) return [];

        const subCatMap = new Map<string, number>();
        let total = 0;

        transactions.forEach(t => {
            if (t.categoryId === selectedCategoryForBreakdown && t.type === 'EXPENSE') {
                 const d = new Date(t.date);
                 if (d >= dateRange.start && d <= dateRange.end) {
                     const subId = t.subCategoryId || 'unspecified';
                     subCatMap.set(subId, (subCatMap.get(subId) || 0) + t.amount);
                     total += t.amount;
                 }
            }
        });

        return Array.from(subCatMap.entries()).map(([subId, value]) => {
            const subName = category.subCategories?.find(sc => sc.id === subId)?.name || (subId === 'unspecified' ? 'Unspecified' : 'Unknown');
            return {
                categoryId: subId,
                categoryName: subName,
                amount: value,
                color: category.color // Inherit parent color for now
            };
        }).sort((a, b) => b.amount - a.amount);
    }, [transactions, dateRange, selectedCategoryForBreakdown, categories]);

    // 4. Current Period Stats (Summary Cards)
    const currentStats = useMemo(() => {
        // Use chartMonthlyData to aggregate total for the selected period
        return chartMonthlyData.data.reduce((acc, curr) => ({
            income: acc.income + curr.income,
            expense: acc.expense + curr.expense,
            net: acc.net + (curr.income - curr.expense)
        }), { income: 0, expense: 0, net: 0 });
    }, [chartMonthlyData]);

    const savingsRate = currentStats.income > 0 ? (currentStats.net / currentStats.income) * 100 : 0;

    // 4. Comparison Chart Data (Scoped to SINGLE selected category or Global)
    const comparisonData = useMemo(() => {
        const now = new Date();
        const thisMonthKey = format(now, 'yyyy-MM');
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthKey = format(lastMonthDate, 'yyyy-MM');

        let thisMonthTotal = 0;
        let lastMonthTotal = 0;

        transactions.forEach(t => {
             if (t.type !== 'EXPENSE') return;
             
             // If NOT 'ALL', ensure it matches the selected single category
             if (barFilterId !== 'ALL') {
                 if (!t.categoryId || t.categoryId !== barFilterId) return;
             }

             const tDate = new Date(t.date);
             const tKey = format(tDate, 'yyyy-MM');

             if (tKey === thisMonthKey) thisMonthTotal += t.amount;
             if (tKey === lastMonthKey) lastMonthTotal += t.amount;
        });

        return [
            { name: 'Last Month', amount: lastMonthTotal, fill: '#9ca3af' },
            { name: 'This Month', amount: thisMonthTotal, fill: thisMonthTotal > lastMonthTotal ? '#ef4444' : '#10b981' }
        ];
    }, [barFilterId, transactions]);


    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans pb-24">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <BarChart2 className="h-8 w-8 text-blue-500" />
                            Analytics & Insights
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">
                            {isOnline ? 'Live data from cloud' : 'Viewing offline cache'} 
                            {isSyncing && <span className="ml-2 text-yellow-500 text-xs">(Syncing...)</span>}
                        </p>
                    </div>
                     <div className="flex gap-2 w-full md:w-auto">
                        <select 
                            value={range} 
                            onChange={(e) => setRange(e.target.value as any)}
                            className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 flex-1 md:flex-none"
                        >
                            <option value="MONTH">This Month</option>
                            <option value="QUARTER">Last Quarter</option>
                            <option value="YEAR">This Year</option>
                        </select>
                        <div className="relative min-w-[200px] z-20 hidden">
                            {/* Hidden global filter */}
                        </div>
                        <button 
                            onClick={() => {}} 
                            disabled={true}
                            className={`hidden p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 disabled:opacity-50 transition-all`}
                            title="Rebuild Analytics"
                        >
                            <Database className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {loading ? (
                     <div className="flex justify-center py-20"><RefreshCw className="animate-spin h-8 w-8 text-gray-500" /></div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                            <SummaryCard 
                                title="Income" 
                                value={currentStats.income} 
                                icon={TrendingUp} 
                                color="text-green-500" 
                                bg="bg-green-500/10" 
                            />
                            <SummaryCard 
                                title="Expense" 
                                value={currentStats.expense} 
                                icon={TrendingDown} 
                                color="text-red-500" 
                                bg="bg-red-500/10" 
                            />
                            <SummaryCard 
                                title="Net Savings" 
                                value={currentStats.net} 
                                icon={Layers} 
                                color={currentStats.net >= 0 ? "text-blue-500" : "text-orange-500"} 
                                bg={currentStats.net >= 0 ? "bg-blue-500/10" : "bg-orange-500/10"} 
                            />
                            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700/50 flex flex-col justify-between">
                                <span className="text-gray-400 text-sm font-medium">Savings Rate</span>
                                <div className="flex items-end justify-between mt-2">
                                     <span className="text-2xl font-bold text-purple-400">{savingsRate.toFixed(1)}%</span>
                                     <Activity className="h-6 w-6 text-purple-500/50" />
                                </div>
                            </div>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
                            
                            {/* Expense Breakdown (Pie) */}
                            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50 min-h-[400px]">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <PieIcon className="h-5 w-5 text-pink-500" /> 
                                        {selectedCategoryForBreakdown ? (
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => setSelectedCategoryForBreakdown(null)}
                                                    className="text-gray-400 hover:text-white transition-colors text-sm"
                                                >
                                                    Expenses /
                                                </button>
                                                <span className="text-pink-400">{categories.find(c => c.id === selectedCategoryForBreakdown)?.name}</span>
                                            </div>
                                        ) : 'Expense Breakdown'}
                                    </h3>
                                    
                                    {/* Multi-Select for Pie Chart (Only show if NOT drilling down) */}
                                    {!selectedCategoryForBreakdown && (
                                        <div className="relative z-30">
                                            <button
                                                onClick={() => setIsPieDropdownOpen(!isPieDropdownOpen)}
                                                className="bg-gray-700 text-white text-xs rounded-lg px-3 py-1.5 border border-gray-600 focus:outline-none flex items-center gap-2 hover:bg-gray-600 transition-colors"
                                            >
                                                <span className="truncate max-w-[100px]">
                                                    {pieFilterIds.length === 0 
                                                        ? 'All Categories' 
                                                        : `${pieFilterIds.length} Selected`}
                                                </span>
                                                <ChevronDown className="h-3 w-3 text-gray-400" />
                                            </button>
                                            
                                            {isPieDropdownOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setIsPieDropdownOpen(false)} />
                                                    <div className="absolute top-full right-0 mt-2 w-48 max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 p-2 space-y-1">
                                                        <button
                                                            onClick={() => setPieFilterIds([])}
                                                            className={clsx(
                                                                "w-full text-left px-3 py-2 rounded-md text-xs transition-colors result-item flex items-center justify-between",
                                                                pieFilterIds.length === 0 ? "bg-pink-500 text-white" : "text-gray-300 hover:bg-gray-700"
                                                            )}
                                                        >
                                                            <span>All Categories</span>
                                                            {pieFilterIds.length === 0 && <Check className="h-3 w-3" />}
                                                        </button>
                                                        {categories.map(c => (
                                                            <button
                                                                key={c.id}
                                                                onClick={() => togglePieCategory(c.id)}
                                                                className={clsx(
                                                                    "w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between",
                                                                    pieFilterIds.includes(c.id) ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
                                                                )}
                                                            >
                                                                <span>{c.name}</span>
                                                                {pieFilterIds.includes(c.id) && <Check className="h-3 w-3 text-pink-400" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {selectedCategoryForBreakdown ? (
                                    // Sub-category View
                                    subCategoryData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={subCategoryData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="amount"
                                                    nameKey="categoryName"
                                                    className="focus:outline-none"
                                                >
                                                    {subCategoryData.map((entry: any, index: number) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={entry.color || COLORS[index % COLORS.length]} 
                                                            className="transition-all duration-200 hover:opacity-80"
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                    formatter={(value: any, name: any) => [`₹ ${Math.round(Number(value || 0)).toLocaleString()}`, name]}
                                                />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <EmptyState text="No sub-category data available" />
                                    )
                                ) : (
                                    // Main Category View
                                    chartCategoryData?.chartData?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={chartCategoryData.chartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    onClick={(data) => {
                                                     const cat = categories.find(c => c.name === data.name);
                                                     if (cat) {
                                                         setSelectedCategoryForBreakdown(cat.id);
                                                     }
                                                    }}
                                                    className="cursor-pointer focus:outline-none"
                                                >
                                                    {chartCategoryData.chartData.map((entry: any, index: number) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={entry.color || COLORS[index % COLORS.length]} 
                                                            stroke={pieFilterIds.length > 0 && categories.find(c => c.name === entry.name)?.id && pieFilterIds.includes(categories.find(c => c.name === entry.name)!.id) ? "#fff" : "rgba(0,0,0,0.2)"}
                                                            strokeWidth={pieFilterIds.length > 0 && categories.find(c => c.name === entry.name)?.id && pieFilterIds.includes(categories.find(c => c.name === entry.name)!.id) ? 2 : 1}
                                                            className="transition-all duration-200 hover:opacity-80"
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                    formatter={(value: any, name: any) => [`₹ ${Math.round(Number(value || 0)).toLocaleString()}`, name]}
                                                />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" onClick={(data) => {
                                                     const cat = categories.find(c => c.name === data.value);
                                                     if (cat) togglePieCategory(cat.id);
                                                }} className="cursor-pointer"/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <EmptyState text="No expense data for this period" />
                                    )
                                )}
                            </div>

                            {/* Monthly Comparison Chart (Always Visible, Single Select) */}
                            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50 min-h-[400px]">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-purple-500" /> 
                                        Monthly Comparison
                                    </h3>

                                    {/* Single-Select for Bar Chart */}
                                    <div className="relative z-30">
                                        <button
                                            onClick={() => setIsBarDropdownOpen(!isBarDropdownOpen)}
                                            className="bg-gray-700 text-white text-xs rounded-lg px-3 py-1.5 border border-gray-600 focus:outline-none flex items-center gap-2 hover:bg-gray-600 transition-colors"
                                        >
                                            <span className="truncate max-w-[100px]">
                                                {barFilterId === 'ALL' 
                                                    ? 'All Categories' 
                                                    : categories.find(c => c.id === barFilterId)?.name || 'Selected'}
                                            </span>
                                            <ChevronDown className="h-3 w-3 text-gray-400" />
                                        </button>
                                        
                                        {isBarDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsBarDropdownOpen(false)} />
                                                <div className="absolute top-full right-0 mt-2 w-48 max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 p-2 space-y-1">
                                                    <button
                                                        onClick={() => { setBarFilterId('ALL'); setIsBarDropdownOpen(false); }}
                                                        className={clsx(
                                                            "w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between",
                                                            barFilterId === 'ALL' ? "bg-purple-500 text-white" : "text-gray-300 hover:bg-gray-700"
                                                        )}
                                                    >
                                                        <span>All Categories</span>
                                                        {barFilterId === 'ALL' && <Check className="h-3 w-3" />}
                                                    </button>
                                                    {categories.map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => { setBarFilterId(c.id); setIsBarDropdownOpen(false); }}
                                                            className={clsx(
                                                                "w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between",
                                                                barFilterId === c.id ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"
                                                            )}
                                                        >
                                                            <span>{c.name}</span>
                                                            {barFilterId === c.id && <Check className="h-3 w-3 text-purple-400" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={comparisonData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                        <XAxis type="number" stroke="#9ca3af" tickFormatter={(val) => `₹${val}`} />
                                        <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                                        <Tooltip 
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: any) => [`₹ ${Math.round(Number(value || 0)).toLocaleString()}`, 'Amount']}
                                        />
                                        <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={40}>
                                            {comparisonData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Monthly Trends (Bar + Line) */}
                            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50 min-h-[400px]">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-blue-500" /> Income vs Expense Trend
                                </h3>
                                {chartMonthlyData?.data?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={chartMonthlyData.data}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                            <XAxis dataKey="month" stroke="#9ca3af" tickFormatter={(val) => val} />
                                            <YAxis stroke="#9ca3af" tickFormatter={(val) => `₹${val/1000}k`} />
                                            <Tooltip 
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff' }}
                                                formatter={(value: any) => [`₹ ${Math.round(Number(value || 0)).toLocaleString()}`, '']}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyState text="Not enough history data" />
                                )}
                            </div>
                        </div>

                        {/* Filtered Transactions List */}
                        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50 mb-12">
                             <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-purple-500" /> 
                                    All Expenses (Global List)
                                    <span className="text-sm font-normal text-gray-500 ml-2">({filteredTransactions.length} found)</span>
                                </h3>
                                {/* Removed Clear Filter button as list is global now */}
                             </div>

                             <div className="space-y-3">
                                {txLoading ? (
                                    <div className="text-center py-8 text-gray-500">Loading transactions...</div>
                                ) : filteredTransactions.length > 0 ? (
                                    filteredTransactions.map(t => (
                                        <div key={t.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700/30 hover:bg-gray-750 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-red-500/10 rounded-lg">
                                                    <ArrowUpRight className="h-4 w-4 text-red-400" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{t.description || 'No description'}</div>
                                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                                        <span>{format(new Date(t.date), 'MMM d, yyyy')}</span>
                                                        <span>•</span>
                                                         <span>{categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right font-mono font-bold text-red-400">
                                                -₹{t.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <EmptyState text="No expenses found for this selection" />
                                )}
                             </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

function SummaryCard({ title, value, icon: Icon, color, bg }: any) {
    return (
        <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700/50 flex flex-col justify-between hover:border-gray-600 transition-colors">
            <span className="text-gray-400 text-sm font-medium flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} /> {title}
            </span>
            <div className="mt-3">
                 <span className={`text-2xl font-bold text-white`}>
                    ₹{value?.toLocaleString() || '0'}
                 </span>
            </div>
            <div className={`mt-2 h-1 w-full rounded-full bg-gray-700 overflow-hidden`}>
                <div className={`h-full ${bg.replace('/10', '')}`} style={{ width: '100%' }}></div>
            </div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
            <AlertCircle className="h-8 w-8 opacity-50" />
            <p className="text-sm">{text}</p>
        </div>
    );
}
