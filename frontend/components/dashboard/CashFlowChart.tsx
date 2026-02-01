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
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Cash Flow Trend</h3>
        <select className="bg-gray-900 border border-gray-700 text-xs rounded-lg px-2 py-1 text-gray-400 focus:outline-none">
          <option>Last 30 Days</option>
          {/* Future: Add more ranges */}
        </select>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis 
              dataKey="formattedDate" 
              stroke="#9CA3AF" 
              tick={{ fontSize: 12 }} 
              tickMargin={10}
              interval={Math.ceil(data.length / 5)} 
            />
            <YAxis 
              stroke="#9CA3AF" 
              tick={{ fontSize: 12 }} 
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff', borderRadius: '12px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="income" 
              name="Income" 
              stroke="#10B981" 
              fillOpacity={1} 
              fill="url(#colorIncome)" 
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="expense" 
              name="Expense" 
              stroke="#EF4444" 
              fillOpacity={1} 
              fill="url(#colorExpense)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
