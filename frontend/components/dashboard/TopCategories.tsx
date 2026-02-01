import React, { useState, useEffect, useRef } from 'react';
import { CategoryBreakdown } from '../../lib/analytics';
import { Filter, Check, X } from 'lucide-react';
import { clsx } from 'clsx';

interface TopCategoriesProps {
  categories: CategoryBreakdown[];
}

export default function TopCategories({ categories }: TopCategoriesProps) {
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Load preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem('top_categories_excluded');
    if (saved) {
        try {
            setExcludedIds(JSON.parse(saved));
        } catch (e) {
            console.error('Failed to parse excluded categories', e);
        }
    }
  }, []);

  // Save on change
  const toggleCategory = (id: string) => {
      const newExcluded = excludedIds.includes(id) 
        ? excludedIds.filter(exId => exId !== id)
        : [...excludedIds, id];
      
      setExcludedIds(newExcluded);
      localStorage.setItem('top_categories_excluded', JSON.stringify(newExcluded));
  };

  // Close filter when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter then slice
  const visibleCategories = categories.filter(c => !excludedIds.includes(c.categoryId));
  const topCategories = visibleCategories.slice(0, 5);

  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg relative">
      <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Top Spending</h3>
          <div className="relative" ref={filterRef}>
            <button 
                onClick={() => setShowFilter(!showFilter)}
                className={clsx(
                    "p-2 rounded-lg transition-colors",
                    showFilter ? "bg-purple-500/20 text-purple-400" : "text-gray-400 hover:text-white hover:bg-gray-700"
                )}
                title="Filter Categories"
            >
                <Filter size={18} />
            </button>

            {/* Filter Dropdown */}
            {showFilter && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                    <div className="p-3 border-b border-gray-700 font-semibold text-xs text-gray-400 uppercase tracking-wider flex justify-between items-center">
                        <span>Show Transactions</span>
                        <button onClick={() => setShowFilter(false)}><X size={14}/></button>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat.categoryId}
                                onClick={() => toggleCategory(cat.categoryId)}
                                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-700/50 transition-colors text-left"
                            >
                                <span className={clsx("text-sm truncate pr-2", excludedIds.includes(cat.categoryId) ? "text-gray-500 line-through" : "text-gray-200")}>
                                    {cat.categoryName}
                                </span>
                                <div className={clsx(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    excludedIds.includes(cat.categoryId) 
                                        ? "border-gray-600 bg-transparent" 
                                        : "border-purple-500 bg-purple-500"
                                )}>
                                    {!excludedIds.includes(cat.categoryId) && <Check size={12} className="text-white" />}
                                </div>
                            </button>
                        ))}
                        {categories.length === 0 && (
                            <div className="text-center text-gray-500 py-4 text-xs">No categories found</div>
                        )}
                    </div>
                </div>
            )}
          </div>
      </div>
      
      {topCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-500 py-12 h-full">
              <div className="bg-gray-700/50 p-4 rounded-full mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-sm">
                  {visibleCategories.length === 0 && categories.length > 0 
                    ? "All categories hidden" 
                    : "No expense data this month"}
              </p>
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
