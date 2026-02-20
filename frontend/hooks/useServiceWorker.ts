'use client';

import { useState, useEffect } from 'react';

export function useServiceWorker() {
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
    const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);

    useEffect(() => {
        // Load preference
        const stored = localStorage.getItem('auto_update_enabled');
        const shouldAutoUpdate = stored === 'true';
        setAutoUpdateEnabled(shouldAutoUpdate);

        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Check existing registration
            navigator.serviceWorker.getRegistration().then((reg) => {
                if (reg) {
                    setRegistration(reg);
                    
                    // Helper to trigger update
                    const triggerUpdate = (worker: ServiceWorker) => {
                         if (shouldAutoUpdate) {
                             worker.postMessage({ type: 'SKIP_WAITING' });
                         } else {
                             setIsUpdateAvailable(true);
                         }
                    };

                    // Check if there's already a waiting worker
                    if (reg.waiting) {
                        triggerUpdate(reg.waiting);
                    }

                    // Listen for new updates
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    triggerUpdate(newWorker);
                                }
                            });
                        }
                    });
                }
            });

            // Listen for controller change (reload when new SW takes over)
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }
    }, []);

    const updateApp = () => {
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    const toggleAutoUpdate = (enabled: boolean) => {
        setAutoUpdateEnabled(enabled);
        localStorage.setItem('auto_update_enabled', String(enabled));
        
        // If enabling and update is already waiting, trigger it immediately
        if (enabled && isUpdateAvailable && registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    return { isUpdateAvailable, updateApp, autoUpdateEnabled, toggleAutoUpdate };
}
