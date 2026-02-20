'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              layout
              className={`pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-xl backdrop-blur-xl border border-white/10 ${
                toast.type === 'success' ? 'bg-gray-900/90 text-green-400' :
                toast.type === 'error' ? 'bg-gray-900/90 text-red-400' :
                toast.type === 'warning' ? 'bg-gray-900/90 text-yellow-400' :
                'bg-gray-900/90 text-blue-400'
              }`}
            >
              <div className={`p-2 rounded-full ${
                  toast.type === 'success' ? 'bg-green-500/10' :
                  toast.type === 'error' ? 'bg-red-500/10' :
                  toast.type === 'warning' ? 'bg-yellow-500/10' :
                  'bg-blue-500/10'
              }`}>
                  {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                  {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                  {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                  {toast.type === 'info' && <Info className="w-5 h-5" />}
              </div>
              <p className="text-sm font-medium text-white flex-1">{toast.message}</p>
              <button onClick={() => removeToast(toast.id)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
