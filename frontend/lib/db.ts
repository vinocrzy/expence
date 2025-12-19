
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ExpenseDB extends DBSchema {
  transactions: {
    key: string;
    value: any; // We'll verify the exact type later
  };
  categories: {
    key: string;
    value: any;
  };
  accounts: {
    key: string;
    value: any;
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      table: 'transactions' | 'categories';
      payload: any;
      createdAt: number;
      status: 'PENDING' | 'SYNCING' | 'FAILED';
    };
    indexes: { 'by-status': string; 'by-date': number };
  };
}

const DB_NAME = 'expense-db';
const DB_VERSION = 1;

export const initDB = async (): Promise<IDBPDatabase<ExpenseDB>> => {
  return openDB<ExpenseDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-date', 'createdAt');
      }
    },
  });
};

export const getDB = async () => {
  return await initDB();
};
