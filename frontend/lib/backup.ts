import { collections } from './pouchdb';
import PouchDB from 'pouchdb';

export interface BackupData {
  version: number;
  timestamp: string;
  data: {
    [key: string]: any[];
  };
}

export const exportBackup = async (): Promise<BackupData> => {
  const data: { [key: string]: any[] } = {};

  for (const [name, db] of Object.entries(collections)) {
    try {
      const result = await db.allDocs({
        include_docs: true,
        attachments: true
      });
      // Filter out design documents if any, though PouchDB usually keeps them separate or we might need them.
      // Usually strictly data docs are what we want.
      // We will keep everything that isn't internal if we can.
      // Getting rid of _rev might be good for clean import, but keeping it helps exact restore if we deleted everything.
      // Let's keep the doc as is.
      data[name] = result.rows.map(row => row.doc);
    } catch (error) {
      console.error(`Error exporting database ${name}:`, error);
      throw error;
    }
  }

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    data
  };
};

export const importBackup = async (backup: BackupData): Promise<void> => {
  if (backup.version !== 1) {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }

  for (const [name, docs] of Object.entries(backup.data)) {
    const db = collections[name as keyof typeof collections];
    if (!db) {
      console.warn(`Database ${name} not found in collections, skipping.`);
      continue;
    }

    try {
      // 1. Get current non-deleted docs
      const allDocs = await db.allDocs({ include_docs: false }); 
      const currentRevs = new Map(allDocs.rows.map(r => [r.id, r.value.rev]));
      const backupIds = new Set(docs.map((d: any) => d._id));

      // 2. Prepare Deletions (Docs in DB but not in Backup)
      const toDelete = allDocs.rows
        .filter(row => !row.id.startsWith('_design/') && !backupIds.has(row.id))
        .map(row => ({
          _id: row.id,
          _rev: row.value.rev,
          _deleted: true
        }));
      
      // 3. Prepare Updates/Inserts
      const changes = docs.map((doc: any) => {
         const currentRev = currentRevs.get(doc._id);
         if (currentRev) {
             // Exists in DB: Update with current rev
             return { ...doc, _rev: currentRev };
         } else {
             // New or recently deleted: Try insert as new (strip old rev)
             const { _rev, ...cleanDoc } = doc;
             return cleanDoc;
         }
      });

      // 4. Execute Bulk Upsert
      const batch = [...toDelete, ...changes];
      if (batch.length > 0) {
          const results = await db.bulkDocs(batch);
          
          // 5. Handle Conflicts (Likely trying to insert on top of a deleted doc)
          const conflicts = results.filter((r: any) => r.error && r.name === 'conflict');
          if (conflicts.length > 0) {
              console.log(`Handling ${conflicts.length} conflicts (resurrections) in ${name}...`);
              const conflictIds = conflicts.map((r: any) => r.id);
              
              // Fetch revs including deleted ones
              const conflictState = await db.allDocs({ keys: conflictIds, include_docs: false });
              
              const retryBatch = conflictState.rows
                  .map(row => {
                     // Check if it's a deleted doc we are trying to resurrect
                     if ('error' in row) return null;
                     
                     if (row.value && row.value.rev) {
                         const backupDoc = docs.find((d: any) => d._id === row.id);
                         if (backupDoc) {
                             return { ...backupDoc, _rev: row.value.rev };
                         }
                     }
                     return null;
                  })
                  .filter(Boolean);
              
              if (retryBatch.length > 0) {
                  await db.bulkDocs(retryBatch as any[]);
              }
          }
      }
      
      console.log(`Synced ${batch.length} changes to ${name}`);

    } catch (error) {
      console.error(`Error importing database ${name}:`, error);
      throw error;
    }
  }
};

export const downloadBackup = async () => {
  try {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export failed', err);
    throw err;
  }
};

export const readBackupFile = (file: File): Promise<BackupData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                resolve(json);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
};
