'use client';

import { useState } from 'react';
import Navbar from '../../../components/Navbar';
import CategoryModal from '../../../components/CategoryModal';
import { useCategories } from '../../../hooks/useLocalData';
import { Plus, Tag, Trash2, Edit2, ArrowDownCircle, ArrowUpCircle, RefreshCw, EyeOff, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// Types
type Category = {
    id: string;
    name: string;
    kind: 'EXPENSE' | 'INCOME';
    color: string;
    isActive: boolean;
    usageCount?: number; // Optional context
};

export default function CategoriesSettingsPage() {
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

  const toggleStatus = async (category: Category) => {
      try {
          await updateCategory(category.id, { isActive: !category.isActive });
      } catch (error) {
          console.error('Failed to toggle status', error);
          fetchData();
      }
  };

  const filteredCategories = categories.filter(c => filter === 'ALL' || c.kind === filter);
  
  // Group by kind for display if filter is ALL, or just list
  const expenseCategories = filteredCategories.filter(c => c.kind === 'EXPENSE');
  const incomeCategories = filteredCategories.filter(c => c.kind === 'INCOME');

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans pb-24">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Tag className="h-8 w-8 text-pink-500" />
                Category Settings
            </h1>
            <p className="text-gray-400">Manage your expense and income categories.</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 transition-all font-bold shadow-lg shadow-pink-500/25"
          >
            <Plus className="h-5 w-5" />
            Add New
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {['ALL', 'EXPENSE', 'INCOME'].map(f => (
                <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f ? 'bg-white text-gray-900 shadow-md' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                    {f === 'ALL' ? 'All Categories' : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
            ))}
        </div>

        {loading ? (
           <div className="flex flex-col items-center justify-center py-24 space-y-4">
               <RefreshCw className="h-8 w-8 animate-spin text-gray-600" />
               <p className="text-gray-500">Loading your categories...</p>
           </div>
        ) : (
          <div className="space-y-8">
              {/* Expense Section */}
              {(filter === 'ALL' || filter === 'EXPENSE') && expenseCategories.length > 0 && (
                  <section>
                      <h3 className="text-lg font-bold text-gray-400 mb-4 flex items-center gap-2">
                          <ArrowDownCircle className="h-5 w-5 text-red-400" /> Expenses
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {expenseCategories.map(cat => (
                              <CategoryCard 
                                key={cat.id} 
                                category={cat} 
                                onEdit={() => handleEdit(cat)} 
                                onToggle={() => toggleStatus(cat)}
                              />
                          ))}
                      </div>
                  </section>
              )}

              {/* Income Section */}
              {(filter === 'ALL' || filter === 'INCOME') && incomeCategories.length > 0 && (
                  <section>
                      <h3 className="text-lg font-bold text-gray-400 mb-4 flex items-center gap-2">
                          <ArrowUpCircle className="h-5 w-5 text-green-400" /> Income
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {incomeCategories.map(cat => (
                              <CategoryCard 
                                key={cat.id} 
                                category={cat} 
                                onEdit={() => handleEdit(cat)} 
                                onToggle={() => toggleStatus(cat)}
                              />
                          ))}
                      </div>
                  </section>
              )}

              {filteredCategories.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                      No categories found. Start by adding one!
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

function CategoryCard({ category, onEdit, onToggle }: { category: Category, onEdit: () => void, onToggle: () => void }) {
    return (
        <div className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all ${category.isActive ? 'bg-gray-800 border-gray-700/50 hover:border-gray-600 shadow-sm' : 'bg-gray-800/50 border-gray-800 opacity-60'}`}>
            <div className="flex items-center gap-4">
                <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-inner"
                    style={{ backgroundColor: category.isActive ? category.color : '#374151' }}
                >
                    <Tag className="h-5 w-5 fill-white/20" />
                </div>
                <div>
                    <div className="font-bold text-white text-base flex items-center gap-2">
                        {category.name}
                        {!category.isActive && <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded uppercase tracking-wide">Disabled</span>}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={onEdit} 
                    className="p-2 rounded-lg bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                >
                    <Edit2 className="h-4 w-4" />
                </button>
                <button 
                    onClick={onToggle}
                    title={category.isActive ? "Disable Category" : "Enable Category"}
                    className={`p-2 rounded-lg transition-colors ${category.isActive ? 'bg-gray-700/50 text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}
                >
                    {category.isActive ? <EyeOff className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}
