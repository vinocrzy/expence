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
  status: 'ACTIVE' | 'PAUSED' | 'ERROR' | 'DISABLED' | 'BLOCKED';
  connected: boolean;
  lastSync?: Date;
  error?: any;
  isAutoSyncEnabled: boolean;
}>({
  status: 'DISABLED',
  connected: false,
  isAutoSyncEnabled: false,
});

  // Store active replication handlers
  let activeReplications: any[] = [];
  let isAutoSyncEnabled = false;

  export const stopReplication = () => {
    console.log('Stopping replication...', activeReplications.length);
    activeReplications.forEach(handler => handler.cancel());
    activeReplications = [];
    // If we stop manually, we are effectively DISABLED (User stopped)
    syncState$.next({ ...syncState$.getValue(), status: 'DISABLED', connected: false });
  };

  // Helper to verify connection
  const verifyConnection = async (couchURL: string, authOptions: any, ajaxOptions: any): Promise<boolean> => {
    try {
        console.log('Verifying connection to', couchURL);
        const headers: any = { ...ajaxOptions.headers };
        if (authOptions.username && authOptions.password) {
            headers['Authorization'] = 'Basic ' + btoa(authOptions.username + ':' + authOptions.password);
        }

        const response = await fetch(couchURL, { method: 'GET', headers });
        if (response.ok) {
             return true;
        }
        console.warn('Verification failed:', response.status, response.statusText);
        return false;
    } catch (e) {
        console.error('Verification error:', e);
        return false;
    }
  };

  // Store the token getter for re-initialization
  let cachedGetToken: (() => Promise<string | null>) | null = null;

