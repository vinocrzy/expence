/**
 * Migration Utility - One-time data import from backend
 * Runs on first launch to migrate existing data from backend to local storage
 */

'use client';

import { db } from './localdb';
import { 
  userService, 
  householdService, 
  accountService,
  categoryService,
  transactionService,
  creditCardService,
  loanService,
  budgetService,
} from './localdb-services';

export interface MigrationStatus {
  isComplete: boolean;
  hasMigrated: boolean;
  error?: string;
  stats?: {
    users: number;
    accounts: number;
    transactions: number;
    categories: number;
    creditCards: number;
    loans: number;
    budgets: number;
  };
}

/**
 * Check if migration has been completed
 */
export async function checkMigrationStatus(): Promise<MigrationStatus> {
  try {
    const userCount = await db.users.count();
    
    if (userCount === 0) {
      // No data - needs migration
      return {
        isComplete: false,
        hasMigrated: false,
      };
    }

    // Has data - migration complete
    const stats = {
      users: await db.users.count(),
      accounts: await db.accounts.count(),
      transactions: await db.transactions.count(),
      categories: await db.categories.count(),
      creditCards: await db.creditCards.count(),
      loans: await db.loans.count(),
      budgets: await db.budgets.count(),
    };

    return {
      isComplete: true,
      hasMigrated: true,
      stats,
    };
  } catch (error: any) {
    return {
      isComplete: false,
      hasMigrated: false,
      error: error.message,
    };
  }
}

/**
 * Migrate data from backend API to local storage
 */
