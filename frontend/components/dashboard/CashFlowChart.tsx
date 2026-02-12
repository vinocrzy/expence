import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { format } from 'date-fns';

interface CashFlowChartProps {
    data: {
      date: string;
      income: number;
      expense: number;
      investment: number;
      debt: number;
    }[];
    loading?: boolean;
  }
  
  export default function CashFlowChart({ data, loading }: CashFlowChartProps) {
    if (loading) {
        return (
            <div className="bg-[#1c1c1e]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden animate-pulse h-[380px]">
                <div className="flex justify-between items-center mb-6">
                    <div className="space-y-2">
                        <div className="h-6 w-32 bg-white/10 rounded-lg" />
                        <div className="h-4 w-48 bg-white/10 rounded-lg" />
                    </div>
                    <div className="h-8 w-32 bg-white/10 rounded-lg" />
                </div>
                <div className="w-full h-[280px] flex items-end gap-2">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="flex-1 bg-white/5 rounded-t-lg" style={{ height: `${Math.random() * 80 + 20}%` }} />
                    ))}
                </div>
            </div>
        );
    }
  
    // Format dates for display
    const chartData = data.map((item: any) => ({
      ...item,
      formattedDate: format(new Date(item.date), 'MMM d'),
    }));
  
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-[#1c1c1e]/95 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl">
            <p className="text-gray-400 text-xs font-medium mb-2">{label}</p>
            {payload.map((entry: any, index: number) => {
               if (entry.value === 0) return null; // Hide zero values
               return (
                <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs font-medium text-gray-300 capitalize">{entry.name}:</span>
                  <span className="text-xs font-bold text-white tabular-nums">
                      ₹{Number(entry.value).toLocaleString()}
                  </span>
                </div>
               );
            })}
          </div>
        );
      }
      return null;
    };
  
    return (
      <div className="bg-[#1c1c1e]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
              <h3 className="text-lg font-bold text-white">Cash Flow</h3>
              <p className="text-sm text-gray-400 font-medium">Income vs Expense Trend</p>
          </div>
          <select className="bg-white/10 border border-white/10 text-sm rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none hover:bg-white/20 transition-colors cursor-pointer">
            <option>Last 30 Days</option>
          </select>
        </div>
        
        <div className="h-[280px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#525252" 
                tick={{ fontSize: 10, fill: '#737373' }} 
                tickMargin={15}
                interval={Math.ceil(data.length / 5)} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                stroke="#525252" 
                tick={{ fontSize: 10, fill: '#737373' }} 
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
              
              <Bar 
                dataKey="income" 
                name="Income" 
                fill="#34D399" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar 
                dataKey="expense" 
                name="Expense" 
                fill="#F87171" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar 
                dataKey="investment" 
                name="Investment" 
                fill="#3B82F6" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar 
                dataKey="debt" 
                name="Debt" 
                fill="#A855F7" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }
