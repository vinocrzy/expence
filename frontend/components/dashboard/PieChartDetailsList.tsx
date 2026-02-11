import React from 'react';

interface PieChartDetailItem {
    name: string;
    value: number;
    color: string;
}

interface PieChartDetailsListProps {
    data: PieChartDetailItem[];
    currency?: string;
    title?: string;
}

export default function PieChartDetailsList({ data, currency = '₹', title = 'Details' }: PieChartDetailsListProps) {
    if (!data || data.length === 0) return null;

    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="mt-6 space-y-4 md:hidden">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</div>
            {data.map((item) => {
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                
                return (
                    <div key={item.name} className="flex items-center justify-between text-sm group">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                            <span className="text-gray-200 font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-white font-semibold">{currency}{Math.round(item.value).toLocaleString()}</span>
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
    );
}
