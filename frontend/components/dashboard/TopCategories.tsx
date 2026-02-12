import React, { useState, useEffect, useRef } from 'react';
import { CategoryBreakdown } from '../../lib/analytics';
import { Filter, Check, X, ArrowRight, Grid } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface TopCategoriesProps {
  categories: CategoryBreakdown[];
  loading?: boolean;
}

export default function TopCategories({ categories, loading }: TopCategoriesProps) {
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Load preferences
  useEffect(() => {
    const saved = localStorage.getItem('top_categories_excluded');
    if (saved) {
        try { setExcludedIds(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const toggleCategory = (id: string) => {
      const newExcluded = excludedIds.includes(id) 
        ? excludedIds.filter(exId => exId !== id)
        : [...excludedIds, id];
      setExcludedIds(newExcluded);
      localStorage.setItem('top_categories_excluded', JSON.stringify(newExcluded));
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
      return (
        <div className="bg-[#1c1c1e]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-visible z-0 animate-pulse">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-white/10 rounded-lg" />
                    <div className="h-6 w-32 bg-white/10 rounded-lg" />
                </div>
            </div>
            <div className="space-y-6">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="space-y-2">
                        <div className="flex justify-between">
                            <div className="flex gap-3">
                                <div className="h-8 w-8 rounded-full bg-white/10" />
                                <div className="space-y-1">
                                    <div className="h-4 w-24 bg-white/10 rounded-full" />
                                    <div className="h-3 w-16 bg-white/10 rounded-full" />
                                </div>
                            </div>
                            <div className="h-5 w-20 bg-white/10 rounded-lg" />
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
                            <div className="h-full bg-white/10 rounded-full w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  const visibleCategories = categories.filter(c => !excludedIds.includes(c.categoryId));
  const topCategories = visibleCategories.slice(0, 5);

  return (
    <div className="bg-[#1c1c1e]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-visible z-0">
      <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-orange-500/10 rounded-lg">
                <Grid className="w-4 h-4 text-orange-400" />
             </div>
             <h3 className="text-lg font-bold text-white">Top Spending</h3>
          </div>
          
          <div className="relative" ref={filterRef}>
            <button 
                onClick={() => setShowFilter(!showFilter)}
                className={clsx(
                    "p-2 rounded-xl transition-all border",
                    showFilter 
                        ? "bg-white text-black border-white" 
                        : "bg-black/20 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                )}
            >
                <Filter size={16} />
            </button>

            {/* Filter Dropdown */}
            {showFilter && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#2c2c2e] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter Categories</span>
                        <button onClick={() => setShowFilter(false)} className="text-gray-400 hover:text-white"><X size={14}/></button>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat.categoryId}
                                onClick={() => toggleCategory(cat.categoryId)}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                            >
                                <span className={clsx("text-sm font-medium", excludedIds.includes(cat.categoryId) ? "text-gray-500 line-through" : "text-white")}>
                                    {cat.categoryName}
                                </span>
                                <div className={clsx(
                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                                    excludedIds.includes(cat.categoryId) 
                                        ? "border-gray-600" 
                                        : "border-blue-500 bg-blue-500 shadow-lg shadow-blue-500/30"
                                )}>
                                    {!excludedIds.includes(cat.categoryId) && <Check size={10} className="text-white" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
      </div>
      
      {topCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <p className="text-sm">No data available</p>
          </div>
      ) : (
          <div className="space-y-4">
            {topCategories.map((cat, index) => (
                <div key={cat.categoryId} className="group relative">
                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <div className="flex items-center gap-3">
                             {/* Category Icon Placeholder - could be better if we had icons in data */}
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ backgroundColor: cat.color || '#4B5563' }}>
                                 {cat.categoryName[0]}
                             </div>
                             <div>
                                 <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                     {cat.categoryName}
                                 </div>
                                 <div className="text-[10px] text-gray-500 font-medium">
                                     {Math.round(cat.percentage)}% of expenses
                                 </div>
                             </div>
                        </div>
                        <div className="text-right">
                             <div className="text-sm font-bold text-white">₹{Math.round(cat.amount).toLocaleString()}</div>
                        </div>
                    </div>
                    
                    {/* Background Bar */}
                    <div className="absolute bottom-0 left-0 w-full h-full bg-white/0 rounded-xl -z-0 group-hover:bg-white/5 transition-colors -mx-2 px-2 py-1 -my-1" />

                    {/* Progress Bar Line */}
                    <div className="w-full bg-gray-800 rounded-full h-1 mt-2 overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(cat.percentage, 100)}%` }}
                            transition={{ duration: 1, delay: index * 0.1 }}
                            className="h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.3)]"
                            style={{ backgroundColor: cat.color || '#EF4444' }}
                        />
                    </div>
                </div>
            ))}
            
            <button className="w-full py-3 mt-4 text-xs font-bold text-gray-500 hover:text-white border border-white/5 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                View Expense Report <ArrowRight size={12} />
            </button>
          </div>
      )}
    </div>
  );
}
