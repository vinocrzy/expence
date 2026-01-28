'use client';

import React, { useState } from 'react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { Cloud, RefreshCw, AlertTriangle, CheckCircle, WifiOff, Settings2, Play, Pause } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const SyncStatusIndicator = () => {
    const { isOnline, isSyncing, error, isConnected, manualSync } = useSyncStatus();
    const [isOpen, setIsOpen] = useState(false);
    const [isAutoSync, setIsAutoSync] = useState(true); // Mock state for now

    // Determine status
    let status = 'COMPLETED';
    if (!isOnline) status = 'OFFLINE';
    else if (error) status = 'ERROR';
    else if (isSyncing) status = 'SYNCING';
    else if (isConnected) status = 'COMPLETED';

    const config = {
        'SYNCING': { icon: RefreshCw, text: 'Syncing...', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', animate: true },
        'ERROR': { icon: AlertTriangle, text: 'Sync Error', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
        'OFFLINE': { icon: WifiOff, text: 'Offline', color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20' },
        'COMPLETED': { icon: CheckCircle, text: 'Synced', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' }
    }[status] || { icon: Cloud, text: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-500/10' };

    const Icon = config.icon;

    return (
        <>
            <AnimatePresence>
                <motion.div 
                    layout
                    className={`fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2`}
                >
                    {isOpen && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-2xl w-64 mb-2"
                        >
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                <Cloud className="w-4 h-4 text-purple-500" /> Sync Settings
                            </h3>
                            
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm text-gray-300">
                                    <span>Status</span>
                                    <span className={`font-medium ${config.color}`}>{config.text}</span>
                                </div>
                                
                                <div className="h-px bg-gray-800" />

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-300">Auto-Sync</span>
                                    <button 
                                        onClick={() => setIsAutoSync(!isAutoSync)}
                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${isAutoSync ? 'bg-green-500' : 'bg-gray-700'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isAutoSync ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <button 
                                    onClick={manualSync}
                                    disabled={!isOnline || isSyncing}
                                    className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                    Sync Now
                                </button>
                            </div>
                        </motion.div>
                    )}

                    <motion.button 
                        onClick={() => setIsOpen(!isOpen)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${config.bg} ${config.color}`}
                    >
                        <Icon className={`w-4 h-4 ${config.animate ? 'animate-spin' : ''}`} />
                        <span className="text-sm font-bold">{config.text}</span>
                        <Settings2 className="w-3 h-3 ml-1 opacity-50" />
                    </motion.button>
                </motion.div>
            </AnimatePresence>
        </>
    );
};

export default SyncStatusIndicator;
