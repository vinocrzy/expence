type EventCallback = () => void;
const listeners: Record<string, Set<EventCallback>> = {};

export const events = {
  on(event: string, callback: EventCallback) {
    if (!listeners[event]) listeners[event] = new Set();
    listeners[event].add(callback);
    return () => { listeners[event]?.delete(callback); };
  },
  emit(event: string) {
    listeners[event]?.forEach(cb => cb());
  }
};

export const EVENTS = {
  TRANSACTIONS_CHANGED: 'transactions_changed',
  ACCOUNTS_CHANGED: 'accounts_changed',
  CATEGORIES_CHANGED: 'categories_changed',
  BUDGETS_CHANGED: 'budgets_changed',
  LOANS_CHANGED: 'loans_changed',
  CREDIT_CARDS_CHANGED: 'credit_cards_changed',
  PORTFOLIO_CHANGED: 'portfolio_changed',
  SETTINGS_CHANGED: 'settings_changed',
};
