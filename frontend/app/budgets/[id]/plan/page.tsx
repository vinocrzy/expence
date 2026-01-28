'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import { ArrowLeft, Trash2, Plus, CheckCircle2, AlertTriangle, Calculator, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { budgetService } from '../../../../lib/localdb-services';

export default function BudgetPlannerPage() {
  const { id } = useParams();
  const router = useRouter();
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // New Item Form State
  const [items, setItems] = useState<any[]>([]);
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (id) fetchBudget();
  }, [id]);

  const fetchBudget = async () => {
    try {
      const b = await budgetService.getById(id as string);
      if (b) {
          setBudget(b);
          setItems((b as any).planItems || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
      e.preventDefault();
      setAdding(true);
      try {
          const newItem = await budgetService.addPlanItem(id as string, {
              name: itemName,
              totalAmount: parseFloat(itemAmount) * itemQty, // simplified
              unitAmount: parseFloat(itemAmount),
              quantity: itemQty
          });
          setItems([...items, newItem]);
          setItemName('');
          setItemAmount('');
          setItemQty(1);
      } catch(e) {
          console.error(e);
      } finally {
          setAdding(false);
      }
  };

  const handleRemoveItem = async (itemId: string) => {
      try {
          setItems(items.filter(i => i.id !== itemId)); 
          await budgetService.removePlanItem(id as string, itemId);
      } catch(e) {
          console.error(e);
          fetchBudget();
      }
  };

  const handleActivate = async () => {
     if (!confirm('Are you sure? This will lock the plan and create an active budget.')) return;
      try {
          await budgetService.activate(id as string);
          router.push('/budgets');
      } catch (e) {
          console.error(e);
          alert('Failed to activate budget');
      }
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading planner...</div>;
  if (!budget) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Budget not found</div>;

  const totalPlanned = items.reduce((sum, item) => sum + Number(item.totalAmount), 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans pb-24">
      <Navbar />
      
      <main className="max-w-2xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex-1">
                <h1 className="text-2xl font-bold">{budget.name}</h1>
                <div className="flex items-center gap-2 text-sm text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded-md w-fit mt-1">
                    <Calculator className="h-3 w-3" /> Planner Mode
                </div>
            </div>
        </div>

        {/* Total Card */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700/50 mb-8 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
             <div className="relative z-10">
                 <div className="text-gray-400 text-sm mb-1">Total Estimated Cost</div>
                 <div className="text-4xl font-bold font-mono">₹{totalPlanned.toLocaleString()}</div>
                 <div className="mt-4 flex gap-2">
                     <div className="bg-gray-700/50 px-3 py-1 rounded-lg text-xs text-gray-400 flex items-center gap-2">
                         <ShoppingBag className="h-3 w-3" /> {items.length} Items
                     </div>
                 </div>
             </div>
        </div>

        {/* Input Form */}
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-8">
            <h3 className="font-bold text-gray-300 mb-3 text-sm uppercase tracking-wide">Add Estimate</h3>
            <form onSubmit={handleAddItem} className="space-y-3">
                <div>
                    <input 
                        value={itemName} 
                        onChange={e => setItemName(e.target.value)} 
                        placeholder="Item Name (e.g. Flight Tickets)" 
                        className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-600"
                        required 
                    />
                </div>
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <span className="absolute left-3 top-3 text-gray-500">₹</span>
                        <input 
                            type="number"
                            value={itemAmount} 
                            onChange={e => setItemAmount(e.target.value)} 
                            placeholder="Unit Cost" 
                            className="w-full bg-gray-900 border border-gray-700 p-3 pl-7 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-600"
                            required 
                        />
                    </div>
                    <div className="w-24">
                        <input 
                            type="number"
                            value={itemQty} 
                            onChange={e => setItemQty(Number(e.target.value))} 
                            placeholder="Qty" 
                            min="1"
                            className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center"
                            required 
                        />
                    </div>
                </div>
                <button 
                    type="submit" 
                    disabled={adding}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                    {adding ? 'Adding...' : <><Plus className="h-5 w-5" /> Add Item</>}
                </button>
            </form>
        </div>

        {/* Plan List */}
        <div className="space-y-3 mb-24">
            <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wide px-1">Planned Expenses</h3>
            {items.length === 0 ? (
                <div className="text-center py-12 opacity-50 border border-dashed border-gray-700 rounded-xl">
                    No items added yet.
                </div>
            ) : (
                <AnimatePresence mode='popLayout'>
                    {items.map((item) => (
                        <motion.div 
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-gray-800 p-4 rounded-xl border border-gray-700/50 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 font-bold block text-sm">
                                    x{item.quantity}
                                </div>
                                <div>
                                    <div className="font-bold">{item.name}</div>
                                    <div className="text-xs text-gray-400">₹{Number(item.unitAmount).toLocaleString()} each</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="font-mono font-bold text-blue-300">₹{Number(item.totalAmount).toLocaleString()}</div>
                                <button 
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="p-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            )}
        </div>

      </main>

      {/* Footer Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/80 backdrop-blur-lg border-t border-gray-800">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <div className="text-xs text-gray-500 max-w-[200px]">
                    <AlertTriangle className="h-3 w-3 inline mr-1 text-yellow-500" />
                    Activation will lock this plan and create a trackable budget.
                </div>
                <button 
                    onClick={handleActivate}
                    disabled={items.length === 0}
                    className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-900/20 disabled:opacity-50 disabled:grayscale"
                >
                    Activate Plan <CheckCircle2 className="h-5 w-5" />
                </button>
            </div>
      </div>

    </div>
  );
}
