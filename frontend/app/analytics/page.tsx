'use client';

import { useState, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import NativeHeader from '../../components/dashboard/NativeHeader';
import { useTransactions, useCategories } from '../../hooks/useLocalData';
import { 
    BarChart2, TrendingUp, TrendingDown, 
    RefreshCw, Layers, PieChart as PieIcon, Activity,
    AlertCircle, Check, ChevronDown, Filter, ArrowUpRight,
    PiggyBank, HandCoins
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
    const [range, setRange] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('MONTH');
    const months = range === 'YEAR' ? 12 : range === 'QUARTER' ? 3 : 1;
    
    // Load raw data
    const { transactions, loading: txLoading } = useTransactions();
    const { categories, loading: catLoading } = useCategories();
    const loading = txLoading || catLoading;

    // -- State for Independent Filters --
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]); // Empty = ALL
    
    // Drill-down State
    const [selectedDrilldownCategory, setSelectedDrilldownCategory] = useState<string | null>(null);
    
    // Calculate date range for filtering transactions
    const dateRange = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - months);
        start.setHours(0,0,0,0);
        return { start, end };
    }, [months]);

    const categoryOptions = useMemo(() => categories.map(c => ({ 
        id: c.id, 
        label: c.name, 
        color: c.color 
    })), [categories]);

    // Filter transactions (Global - only Date Range applies)
    const filteredTransactions = useMemo(() => {
         return transactions.filter(t => {
            const d = new Date(t.date);
            const inDate = d >= dateRange.start && d <= dateRange.end;
            const isExpense = t.type === 'EXPENSE';
            return inDate && isExpense;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, dateRange]);
    
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
            if (d >= dateRange.start && d <= dateRange.end) {
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
    }, [transactions, dateRange]);

    // 2. Calculate Category Breakdown (with Drill-down)
    const chartCategoryData = useMemo(() => {
        const catMap = new Map<string, number>();
        
        // If drill-down is active, find the category object
        const activeCategory = selectedDrilldownCategory ? categories.find(c => c.name === selectedDrilldownCategory) : null;

        transactions.forEach(t => {
            const d = new Date(t.date);
            if (d >= dateRange.start && d <= dateRange.end && t.type === 'EXPENSE') {
                
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
                    return { name, value, color };
                })
                .sort((a, b) => b.value - a.value)
        };
    }, [transactions, dateRange, categories, selectedCategoryIds, selectedDrilldownCategory]);

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
    }, [selectedCategoryIds, transactions]);


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
                    
                    <NativeSegmentedControl 
                        value={range}
                        onChange={(v) => setRange(v as any)}
                        options={[
                            { label: '1M', value: 'MONTH' },
                            { label: '3M', value: 'QUARTER' },
                            { label: '1Y', value: 'YEAR' }
                        ]}
                    />

                    <div className="w-full md:w-64">
                         <MultiSelect 
                            options={categoryOptions}
                            selectedIds={selectedCategoryIds}
                            onChange={setSelectedCategoryIds}
                            placeholder="Filter Categories"
                         />
                    </div>
                </div>

                {loading ? (
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
                                <div className="flex items-center justify-between mb-2">
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
                                                        if (!selectedDrilldownCategory) {
                                                            // Only allow drilling down from top-level
                                                            setSelectedDrilldownCategory(e.name);
                                                        }
                                                    }}
                                                    className={!selectedDrilldownCategory ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                                                >
                                                    {chartCategoryData.chartData.map((entry: any, index: number) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={entry.color || COLORS[index % COLORS.length]} 
                                                            style={{ outline: 'none' }}
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
                                                    <div key={item.name} className="flex items-center justify-between text-sm group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                                                            <span className="text-gray-200 font-medium">{item.name}</span>
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

                        </div>
                    </>
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
