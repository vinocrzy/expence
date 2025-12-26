'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import CreditCardModal from '../../components/CreditCardModal';
import api from '../../lib/api';
import { Plus, CreditCard, Calendar, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function CreditCardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await api.get('/credit-cards');
      setCards(res.data); // Expecting list of Accounts with embedded CreditCard info
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
      await api.post('/credit-cards', data);
      fetchCards();
  };
  
  // Calculate utilization color
  const getUtilizationColor = (percent: number) => {
      if (percent < 30) return 'bg-green-500';
      if (percent < 70) return 'bg-yellow-500';
      return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white pb-20">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 flex items-center gap-3">
             <CreditCard className="h-8 w-8 text-blue-400" />
            Credit Cards
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-purple-600 hover:bg-purple-500 transition-all font-bold shadow-lg shadow-purple-500/25"
          >
            <Plus className="h-5 w-5" />
            Add Card
          </button>
        </div>

        {loading ? (
             <div className="text-center text-gray-500 py-12">Loading credit cards...</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map(acc => {
                    const card = acc.creditCard;
                    if (!card) return null;
                    
                    const limit = Number(card.creditLimit);
                    const outstanding = Number(card.outstandingAmount || 0);
                    // Use Account Balance if outstanding not set?
                    // Safe fallbacks.
                    
                    const utilization = limit > 0 ? (outstanding / limit) * 100 : 0;
                    const available = limit - outstanding;

                    return (
                        <Link href={`/credit-cards/${card.accountId}`} key={acc.id} className="block group">
                            <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-all shadow-lg hover:shadow-purple-500/10 h-full flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors uppercase tracking-wide">
                                                {card.issuer}
                                            </h3>
                                            <div className="text-sm text-gray-400">{acc.name}</div>
                                        </div>
                                        <div className="bg-gray-700/50 p-2 rounded-lg">
                                            <CreditCard className="h-6 w-6 text-gray-400" />
                                        </div>
                                    </div>
                                    
                                    <div className="mb-6">
                                        <div className="flex justify-between text-sm text-gray-400 mb-1">
                                            <span>Utilization</span>
                                            <span className={utilization > 70 ? 'text-red-400' : 'text-gray-400'}>{Math.round(utilization)}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div className={`h-full ${getUtilizationColor(utilization)} transition-all duration-500`} style={{ width: `${Math.min(utilization, 100)}%` }}></div>
                                        </div>
                                        <div className="flex justify-between mt-2">
                                            <div>
                                                <div className="text-xs text-gray-500">Outstanding</div>
                                                <div className="text-xl font-bold text-white">₹ {outstanding.toLocaleString()}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-500">Available</div>
                                                <div className="text-xl font-bold text-green-400">₹ {available.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-gray-700/50 pt-4 mt-auto">
                                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                                        <Calendar className="h-4 w-4" />
                                        <span>Bill Day: {card.billingCycleStartDay}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400 text-sm justify-end">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>Due +{card.dueDays}d</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
                
                {cards.length === 0 && (
                    <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-700 rounded-3xl text-gray-500">
                        No credit cards found. Click "Add Card" to get started.
                    </div>
                )}
            </div>
        )}

        <CreditCardModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreate}
        />
      </main>
    </div>
  );
}
