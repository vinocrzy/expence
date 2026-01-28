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
  userService,
} from '@/lib/localdb-services';
import {
  calculateMonthlyStats,
  calculateCategoryBreakdown,
  type MonthlyStats,
  type CategoryBreakdown,
} from '@/lib/analytics';
import type { 
  TransactionDocType as Transaction, 
  AccountDocType as Account, 
  CategoryDocType as Category,
  CreditCardDocType as CreditCard,
  LoanDocType as Loan,
  BudgetDocType as Budget,
} from '@/lib/schema';

// Helper to get householdId from local storage or user
async function getHouseholdId(): Promise<string> {
  // userService.getCurrent() is a stub for now, update when Auth is fully integrated
  const user = await userService.getCurrent();
  if (!user?.householdId) {
     return 'household_1'; // Failover for development until Auth is ready
    // throw new Error('No household found. Please complete setup.');
  }
  return user.householdId;
}

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
  }, [loadTransactions]);

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const householdId = await getHouseholdId();
    const transaction = await transactionService.create({ ...data, householdId });
    await loadTransactions();
    return transaction;
  }, [loadTransactions]);

  const updateTransaction = useCallback(async (id: string, data: Partial<Transaction>) => {
    await transactionService.update(id, data);
    await loadTransactions();
  }, [loadTransactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    await transactionService.delete(id);
    await loadTransactions();
  }, [loadTransactions]);

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
  }, [loadAccounts]);

  const addAccount = useCallback(async (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
    const householdId = await getHouseholdId();
    const account = await accountService.create({ ...data, householdId });
    await loadAccounts();
    return account;
  }, [loadAccounts]);

  const updateAccount = useCallback(async (id: string, data: Partial<Account>) => {
    await accountService.update(id, data);
    await loadAccounts();
  }, [loadAccounts]);

  const deleteAccount = useCallback(async (id: string) => {
    await accountService.delete(id);
    await loadAccounts();
  }, [loadAccounts]);

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
  }, [loadCategories]);

  const addCategory = useCallback(async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const householdId = await getHouseholdId();
    const category = await categoryService.create({ ...data, householdId });
    await loadCategories();
    return category;
  }, [loadCategories]);

  const updateCategory = useCallback(async (id: string, data: Partial<Category>) => {
    await categoryService.update(id, data);
    await loadCategories();
  }, [loadCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    await categoryService.delete(id);
    await loadCategories();
  }, [loadCategories]);

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
  }, [loadCreditCards]);

  const addCreditCard = useCallback(async (data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) => {
    const householdId = await getHouseholdId();
    const creditCard = await creditCardService.create({ ...data, householdId });
    await loadCreditCards();
    return creditCard;
  }, [loadCreditCards]);

  const updateCreditCard = useCallback(async (id: string, data: Partial<CreditCard>) => {
    await creditCardService.update(id, data);
    await loadCreditCards();
  }, [loadCreditCards]);

  const deleteCreditCard = useCallback(async (id: string) => {
    await creditCardService.delete(id);
    await loadCreditCards();
  }, [loadCreditCards]);

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
  }, [loadLoans]);

  const addLoan = useCallback(async (data: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => {
    const householdId = await getHouseholdId();
    const loan = await loanService.create({ ...data, householdId });
    await loadLoans();
    return loan;
  }, [loadLoans]);

  const updateLoan = useCallback(async (id: string, data: Partial<Loan>) => {
    await loanService.update(id, data);
    await loadLoans();
  }, [loadLoans]);

  const deleteLoan = useCallback(async (id: string) => {
    await loanService.delete(id);
    await loadLoans();
  }, [loadLoans]);

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
  }, [loadBudgets]);

  const addBudget = useCallback(async (data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
    const householdId = await getHouseholdId();
    const budget = await budgetService.create({ ...data, householdId });
    await loadBudgets();
    return budget;
  }, [loadBudgets]);

  const updateBudget = useCallback(async (id: string, data: Partial<Budget>) => {
    await budgetService.update(id, data);
    await loadBudgets();
  }, [loadBudgets]);

  const deleteBudget = useCallback(async (id: string) => {
    await budgetService.delete(id);
    await loadBudgets();
  }, [loadBudgets]);

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

      // Load current month category breakdown
      const currentMonthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      const categories = await calculateCategoryBreakdown(householdId, currentMonthStart, endDate);
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
