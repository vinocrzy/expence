
import { useState, useEffect, useCallback } from 'react';
import { getDB } from '../lib/db';
import { syncEngine } from '../lib/sync';

export function useSyncStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [unsyncedCount, setUnsyncedCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);
            const handleOnline = () => setIsOnline(true);
            const handleOffline = () => setIsOnline(false);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    }, []);

    const checkQueue = useCallback(async () => {
        const db = await getDB();
        const count = await db.count('sync_queue');
        setUnsyncedCount(count);
    }, []);

    useEffect(() => {
        // Poll queue status every 2 seconds
        const timer = setInterval(checkQueue, 2000);
        checkQueue();
        return () => clearInterval(timer);
    }, [checkQueue]);

    const manualSync = async () => {
        setIsSyncing(true);
        try {
            await syncEngine.syncNow();
            await checkQueue();
        } finally {
            setIsSyncing(false);
        }
    };

    return { isOnline, unsyncedCount, isSyncing, manualSync };
}
