'use client';

import { 
    X, ArrowUpRight, ArrowDownLeft, RefreshCw, CreditCard, Landmark, Send 
} from 'lucide-react';
import TransactionModal from './TransactionModal';
import { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: any[];
}

function QuickActionSheet({ isOpen, onClose, accounts }: QuickActionSheetProps) {
  const router = useRouter();
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState('EXPENSE');

  // Stabilize the onClose handler for TransactionModal to prevent re-renders
  const handleTransactionModalClose = useCallback(() => {
      setTransactionModalOpen(false);
      onClose(); // Triggers parent close as well, assuming that's desired behavior from the inline code
  }, [onClose]);

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
    <>
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />
                    
                    {/* Sheet */}
                    <motion.div 
                        key="sheet"
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
                        className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950 border-t border-white/10 rounded-t-[2.5rem] shadow-2xl p-6 pb-safe pt-2"
                    >
                        {/* Handle */}
                        <div className="w-full flex justify-center pt-2 pb-6">
                            <div className="w-12 h-1.5 bg-gray-700/50 rounded-full" />
                        </div>
                        
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
        </AnimatePresence>

        {transactionModalOpen && (
             <TransactionModal
                isOpen={transactionModalOpen}
                onClose={handleTransactionModalClose} 
                accounts={accounts}
                onSuccess={() => {}} 
                initialType={transactionType}
             />
        )}
    </>
  );
}

function ActionButton({ icon: Icon, label, color, onClick }: any) {
    const colorClasses: any = {
        red: "bg-red-500/15 text-red-500 group-hover:bg-red-500 group-hover:text-white",
        green: "bg-green-500/15 text-green-500 group-hover:bg-green-500 group-hover:text-white",
        blue: "bg-blue-500/15 text-blue-500 group-hover:bg-blue-500 group-hover:text-white",
        orange: "bg-orange-500/15 text-orange-500 group-hover:bg-orange-500 group-hover:text-white",
        purple: "bg-purple-500/15 text-purple-500 group-hover:bg-purple-500 group-hover:text-white",
    };

    return (
        <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                onClick();
            }} 
            className="flex flex-col items-center gap-3 group w-full"
        >
            <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${colorClasses[color]}`}>
                <Icon className="h-7 w-7" />
            </div>
            <span className="text-xs font-semibold text-gray-400 group-hover:text-white transition-colors">{label}</span>
        </motion.button>
    );
}

export default QuickActionSheet;
