import { 
  accountsDB, 
  transactionsDB, 
  categoriesDB, 
  creditcardsDB, 
  loansDB, 
  budgetsDB 
} from './pouchdb';
import { BehaviorSubject } from 'rxjs';
import PouchDB from 'pouchdb-core';

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
  let cachedHouseholdId: string | null = null;

  export const resetReplicationState = () => {
      stopReplication();
      cachedGetToken = null;
      cachedHouseholdId = null;
  };

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

// Helper to ensure remote DB exists via PUT
const ensureRemoteDB = async (url: string, headers: any) => {
    try {
        const response = await fetch(url, { method: 'PUT', headers });
        if (response.ok || response.status === 412) { // 201 Created or 412 Precondition Failed (Exists)
            return true;
        }
        console.warn(`Failed to create remote DB ${url}: ${response.status} ${response.statusText}`);
        return false;
    } catch (e) {
        // console.error(`Error creating remote DB ${url}`, e);
        return false;
    }
};

import { sharedDB } from './pouchdb';
// ... existing imports

  // We need to accept both Personal ID and (Optionally) Viewing ID
  export const initializeReplication = async (
      getToken: () => Promise<string | null>, 
      personalHouseholdId: string, 
      viewingHouseholdId?: string
  ) => {
  cachedGetToken = getToken;
  cachedHouseholdId = personalHouseholdId; // Default to personal for manual syncs if not specified otherwise

  // Clear existing
  stopReplication(); // Sets status to DISABLED

  // NEW: Check LocalStorage for Auto-Sync preference
  if (typeof window !== 'undefined') {
      const storedAutoSync = localStorage.getItem('autoSyncEnabled');
      if (storedAutoSync !== null) {
          isAutoSyncEnabled = storedAutoSync === 'true';
           // Update subject to match valid state
           const current = syncState$.getValue();
           if (current.isAutoSyncEnabled !== isAutoSyncEnabled) {
               syncState$.next({ ...current, isAutoSyncEnabled });
           }
      }
  }

  const { couchURL, authOptions, ajaxOptions, forceEnable } = await getReplicationConfig(getToken);

  // 2. Check Environment Restrictions
  const isReplicationDisabled = process.env.NEXT_PUBLIC_REPLICATION_DISSABLED === 'true';

  if (isReplicationDisabled && !forceEnable) {
    console.warn('CouchDB Sync is disabled via environment variable.');
    syncState$.next({ ...syncState$.getValue(), status: 'BLOCKED', connected: false });
    return [];
  }

  // ... (URL checks same as before)
  if (!couchURL) {
      console.error('CouchDB URL is not defined.');
      syncState$.next({ ...syncState$.getValue(), status: 'ERROR', error: 'No URL', connected: false });
      return [];
  }

  if (!isAutoSyncEnabled) {
      console.log('Auto-sync is disabled by user setting, skipping initialization');
      syncState$.next({ ...syncState$.getValue(), status: 'DISABLED', connected: false });
      return [];
  }

  const isConnected = await verifyConnection(couchURL, authOptions, ajaxOptions);
  if (!isConnected) {
      console.error('Connection verification failed.');
      syncState$.next({ ...syncState$.getValue(), status: 'ERROR', error: 'Connection Failed', connected: false });
      return [];
  }

  // 6. Define Collections & Targets
  // Strategy: 
  // - Sync Personal DBs (txs, accounts, etc.) -> hh_{personal}_...
  // - Sync Shared DB -> hh_{viewing OR personal}_shared
  
  const personalDBs = [
      { name: 'accounts', db: accountsDB },
      { name: 'transactions', db: transactionsDB },
      { name: 'categories', db: categoriesDB },
      { name: 'creditcards', db: creditcardsDB },
      { name: 'loans', db: loansDB },
      { name: 'budgets', db: budgetsDB },
  ];

  // 1. Sync Personal Data
  for (const { name, db } of personalDBs) {
      const safeId = personalHouseholdId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
      const remoteDBName = `hh_${safeId}_${name}`;
      await startSingleSync(db, remoteDBName, couchURL, authOptions, ajaxOptions);
  }

  // 2. Sync Shared Data (Target depends on Viewing vs Publishing)
  // If we are VIEWING another household, we sync sharedDB with THAT household's shared DB.
  // If we are NOT viewing (just normal usage), we sync sharedDB with OUR OWN shared DB (to publish/backup it).
  
  const sharedTargetId = viewingHouseholdId || personalHouseholdId;
  const safeSharedId = sharedTargetId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  const remoteSharedName = `hh_${safeSharedId}_shared`;

  // Note: Guest View needs Read-Only? Or Sync? Sync is fine for now as it's local PouchDB cache.
  // Ideally if Guest, we might want one-way FROM remote (replication.from).
  // But let's stick to .sync for simplicity unless we want to prevent local edits propagating (which UI prevents anyway).
  await startSingleSync(sharedDB, remoteSharedName, couchURL, authOptions, ajaxOptions);

  // Set initial connected state
  syncState$.next({ ...syncState$.getValue(), connected: true, status: 'ACTIVE' });

  return activeReplications;
};

