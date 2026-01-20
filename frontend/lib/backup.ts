/**
 * Backup and Restore Module
 * Handles exporting local data to backend and restoring from backup
 * Data is encrypted before upload - backend never sees plain data
 */

import { db, getDatabaseStats } from './localdb';
import { encryptData, decryptData } from './encryption';
import type {
  Account,
  Category,
  Transaction,
  CreditCard,
  CreditCardTransaction,
  Loan,
  LoanPayment,
  Budget,
  BudgetPlanItem,
  User,
  Household,
  AppSettings,
} from './localdb';

// Backup data structure
export interface BackupData {
  version: string;
  timestamp: string;
  stats: {
    userCount: number;
    accountCount: number;
    transactionCount: number;
    creditCardCount: number;
    loanCount: number;
    budgetCount: number;
  };
  data: {
    users: User[];
    households: Household[];
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    creditCards: CreditCard[];
    creditCardTransactions: CreditCardTransaction[];
    loans: Loan[];
    loanPayments: LoanPayment[];
    budgets: Budget[];
    budgetPlanItems: BudgetPlanItem[];
    appSettings: AppSettings[];
  };
}

export interface BackupMetadata {
  timestamp: string;
  size: number;
  recordCount: number;
  version: string;
}

/**
 * Export all local data to JSON
 */
export async function exportLocalData(): Promise<BackupData> {
  console.log('📦 Exporting local database...');

  const [
    users,
    households,
    accounts,
    categories,
    transactions,
    creditCards,
    creditCardTransactions,
    loans,
    loanPayments,
    budgets,
    budgetPlanItems,
    appSettings,
  ] = await Promise.all([
    db.users.toArray(),
    db.households.toArray(),
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.creditCards.toArray(),
    db.creditCardTransactions.toArray(),
    db.loans.toArray(),
    db.loanPayments.toArray(),
    db.budgets.toArray(),
    db.budgetPlanItems.toArray(),
    db.appSettings.toArray(),
  ]);

  const stats = await getDatabaseStats();

  const backup: BackupData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats,
    data: {
      users,
      households,
      accounts,
      categories,
      transactions,
      creditCards,
      creditCardTransactions,
      loans,
      loanPayments,
      budgets,
      budgetPlanItems,
      appSettings,
    },
  };

  console.log('✅ Export complete:', stats);
  return backup;
}

/**
 * Import data into local database (overwrites existing data)
 */
export async function importLocalData(backup: BackupData): Promise<void> {
  console.log('📥 Importing backup data...');

  // Clear existing data (atomic transaction)
  await db.transaction('rw', [
    db.users,
    db.households,
    db.accounts,
    db.categories,
    db.transactions,
    db.creditCards,
    db.creditCardTransactions,
    db.loans,
    db.loanPayments,
    db.budgets,
    db.budgetPlanItems,
    db.appSettings
  ], async () => {
      // Clear all tables
      await Promise.all([
        db.users.clear(),
        db.households.clear(),
        db.accounts.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.creditCards.clear(),
        db.creditCardTransactions.clear(),
        db.loans.clear(),
        db.loanPayments.clear(),
        db.budgets.clear(),
        db.budgetPlanItems.clear(),
        db.appSettings.clear(),
      ]);

      // Import new data
      await Promise.all([
        db.users.bulkAdd(backup.data.users),
        db.households.bulkAdd(backup.data.households),
        db.accounts.bulkAdd(backup.data.accounts),
        db.categories.bulkAdd(backup.data.categories),
        db.transactions.bulkAdd(backup.data.transactions),
        db.creditCards.bulkAdd(backup.data.creditCards),
        db.creditCardTransactions.bulkAdd(backup.data.creditCardTransactions),
        db.loans.bulkAdd(backup.data.loans),
        db.loanPayments.bulkAdd(backup.data.loanPayments),
        db.budgets.bulkAdd(backup.data.budgets),
        db.budgetPlanItems.bulkAdd(backup.data.budgetPlanItems),
        db.appSettings.bulkAdd(backup.data.appSettings),
      ]);
    }
  );

  console.log('✅ Import complete:', backup.stats);
}

/**
 * Create encrypted backup and upload to backend
 */
