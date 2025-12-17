'use client';

import { 
    X, ArrowUpRight, ArrowDownLeft, RefreshCw, CreditCard, Landmark, Send 
} from 'lucide-react';
import TransactionModal from './TransactionModal';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: any[];
}

export default function QuickActionSheet({ isOpen, onClose, accounts }: QuickActionSheetProps) {
  const router = useRouter();
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState('EXPENSE');

  const handleAction = (type: string) => {
      switch(type) {
          case 'EXPENSE':
          case 'INCOME':
              setTransactionType(type);
              setTransactionModalOpen(true);
              break;
          case 'LOAN':
              router.push('/loans');
              onClose();
              break;
          case 'CREDIT_CARD':
              router.push('/credit-cards');
              onClose();
              break;
           case 'TRANSFER':
               alert('Transfer feature coming soon');
               onClose();
               break;
      }
  };

  return (
    <AnimatePresence>
        {isOpen && (
            <>
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                />
                
                {/* Sheet */}
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    drag="y"
                    dragConstraints={{ top: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => {
                        if (info.offset.y > 100) onClose();
                    }}
                    className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 rounded-t-3xl shadow-2xl p-6 pb-safe"
                >
                    <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing"></div>
                    
                    <h3 className="text-lg font-bold text-white mb-6 text-center">Quick Actions</h3>
                    
                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <ActionButton 
                            icon={ArrowUpRight} 
                            label="Expense" 
                            color="red" 
                            onClick={() => handleAction('EXPENSE')} 
                        />
                         <ActionButton 
                            icon={ArrowDownLeft} 
                            label="Income" 
                            color="green" 
                            onClick={() => handleAction('INCOME')} 
                        />
                         <ActionButton 
                            icon={Send} 
                            label="Transfer" 
                            color="blue" 
                            onClick={() => handleAction('TRANSFER')} 
                        />
                         <ActionButton 
                            icon={Landmark} 
                            label="Pay EMI" 
                            color="orange" 
                            onClick={() => handleAction('LOAN')} 
                        />
                         <ActionButton 
                            icon={CreditCard} 
                            label="Pay Card" 
                            color="purple" 
                            onClick={() => handleAction('CREDIT_CARD')} 
                        />
                    </div>
                    
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={onClose} 
                        className="w-full py-4 mt-2 text-sm font-bold text-gray-400 hover:text-white border-t border-gray-800"
                    >
                        Cancel
                    </motion.button>
                </motion.div>
            </>
        )}

        {transactionModalOpen && (
             <TransactionModal
                isOpen={transactionModalOpen}
                onClose={() => { setTransactionModalOpen(false); onClose(); }} 
                accounts={accounts}
                onSuccess={() => {}} 
                initialType={transactionType}
             />
        )}
    </AnimatePresence>
  );
}

function ActionButton({ icon: Icon, label, color, onClick }: any) {
    const colorClasses: any = {
        red: "bg-red-500/10 text-red-500 border-red-500/20 group-hover:bg-red-500",
        green: "bg-green-500/10 text-green-500 border-green-500/20 group-hover:bg-green-500",
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20 group-hover:bg-blue-500",
        orange: "bg-orange-500/10 text-orange-500 border-orange-500/20 group-hover:bg-orange-500",
        purple: "bg-purple-500/10 text-purple-500 border-purple-500/20 group-hover:bg-purple-500",
    };

    return (
        <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick} 
            className="flex flex-col items-center gap-2 group"
        >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border group-hover:text-white transition-all ${colorClasses[color]}`}>
                <Icon className="h-6 w-6" />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">{label}</span>
        </motion.button>
    );
}
