/**
 * Example: Transaction List Component (Local-First)
 * 
 * This shows how to use the local database services
 * instead of API calls for data operations
 */

'use client';

import { useState, useEffect } from 'react';
import { transactionService, accountService, categoryService } from '@/lib/localdb-services';
import { formatCurrency } from '@/lib/analytics';
import type { Transaction } from '@/lib/localdb';

export default function TransactionListExample() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [householdId, setHouseholdId] = useState('your-household-id');

  // Load transactions on mount
  useEffect(() => {
    loadTransactions();
  }, [householdId]);

  const loadTransactions = async () => {
    // ✅ Local-first: Direct IndexedDB query (instant, no network)
    const data = await transactionService.getAll(householdId);
    setTransactions(data);
  };

  const handleCreateTransaction = async (transactionData: any) => {
    try {
      // ✅ Local-first: Create in local DB
      const newTransaction = await transactionService.create({
        amount: transactionData.amount,
        type: transactionData.type,
        description: transactionData.description,
        categoryId: transactionData.categoryId,
        accountId: transactionData.accountId,
        householdId,
        date: new Date(),
      });

      // Refresh list
      await loadTransactions();

      alert('Transaction created successfully!');
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('Failed to create transaction');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;

    try {
      // ✅ Local-first: Delete from local DB
      await transactionService.delete(id);

      // Refresh list
      await loadTransactions();

      alert('Transaction deleted');
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      // ✅ Local-first: Update in local DB
      await transactionService.update(id, updates);

      // Refresh list
      await loadTransactions();

      alert('Transaction updated');
    } catch (error) {
      console.error('Failed to update transaction:', error);
      alert('Failed to update transaction');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Transactions (Local-First)</h2>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          💡 All operations are instant and work offline!
        </p>
      </div>

      <div className="space-y-2">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition"
          >
            <div>
              <p className="font-semibold">
                {formatCurrency(transaction.amount)}
              </p>
              <p className="text-sm text-gray-600">
                {transaction.description || 'No description'}
              </p>
              <p className="text-xs text-gray-400">
                {transaction.date.toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleUpdateTransaction(transaction.id, {
                  description: 'Updated description'
                })}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteTransaction(transaction.id)}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {transactions.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No transactions yet
          </p>
        )}
      </div>

      <button
        onClick={() => handleCreateTransaction({
          amount: 100,
          type: 'EXPENSE',
          description: 'Test transaction',
          categoryId: 'some-category-id',
          accountId: 'some-account-id',
        })}
        className="mt-4 w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
      >
        + Add Transaction
      </button>
    </div>
  );
}

/**
 * Example: Analytics Dashboard (Local-First)
 */

import { calculateMonthlyStats, getCashFlowSummary } from '@/lib/analytics';

export function AnalyticsDashboardExample() {
  const [stats, setStats] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const householdId = 'your-household-id';

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    const startDate = new Date(2026, 0, 1); // Jan 1, 2026
    const endDate = new Date(); // Today

    // ✅ Local-first: Calculate analytics locally (instant)
    const [monthlyStats, cashFlowData] = await Promise.all([
      calculateMonthlyStats(householdId, startDate, endDate),
      getCashFlowSummary(householdId, startDate, endDate),
    ]);

    setStats(monthlyStats);
    setCashFlow(cashFlowData);
  };

  if (!stats || !cashFlow) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Analytics (Calculated Locally)</h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Income</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(cashFlow.totalIncome)}
          </p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Expense</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(cashFlow.totalExpense)}
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Savings Rate</p>
          <p className="text-2xl font-bold text-blue-600">
            {cashFlow.savingsRate.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Monthly Breakdown</h3>
        {stats.map((month: any) => (
          <div key={month.month} className="flex justify-between py-2 border-b">
            <span className="text-gray-600">{month.month}</span>
            <div className="text-right">
              <span className="text-green-600 mr-4">
                +{formatCurrency(month.income)}
              </span>
              <span className="text-red-600">
                -{formatCurrency(month.expense)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Key Differences from API-based approach:
 * 
 * ❌ OLD (API-based):
 * - await fetch('/api/transactions')
 * - Loading states needed
 * - Error handling for network issues
 * - Retry logic
 * - Optimistic updates complex
 * - Slow (200-500ms)
 * 
 * ✅ NEW (Local-first):
 * - await transactionService.getAll()
 * - No loading states needed (instant)
 * - Simple error handling
 * - No retry needed
 * - Updates are instant and consistent
 * - Fast (5-20ms)
 */
