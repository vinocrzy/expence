import PouchDB from 'pouchdb-core';
import HttpPouch from 'pouchdb-adapter-http';
import IDBPouch from 'pouchdb-adapter-idb';
import PouchFind from 'pouchdb-find';
import PouchReplication from 'pouchdb-replication';

// Register plugins
PouchDB.plugin(HttpPouch);
PouchDB.plugin(IDBPouch);
PouchDB.plugin(PouchFind);
PouchDB.plugin(PouchReplication);

export const dbRequestTimeout = 60000;

const createDB = (name: string) => {
  if (typeof window === 'undefined') {
      // Server-side: return a dummy proxy to prevent crashes during SSR imports
      return new Proxy({}, {
          get: (target, prop) => {
              if (prop === 'sync') return () => ({ on: () => ({ on: () => {} }) }); // Mock sync handler
              return () => Promise.resolve({}); // Mock async methods
          }
      }) as unknown as PouchDB.Database;
  }
  return new PouchDB(name, {
    adapter: 'idb',
    auto_compaction: true,
  });
};

// Singleton instances
export const accountsDB = createDB('accounts');
export const transactionsDB = createDB('transactions');
export const categoriesDB = createDB('categories');
export const creditcardsDB = createDB('creditcards');
export const loansDB = createDB('loans');
export const budgetsDB = createDB('budgets');
export const recurringDB = createDB('recurring'); // New Recurring DB
export const sharedDB = createDB('shared'); // New Shared DB
export const portfolioDB = createDB('portfolio'); // Stock Portfolio DB
export const settingsDB = createDB('settings'); // Household settings (salary cycle, etc.)

// Map for easier access if needed
export const collections = {
  accounts: accountsDB,
  transactions: transactionsDB,
  categories: categoriesDB,
  creditcards: creditcardsDB,
  loans: loansDB,
  budgets: budgetsDB,
  recurring: recurringDB,
  shared: sharedDB,
  portfolio: portfolioDB,
  settings: settingsDB,
};

let initialized = false;

export const initDB = async () => {
  if (typeof window === 'undefined') return;
  if (initialized) return;
  console.log('Initializing PouchDB indexes...');

  try {
    // Transaction indexes
    await transactionsDB.createIndex({
      index: { fields: ['date'] }
    });
    await transactionsDB.createIndex({
      index: { fields: ['accountId'] }
    });
    await transactionsDB.createIndex({
      index: { fields: ['categoryId'] }
    });

    await transactionsDB.createIndex({
      index: { fields: ['householdId', 'date'] }
    });
    
    await transactionsDB.createIndex({
      index: { fields: ['accountId', 'date'] }
    });
    
    // Additional indexes can be added here based on schema.ts needs
    // Account indexes
    await accountsDB.createIndex({
      index: { fields: ['householdId'] }
    });

    // Category indexes
    await categoriesDB.createIndex({
        index: { fields: ['householdId'] }
    });
    await categoriesDB.createIndex({
        index: { fields: ['type'] }
    });

    // CreditCard indexes
    await creditcardsDB.createIndex({
        index: { fields: ['householdId'] }
    });

    // Loans
    await loansDB.createIndex({
        index: { fields: ['householdId'] }
    });

    // Budgets
    await budgetsDB.createIndex({
        index: { fields: ['householdId'] }
    });
     await budgetsDB.createIndex({
        index: { fields: ['budgetMode'] }
    });
     await budgetsDB.createIndex({
        index: { fields: ['status'] }
    });

    // Recurring Transactions
    await recurringDB.createIndex({
        index: { fields: ['householdId'] }
    });
    await recurringDB.createIndex({
        index: { fields: ['nextDueDate'] } // Crucial for "Upcoming" queries
    });
    await recurringDB.createIndex({
        index: { fields: ['status'] }
    });

    // Portfolio (Stock Transactions)
    await portfolioDB.createIndex({
        index: { fields: ['householdId', 'date'] }
    });
    await portfolioDB.createIndex({
        index: { fields: ['symbol', 'date'] }
    });
    await portfolioDB.createIndex({
        index: { fields: ['type', 'date'] }
    });
    await portfolioDB.createIndex({
        index: { fields: ['date'] }
    });
    // Household Settings
    await settingsDB.createIndex({
      index: { fields: ['householdId'] }
    });
    console.log('PouchDB indexes initialized.');
    initialized = true;
  } catch (err) {
    console.error('Failed to initialize indexes:', err);
  }
};
