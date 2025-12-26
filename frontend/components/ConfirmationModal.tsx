import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${isDangerous ? 'bg-red-500/10 text-red-500' : 'bg-[var(--color-gold-500)]/10 text-[var(--color-gold-500)]'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-[var(--color-wine-deep)]/50 border-t border-[var(--color-border-gold)]/30 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg ${
              isDangerous 
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20 text-white' 
                : 'bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] text-black hover:brightness-110 shadow-[var(--color-gold-500)]/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
        
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-white"
        >
            <X className="h-4 w-4" />
        </button>

      </motion.div>
    </div>
  );
}
