/**
 * budget-engine.ts
 *
 * Centralised, framework-agnostic helpers for budget & envelope calculations.
 * No React imports – safe to call from pages, hooks, workers, and tests alike.
 *
 * Design principles
 * ─────────────────
 * • Pure functions: all inputs passed explicitly, nothing read from global state.
 * • Non-destructive: never mutates Budget / Transaction objects.
 * • Additive: envelope helpers are layered on top of the standard spent logic;
 *   standard budgets keep working exactly as before.
 */

import type { Budget, Transaction, Category, EnvelopeConfig, EnvelopeState, HouseholdSettings, BudgetCategoryLimit } from './db-types';

// ─────────────────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the last weekday (Mon–Fri) of the given year/month.
 * Walks backwards from the last calendar day until a non-weekend day is found.
 *
 * @param year  Full year, e.g. 2026
 * @param month 0-indexed month (0 = January, 11 = December)
 */
export function getLastWorkingDay(year: number, month: number): Date {
  // Start from the last day of the month
  const date = new Date(year, month + 1, 0); // day 0 of next month = last day of this month
  // Walk back until we hit Mon–Fri (getDay: 0=Sun, 6=Sat)
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }
  return date;
}

/**
 * Computes the salary-cycle window for a given display month.
 *
 * Logic:
 *   salary credited at end of month M-1  →  funds expenses for month M
 *   start = last working day of month M-1  (inclusive)
 *   end   = last working day of month M    minus 1 day  (inclusive)
 *
 * Example:
 *   viewDate = any date in February 2026
 *   start = last working day of January 2026  (e.g. Fri Jan 30)
 *   end   = last working day of February 2026 - 1 day  (Fri Feb 27 → end = Thu Feb 26)
 */
