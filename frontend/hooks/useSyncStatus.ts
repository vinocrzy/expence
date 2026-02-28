import { useState, useEffect } from 'react';
import { syncState$ } from '../lib/replication';

export function useSyncStatus() {
  const [status, setStatus] = useState(syncState$.getValue());

  useEffect(() => {
    const sub = syncState$.subscribe(setStatus);
    return () => sub.unsubscribe();
  }, []);

  return {
    status: status.status,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: status.status === 'ACTIVE' && status.connected,
    isConnected: status.connected,
    isAutoSyncEnabled: status.isAutoSyncEnabled,
    lastSync: status.lastSync,
    error: status.error,
    collectionStatus: status.collectionStatus || {},
    unsyncedCount: 0, // TODO: Implement count of unsynced docs if possible via RxDB replication states
    setAutoSync: async (enabled: boolean) => {
        const { setAutoSync } = await import('../lib/replication');
        await setAutoSync(enabled);
    },
    manualSync: async () => {
        const { triggerManualSync } = await import('../lib/replication');
        await triggerManualSync();
    }
  };
}