// Helper to start a sync for one DB
async function startSingleSync(db: any, remoteDBName: string, couchURL: string, authOptions: any, ajaxOptions: any) {
      const remoteURL = `${couchURL}/${remoteDBName}`;

      let createHeaders: any = {};
      if (authOptions.username && authOptions.password) {
          createHeaders['Authorization'] = 'Basic ' + btoa(authOptions.username + ':' + authOptions.password);
      }
      if (ajaxOptions.headers) {
          createHeaders = { ...createHeaders, ...ajaxOptions.headers };
      }
      
      await ensureRemoteDB(remoteURL, createHeaders);

      const syncOptions: any = {
        live: true,
        retry: true,
        batch_size: 60
      };

      if (Object.keys(authOptions).length > 0) syncOptions.auth = authOptions;
      if (Object.keys(ajaxOptions).length > 0) syncOptions.ajax = ajaxOptions;

      const syncHandler = db.sync(remoteURL, syncOptions);

      // Attach event aliases to the main subject
      syncHandler.on('change', () => {
           syncState$.next({ ...syncState$.getValue(), status: 'ACTIVE', connected: true, lastSync: new Date() });
      }).on('paused', () => {
           syncState$.next({ ...syncState$.getValue(), status: 'PAUSED', connected: true });
      }).on('error', (err: any) => {
           console.error(`Sync error on ${remoteDBName}:`, err);
           // Don't fail global state immediately for one DB?
           // syncState$.next({ ...syncState$.getValue(), status: 'ERROR', error: err, connected: false });
      });

      activeReplications.push(syncHandler);
}

export const triggerManualSync = async () => {
    console.log('Manual sync triggered...');
    if (!cachedGetToken || !cachedHouseholdId) {
        console.error('Cannot sync: No cached token getter or household ID set');
        return;
    }

    // If auto-sync is enabled, restarting initialization is essentially a manual "check now"
    if (isAutoSyncEnabled) {
        await initializeReplication(cachedGetToken, cachedHouseholdId);
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
         // CouchDB requires lowercase
         const safeId = cachedHouseholdId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
         const remoteDBName = `hh_${safeId}_${name}`;
         const remoteURL = `${couchURL}/${remoteDBName}`;
       
       // Ensure remote DB exists before syncing manual
       let createHeaders: any = {};
       if (Object.keys(authOptions).length > 0 && authOptions.username) {
             createHeaders['Authorization'] = 'Basic ' + btoa(authOptions.username + ':' + authOptions.password);
       }
       if (Object.keys(ajaxOptions).length > 0 && ajaxOptions.headers) {
             createHeaders = { ...createHeaders, ...ajaxOptions.headers };
       }
       
       await ensureRemoteDB(remoteURL, createHeaders);
       
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
             // We need cachedHouseholdId here too.
             if (cachedHouseholdId) {
                 const handlers = await initializeReplication(cachedGetToken, cachedHouseholdId);
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
                 console.warn('Cannot enable auto-sync: No cached household ID');
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
    if (typeof window !== 'undefined') {
        localStorage.setItem('autoSyncEnabled', enable.toString());
    }
    isAutoSyncEnabled = enable;
    await performToggle(enable);
};
