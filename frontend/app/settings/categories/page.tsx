'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import CategoryModal from '../../../components/CategoryModal';
import api from '../../../lib/api';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    } finally {
      setLoading(false);
    }
  };

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
        // Optimistic update
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...data } : c));
        
        await api.put(`/categories/${editingCategory.id}`, data);
      } else {
        const res = await api.post('/categories', data);
        setCategories(prev => [...prev, res.data]);
      }
      fetchData(); // Refresh to ensure sync
    } catch (error) {
       console.error(error);
       fetchData(); // Revert on error
    }
  };

  const toggleStatus = async (category: Category) => {
      // Toggle logic
      const newStatus = !category.isActive;
      // Optimistic
      setCategories(prev => prev.map(c => c.id === category.id ? { ...c, isActive: newStatus } : c));
      
      try {
          await api.put(`/categories/${category.id}`, { isActive: newStatus });
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
    <div className="min-h-screen text-white font-sans pb-24">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Tag className="h-8 w-8 text-[var(--color-gold-500)]" />
                Category Settings
            </h1>
            <p className="text-[var(--color-text-muted)]">Manage your expense and income categories.</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-black bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 transition-all font-bold shadow-lg shadow-[var(--color-gold-500)]/20"
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
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f ? 'bg-[var(--color-gold-500)] text-black shadow-md' : 'bg-[var(--color-wine-deep)] text-[var(--color-text-muted)] hover:bg-white/10'}`}
                >
                    {f === 'ALL' ? 'All Categories' : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
            ))}
        </div>

        {loading ? (
           <div className="flex flex-col items-center justify-center py-24 space-y-4">
               <RefreshCw className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
               <p className="text-[var(--color-text-muted)]">Loading your categories...</p>
           </div>
        ) : (
          <div className="space-y-8">
              {/* Expense Section */}
              {(filter === 'ALL' || filter === 'EXPENSE') && expenseCategories.length > 0 && (
                  <section>
                      <h3 className="text-lg font-bold text-[var(--color-text-muted)] mb-4 flex items-center gap-2">
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
                      <h3 className="text-lg font-bold text-[var(--color-text-muted)] mb-4 flex items-center gap-2">
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
                  <div className="text-center py-12 text-[var(--color-text-muted)]">
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
        <div className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all ${category.isActive ? 'bg-[var(--color-wine-surface)] border-[var(--color-border-gold)] hover:border-[var(--color-gold-500)]/50 shadow-sm backdrop-blur-sm' : 'bg-[var(--color-wine-deep)] border-white/5 opacity-60'}`}>
            <div className="flex items-center gap-4">
                <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-inner"
                    style={{ backgroundColor: category.isActive ? category.color : 'rgba(255,255,255,0.1)' }}
                >
                    <Tag className="h-5 w-5 fill-white/20" />
                </div>
                <div>
                    <div className="font-bold text-white text-base flex items-center gap-2">
                        {category.name}
                        {!category.isActive && <span className="text-[10px] bg-white/10 text-[var(--color-text-muted)] px-1.5 py-0.5 rounded uppercase tracking-wide">Disabled</span>}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={onEdit} 
                    className="p-2 rounded-lg bg-white/5 text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors"
                >
                    <Edit2 className="h-4 w-4" />
                </button>
                <button 
                    onClick={onToggle}
                    title={category.isActive ? "Disable Category" : "Enable Category"}
                    className={`p-2 rounded-lg transition-colors ${category.isActive ? 'bg-white/5 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}
                >
                    {category.isActive ? <EyeOff className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}
