/**
 * Migration Runner
 * Transfers data from Legacy IDB -> RxDB
 */

import { readLegacyDatabase } from './legacy-db';
import { getDatabase } from './rxdb';
import { v4 as uuidv4 } from 'uuid';

export const MIGRATION_FLAG_KEY = 'migration_v2_complete';

export const runMigration = async () => {
  if (typeof window === 'undefined') return;
  
  // Check if already migrated
  if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') {
    console.log('Migration already completed.');
    return;
  }

  console.log('Starting migration from Dexie to RxDB...');

  try {
    const legacyData = await readLegacyDatabase();
    
    if (!legacyData) {
      console.log('No legacy data found. Skipping migration.');
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return;
    }

    const db = await getDatabase();
    // Helper to bulk insert if collection exists and has data
    const migrateCollection = async (collectionName: string, data: any[]) => {
      if (!data || data.length === 0) return;
      
      // Basic transformation to ensure schema compliance if strictly needed
      // Our schemas are mostly compatible, but dates might be Date objects in Dexie
      // RxDB expects ISO strings
      const cleanedData = data.map(item => {
        const newItem = { ...item };
        // Normalize Date fields
        ['createdAt', 'updatedAt', 'date', 'startDate', 'endDate'].forEach(field => {
             if (newItem[field] && typeof newItem[field] === 'object' && newItem[field] instanceof Date) {
                 newItem[field] = newItem[field].toISOString();
             }
        });
        // Ensure String IDs
        if (typeof newItem.id === 'number') newItem.id = newItem.id.toString();
        
        return newItem;
      });

      try {
          // @ts-ignore
          const collection = db[collectionName];
          if (collection) {
             await collection.bulkInsert(cleanedData);
             console.log(`Migrated ${data.length} items to ${collectionName}`);
          }
      } catch (e) {
          console.error(`Failed to migrate ${collectionName}`, e);
          // Don't fail entire migration, try next table
      }
    };

    await migrateCollection('users', legacyData.users);
    await migrateCollection('households', legacyData.households);
    await migrateCollection('accounts', legacyData.accounts);
    await migrateCollection('categories', legacyData.categories);
    await migrateCollection('transactions', legacyData.transactions);
    await migrateCollection('creditCards', legacyData.creditCards);
    await migrateCollection('loans', legacyData.loans);
    await migrateCollection('budgets', legacyData.budgets);

    console.log('Migration completed successfully.');
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    
  } catch (error) {
    console.error('Migration failed fatal:', error);
  }
};
