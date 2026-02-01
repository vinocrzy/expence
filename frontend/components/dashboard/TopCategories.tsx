import React from 'react';
import { CategoryBreakdown } from '../../lib/analytics';

interface TopCategoriesProps {
  categories: CategoryBreakdown[];
}

export default function TopCategories({ categories }: TopCategoriesProps) {
  // Take top 5
  const topCategories = categories.slice(0, 5);

  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-6">Top Spending</h3>
      
      {topCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-500 py-12 h-full">
              <div className="bg-gray-700/50 p-4 rounded-full mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-sm">No expense data this month</p>
          </div>
      ) : (
          <div className="space-y-5">
            {topCategories.map((cat) => (
                <div key={cat.categoryId} className="group">
                    <div className="flex justify-between items-end mb-2 text-sm">
                        <span className="text-gray-300 font-medium truncate pr-2">{cat.categoryName}</span>
                        <div className="text-right">
                             <span className="text-white font-bold block">₹{Math.round(cat.amount).toLocaleString()}</span>
                             <span className="text-xs text-gray-500">{Math.round(cat.percentage)}%</span>
                        </div>
                    </div>
                    <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out group-hover:brightness-110"
                            style={{ 
                                width: `${Math.min(cat.percentage, 100)}%`,
                                backgroundColor: cat.color || '#EF4444' 
                            }}
                        />
                    </div>
                </div>
            ))}
          </div>
      )}
    </div>
  );
}
