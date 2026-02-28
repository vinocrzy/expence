/**
 * Local-First Hooks
 * React hooks wrapping local database services for easy component usage
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  transactionService,
  accountService,
  categoryService,
  creditCardService,
  loanService,
  budgetService,
  sharedDataService,
  householdSettingsService,
  getHouseholdId,
} from '@/lib/localdb-services';
import {
  calculateMonthlyStats,
  calculateCategoryBreakdown,
  type MonthlyStats,
  type CategoryBreakdown,
} from '@/lib/analytics';
import type { 
  Transaction, 
  Account, 
  Category,
  CreditCard,
  Loan,
  Budget,
  HouseholdSettings,
} from '@/lib/db-types';
import { events, EVENTS } from '@/lib/events';

// Helper to get role
const getUserRole = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('household_role') || 'OWNER';
    }
    return 'OWNER';
};

// ============================================
// TRANSACTION HOOKS
// ============================================

// ============================================
// TRANSACTION HOOKS
// ============================================

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    try {
      const householdId = await getHouseholdId();
      const data = await transactionService.getAll(householdId);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    return events.on(EVENTS.TRANSACTIONS_CHANGED, loadTransactions);
  }, [loadTransactions]);

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>) => {
    const transaction = await transactionService.create(data);
    events.emit(EVENTS.TRANSACTIONS_CHANGED);
    events.emit(EVENTS.ACCOUNTS_CHANGED); // Adding transaction might change account balance
    return transaction;
  }, []);

  const updateTransaction = useCallback(async (id: string, data: Partial<Transaction>) => {
    await transactionService.update(id, data);
    events.emit(EVENTS.TRANSACTIONS_CHANGED);
    events.emit(EVENTS.ACCOUNTS_CHANGED);
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await transactionService.delete(id);
    events.emit(EVENTS.TRANSACTIONS_CHANGED);
    events.emit(EVENTS.ACCOUNTS_CHANGED);
  }, []);

  return {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refresh: loadTransactions,
  };
}

// ============================================
// ACCOUNT HOOKS
// ============================================

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    try {
      const householdId = await getHouseholdId();
      const data = await accountService.getAll(householdId);
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    return events.on(EVENTS.ACCOUNTS_CHANGED, loadAccounts);
  }, [loadAccounts]);

  const addAccount = useCallback(async (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>) => {
    const account = await accountService.create(data);
    events.emit(EVENTS.ACCOUNTS_CHANGED);
    return account;
  }, []);

  const updateAccount = useCallback(async (id: string, data: Partial<Account>) => {
    await accountService.update(id, data);
    events.emit(EVENTS.ACCOUNTS_CHANGED);
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    await accountService.delete(id);
    events.emit(EVENTS.ACCOUNTS_CHANGED);
  }, []);

  return {
    accounts,
    loading,
    addAccount,
    updateAccount,
    deleteAccount,
    refresh: loadAccounts,
  };
}

// ============================================
// CATEGORY HOOKS
// ============================================

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const householdId = await getHouseholdId();
      const data = await categoryService.getAll(householdId);
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    return events.on(EVENTS.CATEGORIES_CHANGED, loadCategories);
  }, [loadCategories]);

  const addCategory = useCallback(async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>) => {
    // householdId is handled by the service internally
    const category = await categoryService.create(data);
    events.emit(EVENTS.CATEGORIES_CHANGED);
    return category;
  }, []);

  const updateCategory = useCallback(async (id: string, data: Partial<Category>) => {
    await categoryService.update(id, data);
    events.emit(EVENTS.CATEGORIES_CHANGED);
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await categoryService.delete(id);
    events.emit(EVENTS.CATEGORIES_CHANGED);
  }, []);

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    refresh: loadCategories,
  };
}

// ============================================
// CREDIT CARD HOOKS
// ============================================

export function useCreditCards() {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCreditCards = useCallback(async () => {
    try {
      const householdId = await getHouseholdId();
      const data = await creditCardService.getAll(householdId);
      setCreditCards(data);
    } catch (error) {
      console.error('Failed to load credit cards:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCreditCards();
    return events.on(EVENTS.CREDIT_CARDS_CHANGED, loadCreditCards);
  }, [loadCreditCards]);

  const addCreditCard = useCallback(async (data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>) => {
    // householdId is handled by the service internally
    const creditCard = await creditCardService.create(data);
    events.emit(EVENTS.CREDIT_CARDS_CHANGED);
    return creditCard;
  }, []);

  const updateCreditCard = useCallback(async (id: string, data: Partial<CreditCard>) => {
    await creditCardService.update(id, data);
    events.emit(EVENTS.CREDIT_CARDS_CHANGED);
  }, []);

  const deleteCreditCard = useCallback(async (id: string) => {
    await creditCardService.delete(id);
    events.emit(EVENTS.CREDIT_CARDS_CHANGED);
  }, []);

  return {
    creditCards,
    loading,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    refresh: loadCreditCards,
  };
}

// ============================================
// LOAN HOOKS
// ============================================

export function useLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLoans = useCallback(async () => {
    try {
      const householdId = await getHouseholdId();
      const data = await loanService.getAll(householdId);
      setLoans(data);
    } catch (error) {
      console.error('Failed to load loans:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLoans();
    return events.on(EVENTS.LOANS_CHANGED, loadLoans);
  }, [loadLoans]);

  const addLoan = useCallback(async (data: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>) => {
    // householdId is handled by the service internally
    const loan = await loanService.create(data);
    events.emit(EVENTS.LOANS_CHANGED);
    return loan;
  }, []);

  const updateLoan = useCallback(async (id: string, data: Partial<Loan>) => {
    await loanService.update(id, data);
    events.emit(EVENTS.LOANS_CHANGED);
  }, []);

  const deleteLoan = useCallback(async (id: string) => {
    await loanService.delete(id);
    events.emit(EVENTS.LOANS_CHANGED);
  }, []);

  return {
    loans,
    loading,
    addLoan,
    updateLoan,
    deleteLoan,
    refresh: loadLoans,
  };
}

// ============================================
// BUDGET HOOKS
// ============================================

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBudgets = useCallback(async () => {
    try {
      const householdId = await getHouseholdId();
      const data = await budgetService.getAll(householdId);
      setBudgets(data);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
    return events.on(EVENTS.BUDGETS_CHANGED, loadBudgets);
  }, [loadBudgets]);

  const addBudget = useCallback(async (data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>) => {
    // householdId is handled by the service internally
    const budget = await budgetService.create(data);
    events.emit(EVENTS.BUDGETS_CHANGED);
    return budget;
  }, []);

  const updateBudget = useCallback(async (id: string, data: Partial<Budget>) => {
    await budgetService.update(id, data);
    events.emit(EVENTS.BUDGETS_CHANGED);
  }, []);

  const deleteBudget = useCallback(async (id: string) => {
    await budgetService.delete(id);
    events.emit(EVENTS.BUDGETS_CHANGED);
  }, []);

  return {
    budgets,
    loading,
    addBudget,
    updateBudget,
    deleteBudget,
    refresh: loadBudgets,
  };
}

// ============================================
// ANALYTICS HOOKS
// ============================================

export function useAnalytics(months: number = 12) {
  const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      const householdId = await getHouseholdId();
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Load monthly stats
      const monthly = await calculateMonthlyStats(householdId, startDate, endDate);
      setMonthlyData(monthly);

      // Load category breakdown for the same period
      const categories = await calculateCategoryBreakdown(householdId, startDate, endDate);
      setCategoryData(categories);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    monthlyData,
    categoryData,
    loading,
    refresh: loadAnalytics,
  };
}

// ============================================
// HOUSEHOLD SETTINGS HOOK
// ============================================

/**
 * Provides the current household's salary-cycle settings and an updater.
 * Defaults to `cycleType: 'CALENDAR'` (backward-compatible) when no settings
 * document exists yet.
 */
export function useHouseholdSettings() {
  const [settings, setSettings] = useState<HouseholdSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const householdId = await getHouseholdId();
      const data = await householdSettingsService.get(householdId);
      setSettings(data);
    } catch (error) {
      console.error('Failed to load household settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    return events.on(EVENTS.SETTINGS_CHANGED, loadSettings);
  }, [loadSettings]);

  const updateSettings = useCallback(
    async (patch: Partial<Pick<HouseholdSettings['salaryCycle'], 'cycleType'>>) => {
      const householdId = await getHouseholdId();
      const updated = await householdSettingsService.upsert(householdId, patch);
      setSettings(updated);
      events.emit(EVENTS.SETTINGS_CHANGED);
    },
    [],
  );

  return { settings, loading, updateSettings };
}
