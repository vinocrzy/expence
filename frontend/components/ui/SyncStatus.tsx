'use client';

import React, { useState } from 'react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { Cloud, RefreshCw, AlertTriangle, CheckCircle, WifiOff, Settings2, Play, Pause } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const SyncStatusIndicator = () => {
    const { isOnline, isSyncing, error, isConnected, manualSync } = useSyncStatus();
    const [isOpen, setIsOpen] = useState(false);
    const [isAutoSync, setIsAutoSync] = useState(true);

    // Determine status
    let status = 'COMPLETED';
    if (!isOnline) status = 'OFFLINE';
    else if (error) status = 'ERROR';
    else if (isSyncing) status = 'SYNCING';
    else if (isConnected) status = 'COMPLETED';

    const config = {
        'SYNCING': { icon: RefreshCw, text: 'Syncing...', color: 'text-blue-500', bg: 'bg-blue-500/10', animate: true },
        'ERROR': { icon: AlertTriangle, text: 'Error', color: 'text-amber-500', bg: 'bg-amber-500/10' },
        'OFFLINE': { icon: WifiOff, text: 'Offline', color: 'text-gray-500', bg: 'bg-gray-500/10' },
        'COMPLETED': { icon: CheckCircle, text: 'Synced', color: 'text-green-500', bg: 'bg-green-500/10' }
    }[status] || { icon: Cloud, text: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-500/10' };

    const Icon = config.icon;

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:bg-gray-800 ${config.bg} ${config.color} border border-transparent hover:border-gray-700`}
            >
                <Icon className={`w-4 h-4 ${config.animate ? 'animate-spin' : ''}`} />
                <span className="text-xs font-bold hidden sm:inline">{config.text}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
                        />
                        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-2xl w-full max-w-sm pointer-events-auto"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                        <Cloud className="w-5 h-5 text-purple-500" /> Sync Status
                                    </h3>
                                    <div className={`px-2 py-0.5 rounded text-xs font-bold border ${config.bg} ${config.color.replace('text-', 'border-').replace('500', '500/30')}`}>
                                        {status}
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${config.bg}`}>
                                                <Icon className={`w-5 h-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">Connection</div>
                                                <div className="text-xs text-gray-400">{isOnline ? 'Online & Connected' : 'Offline'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-800" />

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-300">Auto-Sync</span>
                                        <button 
                                            onClick={() => setIsAutoSync(!isAutoSync)}
                                            className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ${isAutoSync ? 'bg-green-500' : 'bg-gray-700'}`}
                                        >
                                            <motion.div 
                                                className="w-4 h-4 bg-white rounded-full shadow-sm"
                                                animate={{ x: isAutoSync ? 20 : 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => { manualSync(); setIsOpen(false); }}
                                        disabled={!isOnline || isSyncing}
                                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                                    </button>
                                    
                                    <button 
                                        onClick={() => setIsOpen(false)}
                                        className="w-full py-2 text-gray-400 hover:text-white text-sm font-medium"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};


export default SyncStatusIndicator;
