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
    <div className="min-h-screen theme-wine text-white font-sans selection:bg-[var(--color-gold-500)] selection:text-black pb-20">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
             <CreditCard className="h-8 w-8 text-[var(--color-gold-500)]" />
            Credit Cards
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-black bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 transition-all font-bold shadow-lg shadow-[var(--color-gold-500)]/20"
          >
            <Plus className="h-5 w-5" />
            Add Card
          </button>
        </div>

        {loading ? (
             <div className="text-center text-[var(--color-text-muted)] py-12">Loading credit cards...</div>
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
                            <div className="bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] rounded-2xl p-6 hover:border-[var(--color-gold-500)]/50 transition-all shadow-xl hover:shadow-[var(--color-gold-500)]/10 h-full flex flex-col justify-between backdrop-blur-sm">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white group-hover:text-[var(--color-gold-500)] transition-colors uppercase tracking-wide">
                                                {card.issuer}
                                            </h3>
                                            <div className="text-sm text-[var(--color-text-muted)]">{acc.name}</div>
                                        </div>
                                        <div className="bg-[var(--color-wine-deep)] p-2 rounded-lg">
                                            <CreditCard className="h-6 w-6 text-[var(--color-gold-500)]" />
                                        </div>
                                    </div>
                                    
                                    <div className="mb-6">
                                        <div className="flex justify-between text-sm text-[var(--color-text-muted)] mb-1">
                                            <span>Utilization</span>
                                            <span className={utilization > 70 ? 'text-red-400' : 'text-[var(--color-text-muted)]'}>{Math.round(utilization)}%</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className={`h-full ${getUtilizationColor(utilization)} transition-all duration-500`} style={{ width: `${Math.min(utilization, 100)}%` }}></div>
                                        </div>
                                        <div className="flex justify-between mt-2">
                                            <div>
                                                <div className="text-xs text-[var(--color-text-muted)]">Outstanding</div>
                                                <div className="text-xl font-bold text-white">₹ {outstanding.toLocaleString()}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-[var(--color-text-muted)]">Available</div>
                                                <div className="text-xl font-bold text-green-400">₹ {available.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-[var(--color-border-gold)]/30 pt-4 mt-auto">
                                    <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm">
                                        <Calendar className="h-4 w-4 text-[var(--color-gold-500)]" />
                                        <span>Bill Day: {card.billingCycleStartDay}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm justify-end">
                                        <AlertTriangle className="h-4 w-4 text-[var(--color-gold-500)]" />
                                        <span>Due +{card.dueDays}d</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
                
                {cards.length === 0 && (
                    <div className="col-span-full text-center py-12 border-2 border-dashed border-[var(--color-border-gold)]/50 rounded-3xl text-[var(--color-text-muted)] bg-[var(--color-wine-surface)]/30">
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
