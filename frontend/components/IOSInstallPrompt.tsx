'use client';

import { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function IOSInstallPrompt() {
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    useEffect(() => {
        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Detect Standalone (Installed)
        const isStandaloneMode = 
            window.matchMedia('(display-mode: standalone)').matches || 
            (window.navigator as any).standalone === true;
        
        setIsStandalone(isStandaloneMode);

        // Show prompt only if on iOS and NOT standalone
        // And maybe check if user dismissed it previously (sessionStorage)
        const hasDismissed = sessionStorage.getItem('ios_install_dismissed');

        if (isIosDevice && !isStandaloneMode && !hasDismissed) {
            // Delay slightly for better UX
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setShowPrompt(false);
        sessionStorage.setItem('ios_install_dismissed', 'true');
    };

    if (!isIOS || isStandalone) return null;

    return (
        <>
            {/* Banner / Prompt */}
            <AnimatePresence>
                {showPrompt && !showInstructions && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-24 left-4 right-4 z-50 bg-gray-900/90 backdrop-blur-md border border-gray-700 p-4 rounded-2xl shadow-2xl flex items-center justify-between"
                    >
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-sm">Install App</h3>
                            <p className="text-gray-400 text-xs mt-0.5">Add to Home Screen for the best experience.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleDismiss}
                                className="p-2 text-gray-500 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            <button 
                                onClick={() => setShowInstructions(true)}
                                className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg"
                            >
                                Install
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Instruction Modal */}
            <AnimatePresence>
                {showInstructions && (
                    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowInstructions(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                        />

                        {/* Sheet */}
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-gray-900 border-t border-gray-800 w-full max-w-md p-6 rounded-t-3xl pointer-events-auto pb-10 sm:rounded-2xl sm:border sm:m-4"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white">Install for iOS</h2>
                                <button onClick={() => setShowInstructions(false)} className="p-2 bg-gray-800 rounded-full text-gray-400">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="bg-gray-800 p-3 rounded-xl">
                                        <Share className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium mb-1">1. Tap the Share Button</h3>
                                        <p className="text-gray-400 text-sm">Look for the share icon in your browser's bottom bar.</p>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-800 w-full" />

                                <div className="flex items-start gap-4">
                                    <div className="bg-gray-800 p-3 rounded-xl">
                                        <PlusSquare className="h-6 w-6 text-gray-200" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium mb-1">2. Add to Home Screen</h3>
                                        <p className="text-gray-400 text-sm">Scroll down the list and tap "Add to Home Screen".</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-center">
                                <p className="text-gray-500 text-xs">This will install the app so you can use it offline and fullscreen.</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
