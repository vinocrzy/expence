import { useState, useEffect } from 'react';
import { X, Save, Tag } from 'lucide-react';
import { Transaction, Category } from '../lib/db-types';
import { transactionService } from '../lib/localdb-services';

interface QuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  accounts: any[]; // For currency display if needed
  categories: Category[];
  onSuccess: () => void;
  onEditFully?: (transaction: Transaction) => void;
}

export default function QuickEditModal({
  isOpen,
  onClose,
  transaction,
  categories,
  onSuccess,
  onEditFully
}: QuickEditModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction && isOpen) {
        setCategoryId(transaction.categoryId || '');
        setSubCategoryId(transaction.subCategoryId || '');
        setDescription(transaction.description || '');
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          await transactionService.update(transaction.id, {
              categoryId,
              subCategoryId: subCategoryId || undefined, // undefined to remove if empty
              description
          });
          onSuccess();
          onClose();
      } catch (err) {
          console.error(err);
          alert('Failed to update transaction');
      } finally {
          setLoading(false);
      }
  };

  const filteredCategories = categories.filter(c => c.type === transaction.type);
  const activeSubCategories = categoryId 
    ? categories.find(c => c.id === categoryId)?.subCategories || []
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-400" />
            Quick Edit
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
            
            {/* Description */}
            <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase">Description</label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="Transaction description"
                />
            </div>

            {/* Category */}
            <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase">Category</label>
                <select
                    value={categoryId}
                    onChange={(e) => { setCategoryId(e.target.value); setSubCategoryId(''); }}
                    className="block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                    <option value="">Uncategorized</option>
                    {filteredCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Sub-Category */}
            {activeSubCategories.length > 0 && (
                <div className="space-y-1 animate-in slide-in-from-top-2 fade-in">
                    <label className="text-xs font-medium text-gray-400 uppercase">Sub-Category</label>
                    <select
                        value={subCategoryId}
                        onChange={(e) => setSubCategoryId(e.target.value)}
                        className="block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                        <option value="">None</option>
                        {activeSubCategories.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            )}

        <div className="pt-2 flex flex-col gap-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-purple-900/20"
                >
                    {loading ? 'Saving...' : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Changes
                        </>
                    )}
                </button>
                
                {onEditFully && (
                    <button
                        type="button"
                        onClick={() => onEditFully(transaction)}
                        className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Edit full details (Split, Date, Account)
                    </button>
                )}
            </div>
        </form>
      </div>
    </div>
  );
}
