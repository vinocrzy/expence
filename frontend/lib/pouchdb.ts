import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';

PouchDB.plugin(PouchFind);

export const dbRequestTimeout = 60000;

const createDB = (name: string) => {
  return new PouchDB(name, {
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

// Map for easier access if needed
export const collections = {
  accounts: accountsDB,
  transactions: transactionsDB,
  categories: categoriesDB,
  creditcards: creditcardsDB,
  loans: loansDB,
  budgets: budgetsDB,
};

let initialized = false;

export const initDB = async () => {
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

    console.log('PouchDB indexes initialized.');
    initialized = true;
  } catch (err) {
    console.error('Failed to initialize indexes:', err);
  }
};
