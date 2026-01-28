/**
 * Legacy Database Reader
 * Reads raw data from the old 'ExpenseTrackerDB' (Dexie.js)
 * Used uniquely for migration to RxDB
 */

const DB_NAME = 'ExpenseTrackerDB';

export interface LegacyData {
  accounts: any[];
  transactions: any[];
  categories: any[];
  loans: any[];
  creditCards: any[];
  budgets: any[];
  users: any[];
  households: any[];
}

export const readLegacyDatabase = async (): Promise<LegacyData | null> => {
  if (typeof window === 'undefined' || !window.indexedDB) return null;

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME);

    request.onerror = () => {
      // Database might not exist (new user), which is fine
      console.log('Legacy DB not found or failed to open');
      resolve(null);
    };

    request.onsuccess = async (event: any) => {
      const db = event.target.result;
      const tables = ['accounts', 'transactions', 'categories', 'loans', 'creditCards', 'budgets', 'users', 'households'];
      
      // Check if tables exist
      const objectStoreNames = Array.from(db.objectStoreNames) as string[];
      const missingTables = tables.filter(t => !objectStoreNames.includes(t));
      
      if (missingTables.length === tables.length) {
         // Empty or non-matching DB
         resolve(null);
         return;
      }

      const transaction = db.transaction(objectStoreNames, 'readonly');
      const data: any = {};

      const readTable = (tableName: string): Promise<any[]> => {
        return new Promise((res) => {
          if (!objectStoreNames.includes(tableName)) {
            res([]);
            return;
          }
          const store = transaction.objectStore(tableName);
          const req = store.getAll();
          req.onsuccess = () => res(req.result);
          req.onerror = () => res([]);
        });
      };

      try {
        const results = await Promise.all(tables.map(t => readTable(t)));
        tables.forEach((t, i) => {
          data[t] = results[i];
        });
        
        db.close();
        resolve(data as LegacyData);
      } catch (err) {
        console.error('Error reading legacy DB', err);
        resolve(null);
      }
    };
  });
};
