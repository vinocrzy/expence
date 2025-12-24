import { getDB } from './db';
import api from './api';
import { notifyDataChange } from './events';

const SYNC_INTERVAL_ACTIVE = 30000; // 30s for demo/testing (was 30m)
const SYNC_INTERVAL_IDLE = 3600000; // 1 hour

type SyncTask = {
    id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    table: 'transactions' | 'categories' | 'accounts';
    payload: any;
    createdAt: number;
    status: 'PENDING' | 'SYNCING' | 'FAILED';
};

export type SyncStatus = 'SAVED_LOCALLY' | 'SYNCING' | 'COMPLETED' | 'ERROR' | 'OFFLINE';

class SyncEngine {
    private isSyncing = false;
    private timer: NodeJS.Timeout | null = null;
    private listeners: ((status: SyncStatus) => void)[] = [];
    private currentStatus: SyncStatus = 'COMPLETED';

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                 this.checkPendingAndSync();
            });
            window.addEventListener('offline', () => this.setStatus('OFFLINE'));
            this.startAutoSync();
        }
    }

    subscribe(listener: (status: SyncStatus) => void) {
        this.listeners.push(listener);
        listener(this.currentStatus);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private setStatus(status: SyncStatus) {
        if (this.currentStatus !== status) {
            this.currentStatus = status;
            this.listeners.forEach(l => l(status));
        }
    }

    startAutoSync() {
        if (this.timer) clearInterval(this.timer);
        
        const runSync = () => {
            if (navigator.onLine && !this.isSyncing) {
                this.syncNow();
            }
        };

        // Initial Interval
        console.log('Starting Auto-Sync service');
        this.timer = setInterval(runSync, SYNC_INTERVAL_ACTIVE);

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (this.timer) clearInterval(this.timer);
                const interval = document.hidden ? SYNC_INTERVAL_IDLE : SYNC_INTERVAL_ACTIVE;
                this.timer = setInterval(runSync, interval);
                if (!document.hidden) runSync();
            });
        }
    }

    async checkPending() {
        const db = await getDB();
        const tx = db.transaction('sync_queue', 'readonly');
        const count = await tx.store.count();
        return count > 0;
    }

    async checkPendingAndSync() {
         if (await this.checkPending()) {
             this.setStatus('SAVED_LOCALLY');
             this.syncNow();
         } else {
             this.setStatus('COMPLETED');
         }
    }

    async syncNow(options?: { tables?: ('transactions' | 'categories' | 'accounts')[] }) {
        if (this.isSyncing || !navigator.onLine) {
            if (!navigator.onLine) this.setStatus('OFFLINE');
            return;
        }

        this.isSyncing = true;
        this.setStatus('SYNCING');
        
        try {
            await this.pushChanges();
            
            // If specific tables requested, only pull those
            if (options?.tables) {
                for (const table of options.tables) {
                    if (table === 'transactions') await this.syncTransactions();
                    if (table === 'categories') await this.syncCategories();
                    if (table === 'accounts') await this.syncAccounts();
                }
            } else {
                await this.pullChanges();
            }
            
            // Check if queue is empty now
            const hasPending = await this.checkPending();
            this.setStatus(hasPending ? 'ERROR' : 'COMPLETED'); // If pending remains after sync, some failed
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.setStatus('ERROR');
        } finally {
            this.isSyncing = false;
        }
    }

    async pushChanges() {
        const db = await getDB();
        const tx = db.transaction('sync_queue', 'readwrite'); // Need readwrite? Yes implementation used multiple calls
        // Since we iterate, better to just get all first
        // Note: The previous implementation logic was correct, getting all then processing.
        // Re-implementing carefully.
        const queue = await tx.store.getAll();
        await tx.done;
        
        const pending = queue
            .filter((item: SyncTask) => item.status === 'PENDING' || item.status === 'FAILED')
            .sort((a: SyncTask, b: SyncTask) => a.createdAt - b.createdAt);

        if (pending.length === 0) return;

        for (const item of pending) {
            try {
                // Update status to SYNCING
                const db = await getDB(); // fresh connection
                await db.put('sync_queue', { ...item, status: 'SYNCING' });

                await this.processItem(item);

                // Success
                await db.delete('sync_queue', item.id);
            } catch (error) {
                console.error(`Failed to sync item ${item.id}`, error);
                
                // If API returns 4xx (non-retryable), maybe we should delete or move to dead-letter?
                // For now, mark FAILED.
                const db = await getDB();
                await db.put('sync_queue', { ...item, status: 'FAILED' });
                // We do NOT break the loop, try others? Or break to preserve order?
                // Order is important for transactions. If Create fails, Update shouldn't run.
                // But if they are unrelated?
                // Safest to continue, but if dependency exists, might be issue.
            }
        }
    }

    async processItem(item: SyncTask) {
        let endpoint = '';
        if (item.table === 'transactions') endpoint = '/transactions';
        if (item.table === 'categories') endpoint = '/categories';
        if (item.table === 'accounts') endpoint = '/accounts';

        if (!endpoint) throw new Error(`Unknown table: ${item.table}`);
        
        // API client now handles retries for 5xx/Network
        if (item.action === 'CREATE') {
            await api.post(endpoint, item.payload);
        } else if (item.action === 'UPDATE') {
            await api.put(`${endpoint}/${item.payload.id}`, item.payload);
        } else if (item.action === 'DELETE') {
            await api.delete(`${endpoint}/${item.payload.id}`);
        }
    }

    async pullChanges() {
        await this.syncTransactions();
        await this.syncCategories();
        await this.syncAccounts();
    }

    async syncTable(tableName: 'transactions' | 'categories' | 'accounts', endpoint: string) {
        try {
            const lastSyncKey = `last_sync_${tableName}`;
            const lastSync = localStorage.getItem(lastSyncKey);
            
            const url = lastSync 
                ? `${endpoint}?updatedAfter=${lastSync}` 
                : endpoint;

            const res = await api.get(url);
            const data = res.data;
            
            if (data && data.length > 0) { // Check data
                const db = await getDB();
                const tx = db.transaction(tableName, 'readwrite');
                for (const item of data) {
                     await tx.store.put(item);
                }
                await tx.done;
                
                notifyDataChange(tableName);
                localStorage.setItem(lastSyncKey, new Date().toISOString());
                console.log(`Synced ${data.length} ${tableName} (Delta)`);
            }
        } catch (error) {
            console.error(`Pull ${tableName} failed`, error);
            // Don't throw, allow other tables to sync
        }
    }

    async syncTransactions() { return this.syncTable('transactions', '/transactions'); }
    async syncCategories() { return this.syncTable('categories', '/categories'); }
    async syncAccounts() { return this.syncTable('accounts', '/accounts'); }
}

export const syncEngine = new SyncEngine();
