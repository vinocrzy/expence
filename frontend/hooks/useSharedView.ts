import { useState, useEffect, useCallback } from 'react';
import { 
  transactionService, 
  accountService, 
  categoryService, 
  creditCardService,
  getHouseholdId 
} from '@/lib/localdb-services';
import type { SharedTransaction, SharedAccountBalance } from '@/lib/db-types';

export function useSharedView() {
  const [transactions, setTransactions] = useState<SharedTransaction[]>([]);
  const [accounts, setAccounts] = useState<SharedAccountBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const householdId = await getHouseholdId();
      
      const [allTxs, allAccounts, allCategories, allCards] = await Promise.all([
          transactionService.getAll(householdId),
          accountService.getAllActive(householdId),
          categoryService.getAll(householdId),
          creditCardService.getAllActive(householdId)
      ]);

      // Create Lookups
      const catMap = new Map(allCategories.map(c => [c.id, c.name]));
      const accMap = new Map();
      allAccounts.forEach(a => accMap.set(a.id, a.name));
      allCards.forEach(c => accMap.set(c.id, c.name));

      // Map Transactions
      const sharedTxs: SharedTransaction[] = allTxs.map(t => ({
          id: t.id,
          date: t.date,
          amount: t.amount,
          type: t.type,
          categoryName: catMap.get(t.categoryId || '') || 'Uncategorized',
          description: t.description || '',
          accountName: accMap.get(t.accountId) || 'Unknown Account',
          user: t.createdByName || (t.userId ? 'Partner' : 'Shared') // Fallback logic
      }));

      // Map Accounts
      const sharedAccs: SharedAccountBalance[] = allAccounts.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          balance: a.balance || 0,
          currency: a.currency
      }));

      // Map Credit Cards
      const sharedCards: SharedAccountBalance[] = allCards.map(c => ({
          id: c.id,
          name: c.name,
          type: 'Credit Card',
          balance: -(c.currentOutstanding || 0), // Negative for liability
          currency: 'INR'
      }));

      setTransactions(sharedTxs);
      setAccounts([...sharedAccs, ...sharedCards]);

    } catch (error) {
      console.error('Failed to load shared view:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    transactions,
    accounts,
    loading,
    refresh
  };
}
