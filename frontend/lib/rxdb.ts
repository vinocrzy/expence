import { 
  createRxDatabase, 
  RxDatabase, 
  RxCollection, 
  addRxPlugin,
  RxStorage
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import {
  accountSchema,
  transactionSchema,
  categorySchema,
  creditCardSchema,
  loanSchema,
  budgetSchema,
  AccountDocType,
  TransactionDocType,
  CategoryDocType,
  CreditCardDocType,
  LoanDocType,
  BudgetDocType
} from './schema';

// Add plugins
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBLeaderElectionPlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);

// if (process.env.NODE_ENV === 'development') {
   addRxPlugin(RxDBDevModePlugin);
// }

export type ExpenseDatabaseCollections = {
  accounts: RxCollection<AccountDocType>;
  transactions: RxCollection<TransactionDocType>;
  categories: RxCollection<CategoryDocType>;
  creditcards: RxCollection<CreditCardDocType>;
  loans: RxCollection<LoanDocType>;
  budgets: RxCollection<BudgetDocType>;
};

export type ExpenseDatabase = RxDatabase<ExpenseDatabaseCollections>;

let dbPromise: Promise<ExpenseDatabase> | null = null;

const createDatabase = async (): Promise<ExpenseDatabase> => {
  console.log('Database creating...');
  
  let storage: RxStorage<any, any> = getRxStorageDexie();
  
  // In development (or debugging), wrap storage with validation
  // if (process.env.NODE_ENV === 'development') {
    storage = wrappedValidateAjvStorage({ storage });
  // }
  
  // Create database
  const db = await createRxDatabase<ExpenseDatabaseCollections>({
    name: 'pockettogether',
    storage,
    multiInstance: true,
    eventReduce: true,
    ignoreDuplicate: true
  });

  console.log('Database created, adding collections...');

  // Add collections
  await db.addCollections({
    accounts: { schema: accountSchema },
    transactions: { 
      schema: transactionSchema,
      migrationStrategies: {
        1: function(oldDoc: any) {
          // migration from v0 to v1: ensure categoryId exists
          if (!oldDoc.categoryId) {
            oldDoc.categoryId = 'uncategorized'; 
          }
          return oldDoc;
        }
      }
    },
    categories: { schema: categorySchema },
    creditcards: { schema: creditCardSchema },
    loans: { schema: loanSchema },
    budgets: { schema: budgetSchema },
  });

  console.log('Collections added');
  return db;
};

export const getDatabase = () => {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
};
