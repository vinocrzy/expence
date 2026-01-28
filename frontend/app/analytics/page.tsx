'use client';

import { useState } from 'react';
import Navbar from '../../components/Navbar';
import { useAnalytics } from '../../hooks/useLocalData';
import { 
    BarChart2, Calendar, TrendingUp, TrendingDown, 
    RefreshCw, Layers, PieChart as PieIcon, Activity,
    AlertCircle, CheckCircle, Database
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import clsx from 'clsx';
import { motion } from 'framer-motion';

// Colors for charts
const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

export default function AnalyticsPage() {
    const [range, setRange] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('MONTH');
    const months = range === 'YEAR' ? 12 : range === 'QUARTER' ? 3 : 1;
    const { monthlyData, categoryData, loading, refresh } = useAnalytics(months);
    const [rebuilding, setRebuilding] = useState(false);
    
    // Placeholder network status
    const isOnline = false;
    const isSyncing = false;

    const handleRebuild = async () => {
        if (!confirm('Recalculate all analytics from raw transactions? This may take a moment.')) return;
        setRebuilding(true);
        try {
            await refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setRebuilding(false);
        }
    };

    // Derived Stats
    const currentMonthStats = monthlyData[monthlyData.length - 1] || { income: 0, expense: 0, net: 0 };
    const savingsRate = currentMonthStats.income > 0 ? (currentMonthStats.net / currentMonthStats.income) * 100 : 0;

    // Format data for charts
    const chartMonthlyData = {
        data: monthlyData.map(m => ({
            month: m.month,
            income: m.income,
            expense: m.expense,
        }))
    };

    const chartCategoryData = {
        chartData: categoryData.map((c, i) => ({
            name: c.categoryName,
            value: c.amount,
            color: COLORS[i % COLORS.length]
        }))
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans pb-24">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
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
                     <div className="flex gap-2">
                        <select 
                            value={range} 
                            onChange={(e) => setRange(e.target.value as any)}
                            className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                        >
                            <option value="MONTH">This Month</option>
                            <option value="QUARTER">Last Quarter</option>
                            <option value="YEAR">This Year</option>
                        </select>
                        <button 
                            onClick={handleRebuild} 
                            disabled={rebuilding || !isOnline}
                            className={`p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 disabled:opacity-50 transition-all ${rebuilding ? 'animate-pulse' : ''}`}
                            title="Rebuild Analytics"
                        >
                            {rebuilding ? <RefreshCw className="h-5 w-5 animate-spin text-blue-500" /> : <Database className="h-5 w-5 text-gray-400" />}
                        </button>
                    </div>
                </div>

                {loading && !monthlyData ? (
                     <div className="flex justify-center py-20"><RefreshCw className="animate-spin h-8 w-8 text-gray-500" /></div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                            <SummaryCard 
                                title="Income" 
                                value={currentMonthStats.income} 
                                icon={TrendingUp} 
                                color="text-green-500" 
                                bg="bg-green-500/10" 
                            />
                            <SummaryCard 
                                title="Expense" 
                                value={currentMonthStats.expense} 
                                icon={TrendingDown} 
                                color="text-red-500" 
                                bg="bg-red-500/10" 
                            />
                            <SummaryCard 
                                title="Net Savings" 
                                value={currentMonthStats.net} 
                                icon={Layers} 
                                color={currentMonthStats.net >= 0 ? "text-blue-500" : "text-orange-500"} 
                                bg={currentMonthStats.net >= 0 ? "bg-blue-500/10" : "bg-orange-500/10"} 
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
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <PieIcon className="h-5 w-5 text-pink-500" /> Expense Breakdown
                                </h3>
                                {chartCategoryData?.chartData?.length > 0 ? (
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
                                            >
                                                {chartCategoryData.chartData.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px' }}
                                                itemStyle={{ color: '#fff' }}
                                                formatter={(value: number | undefined) => `₹${value?.toLocaleString() ?? 0}`}

                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyState text="No expense data for this period" />
                                )}
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
                                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px' }}
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
