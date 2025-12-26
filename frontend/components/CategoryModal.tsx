'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCategories } from '../hooks/useOfflineData';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

export default function CategoryModal({ isOpen, onClose, onSubmit, initialData }: CategoryModalProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState('EXPENSE');
  const [color, setColor] = useState('#808080');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { addCategory } = useCategories();

  useEffect(() => {
    if (isOpen) {
        setError('');
        if (initialData) {
            setName(initialData.name);
            setKind(initialData.kind);
            setColor(initialData.color);
        } else {
            setName('');
            setKind('EXPENSE');
            setColor('#808080'); // Default Gray
        }
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (onSubmit) {
         await onSubmit({ name, kind, color });
      } else {
         await addCategory({ name, kind, color });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#64748B', '#808080'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-gold)]">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Category' : 'Add Category'}
          </h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="flex gap-2 p-1 bg-[var(--color-wine-deep)]/50 rounded-xl border border-[var(--color-border-gold)] mb-4">
                {['EXPENSE', 'INCOME'].map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setKind(t)}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                            kind === t 
                            ? (t === 'INCOME' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')
                            : 'text-[var(--color-text-muted)] hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text-muted)]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-4 py-2 bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl text-white placeholder-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]"
              placeholder="e.g. Groceries"
              required
            />
          </div>

          <div className="space-y-2">
             <label className="text-sm font-medium text-[var(--color-text-muted)]">Color</label>
             <div className="flex flex-wrap gap-2">
                {colors.map(c => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                        title={c}
                    />
                ))}
                <input 
                    type="color" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                    title="Custom Color"
                />
             </div>
          </div>

          <div className="flex justify-end pt-4 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-bold text-black bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 disabled:opacity-50 transition-all ml-auto shadow-lg shadow-[var(--color-gold-500)]/20"
            >
              {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Save Category')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
