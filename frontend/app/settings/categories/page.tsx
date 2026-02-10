'use client';

import { useState } from 'react';
import Navbar from '../../../components/Navbar';
import NativeHeader from '../../../components/dashboard/NativeHeader';
import CategoryModal from '../../../components/CategoryModal';
import { useCategories } from '../../../hooks/useLocalData';
import { useAuth } from '../../../context/AuthContext';
import { Category } from '../../../lib/db-types';
import { Plus, Tag, Edit2, ArrowDownCircle, ArrowUpCircle, RefreshCw, EyeOff, CheckCircle, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export default function CategoriesSettingsPage() {
  const { user } = useAuth();
  const { categories, loading, addCategory, updateCategory, refresh } = useCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');

  const handleCreate = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, data);
      } else {
        await addCategory(data);
      }
    } catch (error) {
       console.error(error);
    }
  };

  const toggleStatus = async (e: React.MouseEvent, category: Category) => {
      e.stopPropagation();
      try {
          await updateCategory(category.id, { isActive: !category.isActive });
      } catch (error) {
          console.error('Failed to toggle status', error);
          refresh();
      }
  };

  const filteredCategories = categories.filter(c => filter === 'ALL' || c.type === filter);
  const expenseCategories = filteredCategories.filter(c => c.type === 'EXPENSE');
  const incomeCategories = filteredCategories.filter(c => c.type === 'INCOME');

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-24 selection:bg-purple-500 selection:text-white">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <NativeHeader 
            title="Categories"
        />

        {/* Action Header */}
        <div className="flex items-center justify-between">
            <div className="bg-[#1c1c1e] rounded-xl p-1 flex items-center border border-white/5">
                {['ALL', 'EXPENSE', 'INCOME'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            <button
                onClick={handleCreate}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>

        {loading ? (
           <div className="flex flex-col items-center justify-center py-24 space-y-4">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
               <p className="text-gray-500 text-sm">Loading categories...</p>
           </div>
        ) : (
          <div className="space-y-6">
              {/* Expense Section */}
              {(filter === 'ALL' || filter === 'EXPENSE') && expenseCategories.length > 0 && (
                  <section>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                          Expenses
                      </h3>
                      <div className="bg-[#1c1c1e] rounded-3xl border border-white/5 overflow-hidden">
                          {expenseCategories.map((cat, i) => (
                              <CategoryRow 
                                key={cat.id} 
                                category={cat} 
                                isLast={i === expenseCategories.length - 1}
                                onEdit={() => handleEdit(cat)} 
                                onToggle={(e) => toggleStatus(e, cat)}
                              />
                          ))}
                      </div>
                  </section>
              )}

              {/* Income Section */}
              {(filter === 'ALL' || filter === 'INCOME') && incomeCategories.length > 0 && (
                  <section>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                          Income
                      </h3>
                      <div className="bg-[#1c1c1e] rounded-3xl border border-white/5 overflow-hidden">
                          {incomeCategories.map((cat, i) => (
                              <CategoryRow 
                                key={cat.id} 
                                category={cat} 
                                isLast={i === incomeCategories.length - 1}
                                onEdit={() => handleEdit(cat)} 
                                onToggle={(e) => toggleStatus(e, cat)}
                              />
                          ))}
                      </div>
                  </section>
              )}

              {filteredCategories.length === 0 && (
                  <div className="text-center py-12 text-gray-500 bg-[#1c1c1e] rounded-3xl border border-white/5 mx-auto max-w-sm border-dashed">
                      <Tag className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                      <p className="text-sm">No categories found.</p>
                      <button onClick={handleCreate} className="text-blue-400 text-sm font-bold mt-2 hover:underline">Create One</button>
                  </div>
              )}
          </div>
        )}
      </main>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingCategory}
      />
    </div>
  );
}

function CategoryRow({ category, isLast, onEdit, onToggle }: { category: Category, isLast: boolean, onEdit: () => void, onToggle: (e: React.MouseEvent) => void }) {
    return (
        <div 
            onClick={onEdit}
            className={`flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group ${!isLast ? 'border-b border-white/5' : ''}`}
        >
            <div className="flex items-center gap-4">
                <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-inner relative"
                    style={{ backgroundColor: category.isActive ? category.color : '#27272a' }}
                >
                    <Tag className="h-4 w-4 fill-white/20" />
                    {!category.isActive && (
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                            <EyeOff className="w-4 h-4 text-gray-400" />
                        </div>
                    )}
                </div>
                <div>
                    <div className={clsx("font-bold text-[15px] transition-colors", category.isActive ? "text-white" : "text-gray-500 line-through")}>
                        {category.name}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                 <button 
                    onClick={onToggle}
                    className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        category.isActive ? "bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400" : "bg-green-500/20 text-green-400"
                    )}
                 >
                     {category.isActive ? <EyeOff className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                 </button>
                 <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
            </div>
        </div>
    );
}