// Helper to load config
const getReplicationConfig = async (getToken: () => Promise<string | null>) => {
  let couchURL = process.env.NEXT_PUBLIC_COUCHDB_URL;
  let username = '';
  let password = '';
  let forceEnable = false;

  if (couchURL) {
      try {
          const urlObj = new URL(couchURL);
          if (urlObj.username && urlObj.password) {
              username = urlObj.username;
              password = urlObj.password;
              urlObj.username = '';
              urlObj.password = '';
              couchURL = urlObj.toString();
              if (couchURL.endsWith('/')) couchURL = couchURL.slice(0, -1);
          }
      } catch (e) { console.error('Error parsing NEXT_PUBLIC_COUCHDB_URL', e); }
  }

  if (typeof window !== 'undefined') {
      try {
          const stored = localStorage.getItem('couchdb_config');
          if (stored) {
              const config = JSON.parse(stored);
              if (config.enabled && config.url) {
                  couchURL = config.url;
                  if (config.username && config.password) {
                      username = config.username;
                      password = config.password;
                  }
              }
              if (config.forceEnable) forceEnable = true;
          }
      } catch (e) { console.error('Error loading custom couchdb config', e); }
  }

  // Enforce HTTP for localhost:5984
  if (couchURL) {
      try {
          const url = new URL(couchURL);
          if (url.protocol === 'https:' && url.hostname === 'localhost' && url.port === '5984') {
             url.protocol = 'http:';
             couchURL = url.toString();
             if (couchURL.endsWith('/')) couchURL = couchURL.slice(0, -1);
          }
      } catch (e) { console.error('Error parsing/downgrading URL', e); }
  }

  let ajaxOptions: any = {};
  let authOptions: any = {};

  if (username && password) {
      authOptions = { username, password };
  } else {
      try {
        const token = await getToken();
        if (token) {
            ajaxOptions = { headers: { 'Authorization': `Bearer ${token}` } };
        }
      } catch (e) { console.log('Failed to get auth token', e); }
  }

  return { couchURL, authOptions, ajaxOptions, forceEnable };
};

  export const initializeReplication = async (getToken: () => Promise<string | null>) => {
  cachedGetToken = getToken;

  // Clear existing
  stopReplication(); // Sets status to DISABLED

  const { couchURL, authOptions, ajaxOptions, forceEnable } = await getReplicationConfig(getToken);

  // 2. Check Environment Restrictions
  const isReplicationDisabled = process.env.NEXT_PUBLIC_REPLICATION_DISSABLED === 'true';

  if (isReplicationDisabled && !forceEnable) {
    console.warn('CouchDB Sync is disabled via environment variable.');
    syncState$.next({ ...syncState$.getValue(), status: 'BLOCKED', connected: false });
    return [];
  }

  if (isReplicationDisabled && forceEnable) {
      console.warn('Replication is disabled by env var, but FORCED ENABLED by user settings.');
  }

  if (!couchURL) {
      console.error('CouchDB URL is not defined.');
      syncState$.next({ ...syncState$.getValue(), status: 'ERROR', error: 'No URL', connected: false });
      return [];
  }

  // 4. Check Auto-Sync State
  if (!isAutoSyncEnabled) {
      console.log('Auto-sync is disabled by user setting, skipping initialization');
      syncState$.next({ ...syncState$.getValue(), status: 'DISABLED', connected: false });
      return [];
  }

  // 5. Verify Connection
  const isConnected = await verifyConnection(couchURL, authOptions, ajaxOptions);
  if (!isConnected) {
      console.error('Connection verification failed.');
      syncState$.next({ ...syncState$.getValue(), status: 'ERROR', error: 'Connection Failed', connected: false });
      return [];
  }

  // 6. Start Replication
  const collections = [
    { name: 'accounts', db: accountsDB },
    { name: 'transactions', db: transactionsDB },
    { name: 'categories', db: categoriesDB },
    { name: 'creditcards', db: creditcardsDB },
    { name: 'loans', db: loansDB },
    { name: 'budgets', db: budgetsDB },
  ];

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
           // If err is present, it might be due to offline, handled by 'error' usually or handled here.
           // But usually 'paused' without error means we are up-to-date and waiting.
           syncState$.next({
             ...syncState$.getValue(),
             status: 'PAUSED',
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
           // handle complete if we stopped it manually or connection lost
           // If we manually stopped, status might already be DISABLED
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

      activeReplications.push(syncHandler);
  }

  // Set initial connected state
  syncState$.next({ ...syncState$.getValue(), connected: true, status: 'ACTIVE' });

  return activeReplications;
};

export const triggerManualSync = async () => {
    console.log('Manual sync triggered...');
    if (!cachedGetToken) {
        console.error('Cannot sync: No cached token getter');
        return;
    }

    // If auto-sync is enabled, restarting initialization is essentially a manual "check now"
    if (isAutoSyncEnabled) {
        await initializeReplication(cachedGetToken);
        return;
    }

    // If auto-sync is disabled, we do a ONE-OFF sync
    const { couchURL, authOptions, ajaxOptions, forceEnable } = await getReplicationConfig(cachedGetToken);

    const isReplicationDisabled = process.env.NEXT_PUBLIC_REPLICATION_DISSABLED === 'true';
    if (isReplicationDisabled && !forceEnable) {
        console.warn('Sync is BLOCKED by env var.');
        return;
    }

    if (!couchURL) return;

    // Verify first
    syncState$.next({ ...syncState$.getValue(), status: 'ACTIVE', connected: false }); // Show "Syncing..."
    const isConnected = await verifyConnection(couchURL, authOptions, ajaxOptions);
    if (!isConnected) {
         syncState$.next({ ...syncState$.getValue(), status: 'ERROR', error: 'Connection Failed', connected: false });
         return;
    }

    const collections = [
        { name: 'accounts', db: accountsDB },
        { name: 'transactions', db: transactionsDB },
        { name: 'categories', db: categoriesDB },
        { name: 'creditcards', db: creditcardsDB },
        { name: 'loans', db: loansDB },
        { name: 'budgets', db: budgetsDB },
    ];

    let completed = 0;

    for (const { name, db } of collections) {
      const remoteURL = `${couchURL}/${name}`;
      const syncOptions: any = { live: false, retry: false, batch_size: 60 }; // ONE-OFF
      if (Object.keys(authOptions).length > 0) syncOptions.auth = authOptions;
      if (Object.keys(ajaxOptions).length > 0) syncOptions.ajax = ajaxOptions;

      db.sync(remoteURL, syncOptions).on('complete', () => {
          completed++;
          if (completed === collections.length) {
               syncState$.next({ ...syncState$.getValue(), status: 'DISABLED', connected: true, lastSync: new Date() });
          }
      }).on('error', (err) => {
          console.error(`Manual sync error ${name}`, err);
          // Don't fail all?
      });
    }
};

// Implement toggle logic correctly now that we have cachedGetToken


const performToggle = async (enable: boolean) => {
     if (enable) {
         // Optimistic update? No, let's verify first to avoid flicker if it fails.
         // But we need to update UI to show "Checking..." ideally.
         // For now, we update to "SYNCING" or similar? Or just keep disabled until verified?
         // User requested: "disabled the sync entairly but user can enable in setting before enable it will verify couchdb is up or not"

         // We need the URL and Creds to verify. We usually get them in initializeReplication.
         // Refactor: We can't verify HERE easily without duplicating the config loading logic.
         // SOLUTION: We'll let initializeReplication handle verification failure gracefully BUT
         // since we are toggling ON, we want to know if it SUCCEEDED.

         // We'll rely on initializeReplication to do the right thing,
         // but we want to fail back to disabled if it fails?
         // Actually, initializeReplication calls verify? No.

         // Let's try to initialize.
         if (cachedGetToken) {
             // We set state to ACTIVE/SYNCING temporarily or let initializeReplication do it.
             syncState$.next({ ...syncState$.getValue(), status: 'ACTIVE', connected: false, isAutoSyncEnabled: true });

             // Initialize will return empty array if it fails?
             // We should modify initializeReplication to possibly THROW or we check result.
             // But initializeReplication currently handles its own config loading.

             // We'll rely on initializeReplication to do the right thing,
             // but we want to fail back to disabled if it fails?
             // Actually, initializeReplication calls verify? No.

             // Let's try to initialize.
             const handlers = await initializeReplication(cachedGetToken);
             if (handlers.length === 0) {
                 // It returned empty either because disabled (which we just enabled) OR execution failed before creating handlers?
                 // initializeReplication returns empty if no URL etc.
                 // We can check if status became ERROR or remains DISABLED?
                 const current = syncState$.getValue();
                 if (current.status === 'DISABLED' || current.status === 'PAUSED') {
                      // It seems it failed to start.
                      // Revert toggle
                      syncState$.next({ ...syncState$.getValue(), isAutoSyncEnabled: false, status: 'DISABLED' });
                      isAutoSyncEnabled = false;
                      // Maybe alert user?
                 }
             }
         } else {
             console.warn('Cannot enable auto-sync: No cached token getter');
         }
     } else {
         stopReplication();
         syncState$.next({ ...syncState$.getValue(), isAutoSyncEnabled: false, status: 'DISABLED' });
     }
}

// Redefine to use the helper
export const setAutoSync = async (enable: boolean) => {
    isAutoSyncEnabled = enable;
    await performToggle(enable);
};
