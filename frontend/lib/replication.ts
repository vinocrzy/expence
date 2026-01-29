import { 
  accountsDB, 
  transactionsDB, 
  categoriesDB, 
  creditcardsDB, 
  loansDB, 
  budgetsDB 
} from './pouchdb';
import { BehaviorSubject } from 'rxjs';
import PouchDB from 'pouchdb';

export const syncState$ = new BehaviorSubject<{
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
  connected: boolean;
  lastSync?: Date;
  error?: any;
}>({
  status: 'PAUSED',
  connected: false,
});

export const initializeReplication = async (getToken: () => Promise<string | null>) => {
  // Check local storage for custom config
  let couchURL = process.env.NEXT_PUBLIC_COUCHDB_URL;
  let authHeaders: any = {};
  
  if (typeof window !== 'undefined') {
      try {
          const stored = localStorage.getItem('couchdb_config');
          if (stored) {
              const config = JSON.parse(stored);
              if (config.enabled && config.url) {
                  console.log('Using custom CouchDB configuration');
                  couchURL = config.url;
                  if (config.username && config.password) {
                      authHeaders = {
                          'Authorization': 'Basic ' + btoa(config.username + ":" + config.password)
                      };
                  }
              }
          }
      } catch (e) {
          console.error('Error loading custom couchdb config', e);
      }
  }

  const isReplicationDisabled = process.env.NEXT_PUBLIC_REPLICATION_DISSABLED === 'true';
  
  if (!couchURL || isReplicationDisabled) {
    console.warn('CouchDB Sync is disabled (No URL or Disabled via Env).');
    syncState$.next({ ...syncState$.getValue(), status: 'PAUSED', connected: false });
    return [];
  }

  const collections = [
    { name: 'accounts', db: accountsDB },
    { name: 'transactions', db: transactionsDB },
    { name: 'categories', db: categoriesDB },
    { name: 'creditcards', db: creditcardsDB },
    { name: 'loans', db: loansDB },
    { name: 'budgets', db: budgetsDB },
  ];
  
  // Only use Clerk token if no custom auth headers provided
  if (Object.keys(authHeaders).length === 0) {
      try {
        const token = await getToken();
        if (token) {
            authHeaders = {
                'Authorization': `Bearer ${token}`
            };
        }
      } catch (e) {
          console.warn('Failed to get auth token', e);
      }
  }

  const ajaxOptions = {
    headers: authHeaders
  };

  const replicationStates: any[] = [];

  for (const { name, db } of collections) {
      const remoteURL = `${couchURL}/${name}`;
      
      const syncHandler = db.sync(remoteURL, {
        live: true,
        retry: true,
        batch_size: 60,
        ajax: ajaxOptions
      } as any);

      syncHandler
        .on('change', (info) => {
           // handle change
           syncState$.next({ 
             ...syncState$.getValue(), 
             status: 'ACTIVE', 
             connected: true,
             lastSync: new Date()
           });
        })
        .on('paused', (err) => {
           // replication paused (e.g. replication up to date, user went offline)
           syncState$.next({ 
             ...syncState$.getValue(), 
             status: 'PAUSED', // or ACTIVE if just waiting? usually PAUSED means idle
             connected: true
           });
        })
        .on('active', () => {
           // replicate resumed (e.g. new changes replicating)
           syncState$.next({ 
             ...syncState$.getValue(), 
             status: 'ACTIVE', 
             connected: true 
           });
        })
        .on('denied', (err) => {
           // a document failed to replicate (e.g. due to permissions)
           console.error(`Sync denied on ${name}:`, err);
        })
        .on('complete', (info) => {
           // handle complete
           syncState$.next({ 
               ...syncState$.getValue(), 
               status: 'PAUSED', 
               connected: false 
            });
        })
        .on('error', (err) => {
           // handle error
           console.error(`Sync error on ${name}:`, err);
           syncState$.next({ 
               ...syncState$.getValue(), 
               status: 'ERROR', 
               error: err, 
               connected: false 
           });
        });

      replicationStates.push(syncHandler);
  }
  
  // Set initial connected state
  syncState$.next({ ...syncState$.getValue(), connected: true, status: 'ACTIVE' });

  return replicationStates;
};
