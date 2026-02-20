import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string;
  trend?: {
    value: number;
    label: string;
    positive: boolean;
  };
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
}

export default function StatCard({ title, value, trend, icon: Icon, color }: StatCardProps) {
  const colorStyles = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    red: 'bg-red-500/10 text-red-500', 
    yellow: 'bg-yellow-500/10 text-yellow-500',
  };

  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg hover:border-gray-600 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        </div>
        <div className={clsx("p-3 rounded-xl", colorStyles[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      {trend && (
        <div className="flex items-center gap-2 mt-4 text-sm">
          <span className={clsx(
            "font-medium",
            trend.positive ? "text-green-400" : "text-red-400"
          )}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
          <span className="text-gray-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
