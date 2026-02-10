import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { format } from 'date-fns';

interface CashFlowChartProps {
  data: {
    date: string;
    income: number;
    expense: number;
  }[];
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
  // Format dates for display
  const chartData = data.map(item => ({
    ...item,
    formattedDate: format(new Date(item.date), 'MMM d'),
  }));

  return (
    <div className="bg-[#1c1c1e]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
      {/* Subtle Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
            <h3 className="text-lg font-bold text-white">Cash Flow</h3>
            <p className="text-xs text-gray-500 font-medium">Income vs Expense Trend</p>
        </div>
        <select className="bg-black/20 border border-white/10 text-xs rounded-lg px-3 py-1.5 text-gray-300 focus:outline-none hover:bg-black/40 transition-colors cursor-pointer">
          <option>Last 30 Days</option>
        </select>
      </div>
      
      <div className="h-[280px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34D399" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F87171" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#F87171" stopOpacity={0}/>
              </linearGradient>
            </defs>
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
            <Tooltip 
              contentStyle={{ 
                  backgroundColor: 'rgba(28, 28, 30, 0.95)', 
                  borderColor: 'rgba(255,255,255,0.1)', 
                  color: '#fff', 
                  borderRadius: '16px',
                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                  padding: '12px'
              }}
              itemStyle={{ fontSize: '12px', fontWeight: 500 }}
              labelStyle={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '8px' }}
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
              formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
            <Area 
              type="monotone" 
              dataKey="income" 
              name="Income" 
              stroke="#34D399" 
              fillOpacity={1} 
              fill="url(#colorIncome)" 
              strokeWidth={3}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#1c1c1e' }}
            />
            <Area 
              type="monotone" 
              dataKey="expense" 
              name="Expense" 
              stroke="#F87171" 
              fillOpacity={1} 
              fill="url(#colorExpense)" 
              strokeWidth={3}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#1c1c1e' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
