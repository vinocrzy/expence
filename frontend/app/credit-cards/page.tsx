'use client';

import { useState } from 'react';
import Navbar from '../../components/Navbar';
import NativeHeader from '../../components/dashboard/NativeHeader';
import CreditCardModal from '../../components/CreditCardModal';
import { useCreditCards } from '../../hooks/useLocalData';
import { creditCardService } from '../../lib/localdb-services';
import { Plus, CreditCard, Calendar, AlertTriangle, Wifi, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function CreditCardsPage() {
  const { creditCards: cards, loading, refresh } = useCreditCards();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreate = async (data: any) => {
      await creditCardService.create(data);
      await refresh();
  };

  // Modern Dark Gradients for Credit Cards
  const getCardGradient = (index: number) => {
      const gradients = [
          'from-[#1a1a1a] to-[#0a0a0a] border-gray-800', // Black Card
          'from-[#2c3e50] to-[#000000] border-blue-900/30', // Midnight Blue
          'from-[#4b1d1d] to-[#1a0505] border-red-900/30', // Deep Red
          'from-[#1e3a8a] to-[#172554] border-blue-800/30', // Royal Blue
      ];
      return gradients[index % gradients.length];
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 md:pt-8 pb-8">        <NativeHeader title="Credit Cards" />
        <div className="flex justify-between items-center mb-6">
          <div className="hidden md:block">
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                Credit Cards
              </h1>
              <p className="text-gray-400 text-sm mt-1">Manage limits and payments</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all font-bold shadow-lg shadow-purple-500/10 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Add Card</span>
          </button>
        </div>

        {loading ? (
             <div className="flex flex-col gap-4">
                {[1, 2].map(i => <div key={i} className="h-56 bg-gray-900 rounded-3xl animate-pulse" />)}
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card, index) => {
                    const limit = Number(card.creditLimit);
                    const outstanding = Number(card.currentOutstanding || 0);
                    const utilization = limit > 0 ? (outstanding / limit) * 100 : 0;
                    const available = limit - outstanding;

                    return (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Link href={`/credit-cards/${card.id}`} className="block relative group h-full">
                                <div className={clsx(
                                    "relative h-64 rounded-3xl p-6 flex flex-col justify-between shadow-2xl overflow-hidden transition-transform hover:scale-[1.02] border",
                                    "bg-gradient-to-br",
                                    getCardGradient(index)
                                )}>
                                    {/* Noise Texture / Pattern */}
                                    <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
                                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-3xl" />

                                    {/* Top Row: Bank & Chip */}
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div>
                                            {/* Chip */}
                                            <div className="w-11 h-8 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-md shadow-inner flex items-center justify-center mb-4 opacity-90">
                                                <div className="w-8 h-[1px] bg-black/20 rounded-full" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white tracking-wider uppercase opacity-90">{card.bankName}</h3>
                                        </div>
                                        <Wifi className="w-8 h-8 text-white/20 rotate-90" />
                                    </div>

                                    {/* Middle: Number & Utilization */}
                                    <div className="relative z-10">
                                        <div className="text-xl font-mono text-white/80 tracking-widest mb-4 flex gap-3">
                                            <span>****</span>
                                            <span>****</span>
                                            <span>****</span>
                                            <span className="text-white">{card.lastFourDigits || 'CARD'}</span>
                                        </div>

                                        {/* Liquid Progress Bar for Utilization */}
                                        <div className="mt-2">
                                            <div className="flex justify-between text-xs text-white/60 mb-1 font-medium">
                                                <span>Limit Used</span>
                                                <span className={utilization > 70 ? 'text-red-300' : 'text-white'}>{Math.round(utilization)}%</span>
                                            </div>
                                            <div className="h-2.5 bg-black/30 rounded-full overflow-hidden backdrop-blur-sm border border-white/5 relative">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(utilization, 100)}%` }}
                                                    className={clsx(
                                                        "h-full rounded-full relative",
                                                        utilization > 80 ? "bg-gradient-to-r from-red-600 to-red-500" : "bg-gradient-to-r from-blue-400 to-cyan-400"
                                                    )}
                                                >
                                                    <div className="absolute inset-0 bg-white/20" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)' }} />
                                                </motion.div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom: Outstanding & Due Date */}
                                    <div className="relative z-10 flex justify-between items-end mt-4 pt-4 border-t border-white/10">
                                        <div>
                                            <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Outstanding</div>
                                            <div className="text-2xl font-mono text-white tracking-tight">₹{outstanding.toLocaleString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 text-[10px] text-white/50 uppercase font-bold justify-end">
                                                <Calendar className="w-3 h-3" /> Due Date
                                            </div>
                                            <div className="text-sm font-medium text-white/90">
                                                {card.paymentDueDay}th of month
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
                
                {cards.length === 0 && (
                     <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-800 rounded-3xl text-gray-500">
                        <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCard className="h-8 w-8 text-gray-600" />
                        </div>
                        <p>No credit cards linked yet.</p>
                        <button onClick={() => setIsModalOpen(true)} className="mt-4 text-purple-400 font-bold hover:underline">
                            Link a Credit Card
                        </button>
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
