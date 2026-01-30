import { useState, useEffect, useCallback } from 'react';
import { sharedDataService } from '@/lib/localdb-services';
import type { SharedTransaction, SharedAccountBalance } from '@/lib/db-types';

export function useSharedView() {
  const [transactions, setTransactions] = useState<SharedTransaction[]>([]);
  const [accounts, setAccounts] = useState<SharedAccountBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [txs, accs] = await Promise.all([
          sharedDataService.getSharedTransactions(),
          sharedDataService.getSharedBalances()
      ]);
      setTransactions(txs);
      setAccounts(accs);
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
