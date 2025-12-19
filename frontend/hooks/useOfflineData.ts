
import { useState, useEffect, useCallback } from 'react';
import { getDB } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { syncEngine } from '../lib/sync';
import { dataEvents, notifyDataChange } from '../lib/events';

// --- Mutations Hooks (No Data Subscription) ---
export function useTransactionMutations() {
    const addTransaction = async (transaction: any) => {
        const db = await getDB();
        const id = transaction.id || uuidv4();
        
        // Enrich
        const account = await db.get('accounts', transaction.accountId);
        const category = transaction.categoryId ? await db.get('categories', transaction.categoryId) : null;
    
        const newTx = { 
            ...transaction, 
            id, 
            account: account || { name: 'Unknown', currency: '???' }, 
            category: category || null
        };
        
        await db.put('transactions', newTx);
    
        const apiPayload = { ...transaction, id }; 
        await db.put('sync_queue', {
          id: uuidv4(),
          action: 'CREATE',
          table: 'transactions',
          payload: apiPayload,
          createdAt: Date.now(),
          status: 'PENDING'
        });
    
        notifyDataChange('transactions'); // Notify local listeners
        syncEngine.syncNow({ tables: ['transactions', 'accounts'] });
        return newTx;
    };
        
    const updateTransaction = async (transaction: any) => {
        const db = await getDB();
        await db.put('transactions', transaction);
        await db.put('sync_queue', {
            id: uuidv4(),
            action: 'UPDATE',
            table: 'transactions',
            payload: transaction,
            createdAt: Date.now(),
            status: 'PENDING'
        });
        notifyDataChange('transactions');
        syncEngine.syncNow();
    };
        
    const deleteTransaction = async (id: string) => {
        const db = await getDB();
        await db.delete('transactions', id);
        await db.put('sync_queue', {
            id: uuidv4(),
            action: 'DELETE',
            table: 'transactions',
            payload: { id },
             createdAt: Date.now(),
            status: 'PENDING'
        });
        notifyDataChange('transactions');
        syncEngine.syncNow();
    };

    return { addTransaction, updateTransaction, deleteTransaction };
}

export function useCategoryMutations() {
    const addCategory = async (category: any) => {
        const db = await getDB();
        const id = category.id || uuidv4();
        const newCat = { ...category, id };
        
        await db.put('categories', newCat);
        await db.put('sync_queue', {
            id: uuidv4(),
            action: 'CREATE',
            table: 'categories',
            payload: newCat,
            createdAt: Date.now(),
            status: 'PENDING'
        });
        
        notifyDataChange('categories');
        syncEngine.syncNow({ tables: ['categories'] });
        return newCat;
    };
    return { addCategory };
}

// --- Data Hooks (With Subscription) ---

export function useTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addTransaction: addTx, updateTransaction: updateTx, deleteTransaction: deleteTx } = useTransactionMutations(); // Reuse logic optionally, or allow independent use

  const fetchLocal = useCallback(async () => {
    const db = await getDB();
    const txs = await db.getAll('transactions');
    // Sort by date desc
    setTransactions(txs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocal();

    const handleUpdate = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail.table === 'transactions') {
            fetchLocal();
        }
    };

    dataEvents.addEventListener('update', handleUpdate);
    return () => dataEvents.removeEventListener('update', handleUpdate);
  }, [fetchLocal]);

  // Optimistic helpers (wrapping mutations to keep API compatible if needed, 
  // but better to use mutations directly for performance in forms)
  // For list views, we rely on the event listener to refresh data.
  // We can keep 'addTransaction' here for backward compat, but it will rely on the event loop for UI update.
  
  return { transactions, loading, addTransaction: addTx, updateTransaction: updateTx, deleteTransaction: deleteTx, refresh: fetchLocal };
}

export function useCategories(options: { subscribe?: boolean } = { subscribe: true }) {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLocal = useCallback(async () => {
        const db = await getDB();
        const cats = await db.getAll('categories');
        setCategories(cats);
        setLoading(false);
    }, []);

  useEffect(() => {
    fetchLocal();

    if (!options.subscribe) return;

    const handleUpdate = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail.table === 'categories') {
            fetchLocal();
        }
    };
    
    dataEvents.addEventListener('update', handleUpdate);
    return () => dataEvents.removeEventListener('update', handleUpdate);
  }, [fetchLocal, options.subscribe]);
    
    const { addCategory: addCat } = useCategoryMutations();
    
    return { categories, loading, addCategory: addCat, refresh: fetchLocal };
}

export function useAccounts(options: { subscribe?: boolean } = { subscribe: true }) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLocal = useCallback(async () => {
        const db = await getDB();
        const accs = await db.getAll('accounts');
        setAccounts(accs);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchLocal();

        if (!options.subscribe) return;

        const handleUpdate = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail.table === 'accounts') {
                fetchLocal();
            }
        };

        dataEvents.addEventListener('update', handleUpdate);
        return () => dataEvents.removeEventListener('update', handleUpdate);
    }, [fetchLocal, options.subscribe]);

    return { accounts, loading, refresh: fetchLocal };
}
