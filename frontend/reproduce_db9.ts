
import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';

addRxPlugin(RxDBDevModePlugin);

(async () => {
  try {
    console.log('Creating database with name "pockettogether"...');
    const db = await createRxDatabase({
      name: 'pockettogether', 
      storage: getRxStorageDexie(),
      multiInstance: true,
      eventReduce: true,
      ignoreDuplicate: true
    });
    console.log('Database created successfully:', db.name);
    await db.remove();
  } catch (error) {
    console.error('Failed to create database:', error);
  }
})();