export async function migrateFromBackend(
  apiUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
): Promise<MigrationStatus> {
  console.log('🔄 Starting migration from backend...');

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated. Please login first.');
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Fetch all data from backend
    console.log('📡 Fetching data from backend...');
    
    const [
      userResponse,
      householdResponse,
      accountsResponse,
      categoriesResponse,
      transactionsResponse,
      creditCardsResponse,
      loansResponse,
      budgetsResponse,
    ] = await Promise.all([
      fetch(`${apiUrl}/api/auth/me`, { headers }),
      fetch(`${apiUrl}/api/household`, { headers }),
      fetch(`${apiUrl}/api/accounts`, { headers }),
      fetch(`${apiUrl}/api/categories`, { headers }),
      fetch(`${apiUrl}/api/transactions?limit=10000`, { headers }),
      fetch(`${apiUrl}/api/credit-cards`, { headers }),
      fetch(`${apiUrl}/api/loans`, { headers }),
      fetch(`${apiUrl}/api/budgets`, { headers }),
    ]);

    // Check responses
    if (!userResponse.ok) throw new Error('Failed to fetch user data');
    if (!householdResponse.ok) throw new Error('Failed to fetch household data');

    // Parse data
    const userData = await userResponse.json();
    const householdData = await householdResponse.json();
    const accountsData = accountsResponse.ok ? await accountsResponse.json() : [];
    const categoriesData = categoriesResponse.ok ? await categoriesResponse.json() : [];
    const transactionsData = transactionsResponse.ok ? await transactionsResponse.json() : { transactions: [] };
    const creditCardsData = creditCardsResponse.ok ? await creditCardsResponse.json() : [];
    const loansData = loansResponse.ok ? await loansResponse.json() : [];
    const budgetsData = budgetsResponse.ok ? await budgetsResponse.json() : [];

    console.log('💾 Importing to local database...');

    // Clear existing data (fresh start)
    await db.transaction('rw', [
      db.users,
      db.households,
      db.accounts,
      db.categories,
      db.transactions,
      db.creditCards,
      db.loans,
      db.budgets
    ], async () => {
        await db.users.clear();
        await db.households.clear();
        await db.accounts.clear();
        await db.categories.clear();
        await db.transactions.clear();
        await db.creditCards.clear();
        await db.loans.clear();
        await db.budgets.clear();

        // Import user
        if (userData) {
          await db.users.add({
            ...userData,
            createdAt: new Date(userData.createdAt),
            updatedAt: new Date(userData.updatedAt),
          });
        }

        // Import household
        if (householdData) {
          await db.households.add({
            ...householdData,
            createdAt: new Date(householdData.createdAt),
            updatedAt: new Date(householdData.updatedAt),
          });
        }

        // Import accounts
        if (accountsData.length > 0) {
          await db.accounts.bulkAdd(accountsData.map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt),
            updatedAt: new Date(a.updatedAt),
          })));
        }

        // Import categories
        if (categoriesData.length > 0) {
          await db.categories.bulkAdd(categoriesData.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
          })));
        }

        // Import transactions
        const transactions = transactionsData.transactions || transactionsData;
        if (transactions.length > 0) {
          await db.transactions.bulkAdd(transactions.map((t: any) => ({
            ...t,
            date: new Date(t.date),
            createdAt: new Date(t.createdAt),
            updatedAt: new Date(t.updatedAt),
          })));
        }

        // Import credit cards
        if (creditCardsData.length > 0) {
          await db.creditCards.bulkAdd(creditCardsData.map((cc: any) => ({
            ...cc,
            createdAt: new Date(cc.createdAt),
            updatedAt: new Date(cc.updatedAt),
          })));
        }

        // Import loans
        if (loansData.length > 0) {
          await db.loans.bulkAdd(loansData.map((l: any) => ({
            ...l,
            startDate: new Date(l.startDate),
            createdAt: new Date(l.createdAt),
            updatedAt: new Date(l.updatedAt),
          })));
        }

        // Import budgets
        if (budgetsData.length > 0) {
          await db.budgets.bulkAdd(budgetsData.map((b: any) => ({
            ...b,
            startDate: new Date(b.startDate),
            endDate: b.endDate ? new Date(b.endDate) : undefined,
            createdAt: new Date(b.createdAt),
            updatedAt: new Date(b.updatedAt),
          })));
        }
      }
    );

    // Get final stats
    const stats = {
      users: await db.users.count(),
      accounts: await db.accounts.count(),
      transactions: await db.transactions.count(),
      categories: await db.categories.count(),
      creditCards: await db.creditCards.count(),
      loans: await db.loans.count(),
      budgets: await db.budgets.count(),
    };

    console.log('✅ Migration complete:', stats);

    return {
      isComplete: true,
      hasMigrated: true,
      stats,
    };
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return {
      isComplete: false,
      hasMigrated: false,
      error: error.message,
    };
  }
}

/**
 * Skip migration (for new users)
 */
export async function skipMigration(): Promise<void> {
  console.log('⏭️ Skipping migration - starting fresh');
  
  // Create default user and household
  const user = await userService.create({
    email: 'local@user.com',
    name: 'Local User',
  });

  const household = await householdService.create({
    name: 'My Household',
    inviteCode: generateInviteCode(),
    defaultCurrency: 'INR',
  });

  // Link user to household
  await userService.update(user.id, { householdId: household.id });

  // Create default categories
  const defaultCategories = [
    { name: 'Food & Dining', type: 'EXPENSE', icon: '🍔' },
    { name: 'Transportation', type: 'EXPENSE', icon: '🚗' },
    { name: 'Shopping', type: 'EXPENSE', icon: '🛍️' },
    { name: 'Entertainment', type: 'EXPENSE', icon: '🎬' },
    { name: 'Bills & Utilities', type: 'EXPENSE', icon: '💡' },
    { name: 'Salary', type: 'INCOME', icon: '💰' },
    { name: 'Business', type: 'INCOME', icon: '💼' },
    { name: 'Investments', type: 'INCOME', icon: '📈' },
  ];

  for (const cat of defaultCategories) {
    await categoryService.create({
      ...cat,
      householdId: household.id,
    });
  }

  console.log('✅ Initial setup complete');
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
