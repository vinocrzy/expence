
import { getDB } from './db';
import api from './api';

import { notifyDataChange } from './events';

const SYNC_INTERVAL_ACTIVE = 1800000; // 30 minutes (was 15s)
const SYNC_INTERVAL_IDLE = 3600000; // 1 hour

type SyncTask = {
    id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    table: 'transactions' | 'categories' | 'accounts';
    payload: any;
    createdAt: number;
    status: 'PENDING' | 'SYNCING' | 'FAILED';
};

class SyncEngine {
    private isSyncing = false;
    private timer: NodeJS.Timeout | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.syncNow());
            this.startAutoSync();
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
        console.log('Starting Auto-Sync with interval:', SYNC_INTERVAL_ACTIVE);
        this.timer = setInterval(runSync, SYNC_INTERVAL_ACTIVE);

        // Smart Polling: Listen to Visibility Change
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (this.timer) clearInterval(this.timer);
                const interval = document.hidden ? SYNC_INTERVAL_IDLE : SYNC_INTERVAL_ACTIVE;
                this.timer = setInterval(runSync, interval);
                
                // If resolving to visible, sync now
                if (!document.hidden) runSync();
            });
        }
    }

    async syncNow(options?: { tables?: ('transactions' | 'categories' | 'accounts')[] }) {
        if (this.isSyncing || !navigator.onLine) return;
        this.isSyncing = true;
        
        try {
            await this.pushChanges();
            
            // If specific tables requested, only pull those. Otherwise pull all.
            if (options?.tables) {
                for (const table of options.tables) {
                    if (table === 'transactions') await this.syncTransactions();
                    if (table === 'categories') await this.syncCategories();
                    if (table === 'accounts') await this.syncAccounts();
                }
            } else {
                await this.pullChanges();
            }
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    async pushChanges() {
        const db = await getDB();
        const tx = db.transaction('sync_queue', 'readonly');
        const queue = await tx.store.getAll();
        
        // Process in order of creation
        const pending = queue
            .filter(item => item.status === 'PENDING' || item.status === 'FAILED')
            .sort((a, b) => a.createdAt - b.createdAt);

        for (const item of pending) {
            try {
                // Mark as SYNCING
                await db.put('sync_queue', { ...item, status: 'SYNCING' });

                await this.processItem(item);

                // Success: Remove from queue
                await db.delete('sync_queue', item.id);
            } catch (error) {
                console.error(`Failed to sync item ${item.id}`, error);
                // Mark as FAILED
                await db.put('sync_queue', { ...item, status: 'FAILED' });
            }
        }
    }

    async processItem(item: SyncTask) {
        let endpoint = '';
        if (item.table === 'transactions') endpoint = '/transactions';
        if (item.table === 'categories') endpoint = '/categories';
        if (item.table === 'accounts') endpoint = '/accounts';

        if (!endpoint) throw new Error(`Unknown table: ${item.table}`);

        // Handle specific endpoints for IDs if needed (RESTful standard)
        // Adjusting based on standard patterns: POST /resource, PUT /resource/:id, DELETE /resource/:id
        
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

    // Helper to genericize sync
    async syncTable(tableName: 'transactions' | 'categories' | 'accounts', endpoint: string) {
        try {
            const lastSyncKey = `last_sync_${tableName}`;
            const lastSync = localStorage.getItem(lastSyncKey);
            
            const url = lastSync 
                ? `${endpoint}?updatedAfter=${lastSync}` 
                : endpoint;

            const res = await api.get(url);
            const data = res.data;
            
            if (data.length > 0) {
                const db = await getDB();
                const tx = db.transaction(tableName, 'readwrite');
                for (const item of data) {
                     await tx.store.put(item);
                }
                await tx.done;
                
                // Notify UI
                notifyDataChange(tableName);
                
                // Update Timestamp (using server time ideally, but rough local time is okay for "updatedAfter")
                // Better: Use the max updatedAt from the data to be safe? 
                // Simplest: Use ISO string of now.
                localStorage.setItem(lastSyncKey, new Date().toISOString());
                
                console.log(`Synced ${data.length} ${tableName} (Delta)`);
            }
        } catch (error) {
            console.error(`Pull ${tableName} failed`, error);
        }
    }

    async syncTransactions() { return this.syncTable('transactions', '/transactions'); }
    async syncCategories() { return this.syncTable('categories', '/categories'); }
    async syncAccounts() { return this.syncTable('accounts', '/accounts'); }
}

export const syncEngine = new SyncEngine();
