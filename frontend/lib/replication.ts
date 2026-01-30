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
  status: 'ACTIVE' | 'PAUSED' | 'ERROR' | 'DISABLED';
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
  let username = '';
  let password = '';
  let forceEnable = false;
  
  // Try to parse credentials from the env URL
  if (couchURL) {
      try {
          const urlObj = new URL(couchURL);
          if (urlObj.username && urlObj.password) {
              console.log('Using credentials from NEXT_PUBLIC_COUCHDB_URL');
              username = urlObj.username;
              password = urlObj.password;
              
              // Remove credentials from URL
              urlObj.username = '';
              urlObj.password = '';
              couchURL = urlObj.toString();
              // Remove trailing slash if present
              if (couchURL.endsWith('/')) {
                  couchURL = couchURL.slice(0, -1);
              }
          }
      } catch (e) {
          console.error('Error parsing NEXT_PUBLIC_COUCHDB_URL', e);
      }
  }

  if (typeof window !== 'undefined') {
      try {
          const stored = localStorage.getItem('couchdb_config');
          if (stored) {
              const config = JSON.parse(stored);
              if (config.enabled && config.url) {
                  console.log('Using custom CouchDB configuration');
                  couchURL = config.url;
                  if (config.username && config.password) {
                      username = config.username;
                      password = config.password;
                  }
              }
              if (config.forceEnable) {
                  forceEnable = true;
              }
          }
      } catch (e) {
          console.error('Error loading custom couchdb config', e);
      }
  }
  
  const isReplicationDisabled = process.env.NEXT_PUBLIC_REPLICATION_DISSABLED === 'true';

  if (isReplicationDisabled && !forceEnable) {
    console.warn('CouchDB Sync is disabled via environment variable.');
    syncState$.next({ ...syncState$.getValue(), status: 'DISABLED', connected: false });
    return [];
  }

  if (isReplicationDisabled && forceEnable) {
      console.warn('Replication is disabled by env var, but FORCED ENABLED by user settings.');
  }

  if (!couchURL) {
      console.error('CouchDB URL is not defined. CouchDB Sync is disabled.');
      syncState$.next({ ...syncState$.getValue(), status: 'PAUSED', connected: false });
      return [];
  }

  // Enforce HTTP for localhost:5984 to avoid SSL errors
  if (couchURL) {
      try {
          const url = new URL(couchURL);
          if (url.protocol === 'https:' && url.hostname === 'localhost' && url.port === '5984') {
            console.warn('Detected HTTPS for localhost:5984. Downgrading to HTTP to avoid connection timeout.');
            url.protocol = 'http:';
            couchURL = url.toString();
             // Remove trailing slash if present (toString() might add it)
             if (couchURL.endsWith('/')) {
                  couchURL = couchURL.slice(0, -1);
              }
          }
      } catch (e) {
          console.error('Error parsing/downgrading URL', e);
      }
  }

  const collections = [
    { name: 'accounts', db: accountsDB },
    { name: 'transactions', db: transactionsDB },
    { name: 'categories', db: categoriesDB },
    { name: 'creditcards', db: creditcardsDB },
    { name: 'loans', db: loansDB },
    { name: 'budgets', db: budgetsDB },
  ];
  
  let ajaxOptions = {};
  let authOptions: any = {};

  if (username && password) {
      authOptions = { username, password };
  } else {
      // Only use Clerk token if no basic auth credentials provided
      try {
        const token = await getToken();
        if (token) {
            ajaxOptions = {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };
        }
      } catch (e) {
          console.warn('Failed to get auth token', e);
      }
  }

  const replicationStates: any[] = [];

  for (const { name, db } of collections) {
      const remoteURL = `${couchURL}/${name}`;
      
      const syncOptions: any = {
        live: true,
        retry: true,
        batch_size: 60
      };

      if (Object.keys(authOptions).length > 0) {
          syncOptions.auth = authOptions;
      }
      
      if (Object.keys(ajaxOptions).length > 0) {
          syncOptions.ajax = ajaxOptions;
      }

      const syncHandler = db.sync(remoteURL, syncOptions);

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
