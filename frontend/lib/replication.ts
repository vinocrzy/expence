import { ExpenseDatabase } from './rxdb';
import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';
import { BehaviorSubject } from 'rxjs';

export const syncState$ = new BehaviorSubject<{
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
  connected: boolean;
  lastSync?: Date;
  error?: any;
}>({
  status: 'PAUSED',
  connected: false,
});

export const initializeReplication = async (db: ExpenseDatabase, getToken: () => Promise<string | null>) => {
  const couchURL = process.env.NEXT_PUBLIC_COUCHDB_URL;
  
  if (!couchURL || true) { // Force disabled for now
    console.warn('CouchDB Sync is temporarily disabled.');
    return;
  }

  // Define collections to sync
  const collections = ['accounts', 'transactions', 'categories', 'creditCards', 'loans', 'budgets'];
  
  const replicationStates: any[] = [];

  for (const name of collections) {
     // @ts-ignore
     const collection = db[name];
     if (collection) {
        const replicationState = replicateCouchDB({
            replicationIdentifier: `sync_${name}_v1`,
            collection,
            url: `${couchURL}/${name}`, 
            live: true,
            pull: {
                batchSize: 60,
                modifier: (doc) => doc,
                heartbeat: 60000,
            },
            push: {
                batchSize: 60,
                modifier: (doc) => doc,
            },
            // Custom fetch to inject Authorization header
            fetch: async (url, options) => {
                const token = await getToken();
                const headers = new Headers(options?.headers);
                if (token) {
                    headers.set('Authorization', `Bearer ${token}`);
                }
                return fetch(url, { ...options, headers });
            }
        });
        
        replicationState.error$.subscribe(err => {
            console.error(`Sync error on ${name}:`, err);
            syncState$.next({ ...syncState$.getValue(), status: 'ERROR', error: err, connected: false });
        });

        replicationState.active$.subscribe(active => {
             syncState$.next({ 
                 ...syncState$.getValue(), 
                 status: active ? 'ACTIVE' : 'PAUSED',
                 connected: !active 
             });
        });

        replicationStates.push(replicationState);
     }
  }
  
  // Set initial connected state
  syncState$.next({ ...syncState$.getValue(), connected: true, status: 'ACTIVE' });

  return replicationStates;
};