export async function createBackup(
  password: string,
  apiUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
): Promise<{ success: boolean; error?: string; metadata?: BackupMetadata }> {
  try {
    console.log('🔐 Creating encrypted backup...');

    // Export data
    const backupData = await exportLocalData();
    const jsonData = JSON.stringify(backupData);

    // Encrypt
    const encryptedData = await encryptData(jsonData, password);

    // Calculate metadata
    const metadata: BackupMetadata = {
      timestamp: backupData.timestamp,
      size: encryptedData.length,
      recordCount: Object.values(backupData.stats).reduce((sum, count) => sum + count, 0),
      version: backupData.version,
    };

    // Upload to backend
    const response = await fetch(`${apiUrl}/api/backup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth token from localStorage
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        encryptedData,
        metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Backup upload failed: ${error}`);
    }

    // Update app settings
    const user = await db.users.toArray().then(users => users[0]);
    if (user) {
      await db.appSettings.put({
        id: user.id,
        userId: user.id,
        lastBackupTime: new Date(),
        backupStatus: 'success',
        backupError: undefined,
        updatedAt: new Date(),
      });
    }

    console.log('✅ Backup uploaded successfully');
    return { success: true, metadata };
  } catch (error: any) {
    console.error('❌ Backup failed:', error);
    
    // Update app settings with error
    const user = await db.users.toArray().then(users => users[0]);
    if (user) {
      await db.appSettings.put({
        id: user.id,
        userId: user.id,
        lastBackupTime: new Date(),
        backupStatus: 'failed',
        backupError: error.message,
        updatedAt: new Date(),
      });
    }

    return { success: false, error: error.message };
  }
}

/**
 * Download and restore backup from backend
 */
export async function restoreBackup(
  password: string,
  apiUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
): Promise<{ success: boolean; error?: string; metadata?: BackupMetadata }> {
  try {
    console.log('📡 Downloading backup from server...');

    // Download from backend
    const response = await fetch(`${apiUrl}/api/backup/latest`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download backup');
    }

    const { encryptedData, metadata } = await response.json();

    console.log('🔓 Decrypting backup...');
    
    // Decrypt
    const decryptedJson = await decryptData(encryptedData, password);
    const backupData: BackupData = JSON.parse(decryptedJson);

    // Validate backup
    if (!backupData.data || !backupData.version) {
      throw new Error('Invalid backup format');
    }

    console.log('💾 Restoring to local database...');
    
    // Import into local database
    await importLocalData(backupData);

    console.log('✅ Restore complete');
    return { success: true, metadata };
  } catch (error: any) {
    console.error('❌ Restore failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get backup status for UI
 */
export async function getBackupStatus(): Promise<AppSettings | undefined> {
  const user = await db.users.toArray().then(users => users[0]);
  if (!user) return undefined;

  return db.appSettings.get(user.id);
}

/**
 * Check if backup is outdated (> 7 days)
 */
export async function isBackupOutdated(): Promise<boolean> {
  const status = await getBackupStatus();
  if (!status || !status.lastBackupTime) return true;

  const daysSinceBackup = 
    (Date.now() - status.lastBackupTime.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceBackup > 7;
}

/**
 * Get user-friendly backup status message
 */
export async function getBackupStatusMessage(): Promise<string> {
  const status = await getBackupStatus();
  
  if (!status || !status.lastBackupTime) {
    return 'No backup yet - Your data is only on this device';
  }

  const lastBackup = status.lastBackupTime;
  const hoursSince = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60);
  
  if (hoursSince < 1) {
    return 'Backed up just now';
  } else if (hoursSince < 24) {
    const hours = Math.floor(hoursSince);
    return `Last backup: ${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(hoursSince / 24);
    return `Last backup: ${days} day${days > 1 ? 's' : ''} ago`;
  }
}

/**
 * Download backup as a file (for manual storage)
 */
export async function downloadBackupFile(password: string): Promise<void> {
  const backupData = await exportLocalData();
  const jsonData = JSON.stringify(backupData);
  const encryptedData = await encryptData(jsonData, password);

  // Create blob and download
  const blob = new Blob([encryptedData], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expense-backup-${new Date().toISOString().split('T')[0]}.enc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Restore from a manually downloaded backup file
 */
export async function restoreFromFile(file: File, password: string): Promise<void> {
  const encryptedData = await file.text();
  const decryptedJson = await decryptData(encryptedData, password);
  const backupData: BackupData = JSON.parse(decryptedJson);
  await importLocalData(backupData);
}