export function getSalaryCycleWindow(viewDate: Date): { start: Date; end: Date } {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth(); // 0-indexed

  // Previous month (handles January → December year-wrap automatically)
  const prevYear = m === 0 ? y - 1 : y;
  const prevMonth = m === 0 ? 11 : m - 1;

  const start = getLastWorkingDay(prevYear, prevMonth);

  // End = last working day of current month − 1 day
  const lastWorkingOfCurrentMonth = getLastWorkingDay(y, m);
  const end = new Date(lastWorkingOfCurrentMonth);
  end.setDate(end.getDate() - 1);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Returns the inclusive [start, end] date window for a budget given an
 * arbitrary reference date (used for RECURRING month navigation).
 *
 * When household settings have `salaryCycle.cycleType === 'SALARY'` and the
 * budget is RECURRING, the window is computed as a salary-cycle period instead
 * of a strict calendar month.  All existing EVENT budgets are unaffected.
 */
export function getBudgetPeriodWindow(
  budget: Budget,
  viewDate: Date = new Date(),
  settings?: HouseholdSettings | null,
): { start: Date; end: Date } {
  let start: Date;
  let end: Date;

  if (budget.budgetMode === 'EVENT' && budget.startDate && budget.endDate) {
    start = new Date(budget.startDate);
    end = new Date(budget.endDate);
  } else if (settings?.salaryCycle?.cycleType === 'SALARY') {
    // Salary-cycle mode: window aligns with pay-cycle, not calendar month
    ({ start, end } = getSalaryCycleWindow(viewDate));
  } else {
    // RECURRING – use the calendar month of viewDate (default / backward-compatible)
    start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY EXPIRY HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns only those BudgetCategoryLimits that are active for the given period.
 *
 * A limit is excluded when `activeUntil` (format: "YYYY-MM") is set AND the
 * period's month is strictly after that value.  Categories without `activeUntil`
 * are always included (permanent recurring categories).
 *
 * Example:
 *   activeUntil = "2026-02"  →  visible in Feb 2026, hidden from Mar 2026 onward.
 *
 * @param limits      The full budgetLimitConfig array
 * @param periodStart The start date of the period being displayed / calculated
 */
export function filterActiveCategories(
  limits: BudgetCategoryLimit[],
  periodStart: Date,
): BudgetCategoryLimit[] {
  const periodYM = `${periodStart.getFullYear()}-${String(
    periodStart.getMonth() + 1,
  ).padStart(2, '0')}`;
  return limits.filter(c => !c.activeUntil || periodYM <= c.activeUntil);
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD BUDGET ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filters transactions that fall within the budget period and belong to the
 * budget's tracked categories (or all EXPENSE transactions if no category
 * config is set).
 */
export function getBudgetExpenses(
  budget: Budget,
  transactions: Transaction[],
  start: Date,
  end: Date,
): Transaction[] {
  const trackedCategoryIds =
    budget.budgetLimitConfig && budget.budgetLimitConfig.length > 0
      ? new Set(
          filterActiveCategories(budget.budgetLimitConfig, start).map(
            (c) => c.categoryId,
          ),
        )
      : null; // null = track all categories

  return transactions.filter((t) => {
    if (t.type !== 'EXPENSE') return false;
    const d = new Date(t.date);
    if (d < start || d > end) return false;
    if (trackedCategoryIds && !trackedCategoryIds.has(t.categoryId ?? '')) return false;
    return true;
  });
}

/**
 * Total amount spent for a budget in the given period.
 * Drop-in replacement for the inline logic duplicated across pages.
 */
export function calculateBudgetSpent(
  budget: Budget,
  transactions: Transaction[],
  start: Date,
  end: Date,
): number {
  return getBudgetExpenses(budget, transactions, start, end).reduce(
    (sum, t) => sum + t.amount,
    0,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENVELOPE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the runtime state for every envelope in a budget.
 *
 * Returns one EnvelopeState per category that appears in either
 * budget.envelopeConfig or the actual expense transactions (so "unplanned"
 * spending is always visible).
 */
export function calculateEnvelopeState(
  budget: Budget,
  transactions: Transaction[],
  categories: Category[],
  start: Date,
  end: Date,
): EnvelopeState[] {
  const envelopeConfig: EnvelopeConfig[] = budget.envelopeConfig ?? [];
  const transfers = budget.envelopeTransfers ?? [];

  // Map categoryId → category meta
  const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  // ── Step 1: initialise state map from envelopeConfig ─────────────────────
  const stateMap = new Map<string, EnvelopeState>();

  for (const cfg of envelopeConfig) {
    const cat = catMap.get(cfg.categoryId);
    // Only apply rolloverAmount if rolloverEnabled is true for this category.
    // Defensive guard: if stale data has rolloverAmount > 0 but rolloverEnabled: false,
    // we must NOT carry that forward — the category opted out of rollover.
    const effectiveRollover =
      cfg.rolloverEnabled ? (cfg.rolloverAmount ?? 0) : 0;

    stateMap.set(cfg.categoryId, {
      categoryId: cfg.categoryId,
      categoryName: cat?.name ?? 'Unknown',
      categoryColor: cat?.color ?? '#64748b',
      categoryIcon: cat?.icon,
      allocated: cfg.allocated,
      spent: 0,
      netTransfer: 0,
      rollover: effectiveRollover,
      available: 0, // computed at end
      rolloverEnabled: cfg.rolloverEnabled ?? false,
      isOverBudget: false,
    });
  }

  // ── Step 2: accumulate spend for in-period EXPENSE transactions ───────────
  const inPeriodExpenses = transactions.filter((t) => {
    if (t.type !== 'EXPENSE') return false;
    const d = new Date(t.date);
    return d >= start && d <= end;
  });

  for (const t of inPeriodExpenses) {
    const catId = t.categoryId ?? 'uncategorized';
    if (!stateMap.has(catId)) {
      // "Unplanned" spending – category not in envelopeConfig
      const cat = catMap.get(catId);
      stateMap.set(catId, {
        categoryId: catId,
        categoryName: cat?.name ?? 'Uncategorized',
        categoryColor: cat?.color ?? '#94a3b8',
        categoryIcon: cat?.icon,
        allocated: 0,
        spent: 0,
        netTransfer: 0,
        rollover: 0,
        available: 0,
        rolloverEnabled: false,
        isOverBudget: false,
      });
    }
    stateMap.get(catId)!.spent += t.amount;
  }

  // ── Step 3: apply envelope-to-envelope transfers ──────────────────────────
  for (const xfer of transfers) {
    // transfers on the budget doc are all applied (not period-filtered) so the
    // record is an immutable ledger. If you want in-period only, filter here.
    if (stateMap.has(xfer.fromCategoryId)) {
      stateMap.get(xfer.fromCategoryId)!.netTransfer -= xfer.amount;
    }
    if (stateMap.has(xfer.toCategoryId)) {
      stateMap.get(xfer.toCategoryId)!.netTransfer += xfer.amount;
    }
  }

  // ── Step 4: compute derived fields ───────────────────────────────────────
  const result: EnvelopeState[] = [];
  for (const state of stateMap.values()) {
    const available =
      state.allocated + state.rollover + state.netTransfer - state.spent;
    result.push({
      ...state,
      available,
      isOverBudget: available < 0,
    });
  }

  // Sort: configured envelopes first (by allocated desc), unplanned last
  result.sort((a, b) => {
    if (a.allocated === 0 && b.allocated > 0) return 1;
    if (b.allocated === 0 && a.allocated > 0) return -1;
    return b.allocated - a.allocated;
  });

  return result;
}

/**
 * Given the runtime envelope states at the END of a period, compute the new
 * EnvelopeConfig array for the NEXT period:
 * - Envelopes with rolloverEnabled = true   → rolloverAmount += max(0, available)
 * - Envelopes with rolloverEnabled = false  → rolloverAmount = 0
 *
 * Allocated amounts & rolloverEnabled flags are copied forward unchanged.
 */
export function applyRollover(
  envelopeConfig: EnvelopeConfig[],
  periodEndState: EnvelopeState[],
): EnvelopeConfig[] {
  const stateByCategory = new Map<string, EnvelopeState>(
    periodEndState.map((s) => [s.categoryId, s]),
  );

  return envelopeConfig.map((cfg) => {
    const state = stateByCategory.get(cfg.categoryId);
    if (!state || !cfg.rolloverEnabled) {
      return { ...cfg, rolloverAmount: 0 };
    }
    const carryOver = Math.max(0, state.available);
    return { ...cfg, rolloverAmount: carryOver };
  });
}

/**
 * Builds the initial EnvelopeConfig array when a user first enables envelope
 * strategy on an existing budget (mirrors budgetLimitConfig with defaults).
 */
export function buildInitialEnvelopeConfig(
  budgetLimitConfig: Budget['budgetLimitConfig'] = [],
): EnvelopeConfig[] {
  return (budgetLimitConfig ?? []).map((limit) => ({
    categoryId: limit.categoryId,
    allocated: limit.amount,
    rolloverEnabled: false,
    rolloverAmount: 0,
  }));
}
