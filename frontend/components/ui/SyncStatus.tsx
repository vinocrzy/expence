'use client';

import React, { useEffect, useState } from 'react';
import { syncEngine, SyncStatus } from '@/lib/sync';
import { Cloud, RefreshCw, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const SyncStatusIndicator = () => {
    const [status, setStatus] = useState<SyncStatus>('COMPLETED');
    const [showCompleted, setShowCompleted] = useState(false);

    useEffect(() => {
        // Subscribe to sync status changes
        const unsubscribe = syncEngine.subscribe((s) => {
            if (s === 'COMPLETED') {
                setShowCompleted(true);
                setTimeout(() => setShowCompleted(false), 3000);
            }
            setStatus(s);
        });
        return unsubscribe;
    }, []);

    const handleSync = () => {
        if (status !== 'SYNCING') {
            syncEngine.syncNow();
        }
    };

    // If completed and timeout passed, hide.
    if (status === 'COMPLETED' && !showCompleted) return null;

    const config = {
        'SAVED_LOCALLY': { icon: Cloud, text: 'Saved to device', color: 'bg-zinc-100/90 backdrop-blur-sm text-zinc-600 border-zinc-200' },
        'SYNCING': { icon: RefreshCw, text: 'Syncing...', color: 'bg-blue-50/90 backdrop-blur-sm text-blue-600 border-blue-100', animate: true },
        'ERROR': { icon: AlertTriangle, text: 'Server unavailable (Data safe)', color: 'bg-amber-50/90 backdrop-blur-sm text-amber-600 border-amber-200' },
        'OFFLINE': { icon: WifiOff, text: 'Offline Mode', color: 'bg-zinc-100/90 backdrop-blur-sm text-zinc-500 border-zinc-200' },
        'COMPLETED': { icon: CheckCircle, text: 'Synced', color: 'bg-green-50/90 backdrop-blur-sm text-green-600 border-green-100' }
    }[status];

    if (!config) return null;

    const Icon = config.icon;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-6 right-6 z-50 pointer-events-auto"
            >
                <button 
                    onClick={handleSync}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-lg text-sm font-medium transition-colors ${config.color}`}
                >
                    <Icon className={`w-4 h-4 ${config.animate ? 'animate-spin' : ''}`} />
                    <span>{config.text}</span>
                </button>
            </motion.div>
        </AnimatePresence>
    );
};

export default SyncStatusIndicator;
