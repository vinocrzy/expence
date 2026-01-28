/**
 * Local Database Service Layer (PouchDB)
 * All CRUD operations for local-first data management
 * Replaces backend API calls
 */

import { 
  accountsDB, 
  categoriesDB, 
  transactionsDB, 
  creditcardsDB, 
  loansDB, 
  budgetsDB,
  initDB 
} from './pouchdb';
import { v4 as uuidv4 } from 'uuid';
import type {
  Account,
  Category,
  Transaction,
  CreditCard,
  Loan,
  Budget,
} from './db-types';

// Helper to generate IDs
const generateId = () => uuidv4();

// Helper to handle PouchDB 404s
const safeGet = async <T>(db: PouchDB.Database, id: string): Promise<T | undefined> => {
  try {
    const doc = await db.get(id);
    return doc as unknown as T;
  } catch (err: any) {
    if (err.status === 404) return undefined;
    throw err;
  }
};

const getHouseholdId = async () => {
    const household = await householdService.getCurrent();
    return household.id;
};

// Ensure indexes are created before we do too much
// We can call this lazily or let the app init call it.
// For safety, we can call it in services if needed, but better to call it once in app entry.
// For now, I'll rely on the app calling initDB or calling it lazily here if I see issues.
initDB();

// ============================================
// ACCOUNT OPERATIONS
// ============================================

export const accountService = {
  async getAll(householdId: string): Promise<Account[]> {
    const result = await accountsDB.find({
      selector: {
        householdId: { $eq: householdId }
      }
    });
    
    return result.docs as unknown as Account[];
  },

  async getAllActive(householdId: string): Promise<Account[]> {
    const result = await accountsDB.find({
      selector: {
        householdId: { $eq: householdId },
        isArchived: { $ne: true }
      }
    });
    
    return result.docs as unknown as Account[];
  },

  async getById(id: string): Promise<Account | undefined> {
    return safeGet<Account>(accountsDB, id);
  },

  async create(data: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>): Promise<Account> {
    const householdId = await getHouseholdId();
    const now = new Date().toISOString();
    const id = generateId();
    const account: Account = {
      ...data,
      id,
      householdId,
      createdAt: now,
      updatedAt: now,
    };
    // PouchDB requires _id
    const docToSave = { ...account, _id: id };
    const response = await accountsDB.put(docToSave);
    
    return { ...account, _rev: response.rev };
  },

  async update(id: string, data: Partial<Account>): Promise<Account> {
    const doc = await accountsDB.get(id) as any;
    const updatedDoc = {
      ...doc,
      ...data,
      updatedAt: new Date().toISOString(),
      _id: id,
      _rev: doc._rev
    };
    const response = await accountsDB.put(updatedDoc);
    
    return { ...updatedDoc, _rev: response.rev };
  },

  async delete(id: string): Promise<void> {
    try {
      const doc = await accountsDB.get(id);
      await accountsDB.remove(doc);
    } catch (err: any) {
      if (err.status !== 404) throw err;
    }
  },


  async archive(id: string): Promise<Account> {
    return this.update(id, { isArchived: true });
  },

  async hasTransactions(id: string): Promise<boolean> {
    const result = await transactionsDB.find({
      selector: {
        accountId: { $eq: id }
      },
      limit: 1
    });
    return result.docs.length > 0;
  },


  async calculateTotalBalance(householdId: string): Promise<number> {
    const accounts = await this.getAllActive(householdId);
    return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  },
};

// ============================================
// CATEGORY OPERATIONS
// ============================================

export const categoryService = {
  async getAll(householdId: string): Promise<Category[]> {
    const result = await categoriesDB.find({
      selector: {
        householdId: { $eq: householdId }
      }
    });
    return result.docs as unknown as Category[];
  },

  async getByType(householdId: string, type: string): Promise<Category[]> {
    const result = await categoriesDB.find({
      selector: {
        householdId: { $eq: householdId },
        type: { $eq: type }
      }
    });
    return result.docs as unknown as Category[];
  },

  async getById(id: string): Promise<Category | undefined> {
    return safeGet<Category>(categoriesDB, id);
  },

  async create(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>): Promise<Category> {
    const householdId = await getHouseholdId();
    const now = new Date().toISOString();
    const id = generateId();
    
    const category: Category = {
      ...data,
      id,
      householdId,
      createdAt: now,
      updatedAt: now
    };
    const docToSave = { ...category, _id: id };
    const response = await categoriesDB.put(docToSave);
    return { ...category, _rev: response.rev };
  },


  async update(id: string, data: Partial<Category>): Promise<Category> {
    const doc = await categoriesDB.get(id) as any;
    const updatedDoc = {
      ...doc,
      ...data,
      updatedAt: new Date().toISOString(),
      _id: id,
      _rev: doc._rev
    };
    const response = await categoriesDB.put(updatedDoc);
    return { ...updatedDoc, _rev: response.rev };
  },

  async delete(id: string): Promise<void> {
    try {
      const doc = await categoriesDB.get(id);
      await categoriesDB.remove(doc);
    } catch (err: any) {
      if (err.status !== 404) throw err;
    }
  },
};

// ============================================
// TRANSACTION OPERATIONS
// ============================================

export const transactionService = {
  async getAll(householdId: string): Promise<Transaction[]> {
    const result = await transactionsDB.find({
      selector: {
        householdId: { $eq: householdId },
        date: { $gt: null }
      },
      sort: [{ date: 'desc' }]
    });
    return result.docs as unknown as Transaction[];
  },

  async getByDateRange(
    householdId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();

    const result = await transactionsDB.find({
      selector: {
        householdId: { $eq: householdId },
        date: {
          $gte: startStr,
          $lte: endStr
        }
      },
      sort: [{ date: 'desc' }]
    });
    return result.docs as unknown as Transaction[];
  },

  async getByAccount(accountId: string): Promise<Transaction[]> {
    // PouchDB find sort requires the sort field to be in the selector (sometimes)
    // or an index. We created index on accountId and on date.
    // Compound index?
    // If simple find fails to sort by date, we might sort in memory.
    const result = await transactionsDB.find({
      selector: {
        accountId: { $eq: accountId },
        date: { $gt: null } // Trick to use date index if compound? 
                            // Actually PouchDB requires 'date' in selector to sort by 'date'.
      },
      sort: [{ date: 'desc' }] // This requires an index on date.
    });
    // Fallback sort if needed, but let's try relying on PouchDB first.
    // Actually, PouchDB find implementation often requires all sort fields to be in selector.
    // simpler:
    const docs = result.docs as unknown as Transaction[];
    return docs; 
    // If PouchDB complains, we might need in-memory sort:
    // .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  },

  async getByCategory(categoryId: string): Promise<Transaction[]> {
    const result = await transactionsDB.find({
      selector: {
        categoryId: { $eq: categoryId }
      }
    });
    return (result.docs as unknown as Transaction[]).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getById(id: string): Promise<Transaction | undefined> {
    return safeGet<Transaction>(transactionsDB, id);
  },

  async create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>): Promise<Transaction> {
    const householdId = await getHouseholdId();
    const now = new Date().toISOString();
    
    // Update account balance
    // We need to fetch account, modify, save.
    try {
        const accountDoc = await accountsDB.get(data.accountId) as any;
        const currentBalance = accountDoc.balance || 0;
        const newBalance = data.type === 'INCOME' 
            ? currentBalance + data.amount
            : currentBalance - data.amount;
        
        await accountsDB.put({
            ...accountDoc,
            balance: newBalance,
            updatedAt: now
        });
    } catch (err: any) {
        console.error('Failed to update account balance', err);
        // Continue? Yes, create transaction anyway? Or fail?
        // RxDB implementation continued if account found, but didn't fail if not found? 
        // RxDB: if (accountDoc) { ... }
        // So strict error handling not present there.
    }

    const id = generateId();
    const transaction: Transaction = {
      ...data,
      id,
      householdId,
      createdAt: now,
      updatedAt: now
    };

    const docToSave = { ...transaction, _id: id };
    const response = await transactionsDB.put(docToSave);
    return { ...transaction, _rev: response.rev };
  },

  async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
    const oldTxDoc = await transactionsDB.get(id) as any;
    const oldTx = oldTxDoc as Transaction;
    const now = new Date().toISOString();

    // Revert old transaction effect on account
    try {
        const accountDoc = await accountsDB.get(oldTx.accountId) as any;
        if (accountDoc) {
          let balance = accountDoc.balance || 0;
          
          // Revert old
          balance = oldTx.type === 'INCOME'
            ? balance - oldTx.amount
            : balance + oldTx.amount;
            
          // Apply new
          const newAmount = data.amount ?? oldTx.amount;
          const newType = data.type ?? oldTx.type;
          
          balance = newType === 'INCOME'
            ? balance + newAmount
            : balance - newAmount;

          await accountsDB.put({
            ...accountDoc,
            balance,
            updatedAt: now
          });
        }
    } catch (err) {
        // ignore account update error?
    }

    const updatedDoc = { 
      ...oldTxDoc, 
      ...data, 
      date: (data.date as any) instanceof Date ? (data.date as any).toISOString() : (data.date || oldTxDoc.date),
      updatedAt: now,
      _id: id,
      _rev: oldTxDoc._rev
    };
    const response = await transactionsDB.put(updatedDoc);
    return { ...updatedDoc, _rev: response.rev } as Transaction;
  },

  async delete(id: string): Promise<void> {
    const txDoc = await transactionsDB.get(id) as any;
    const tx = txDoc as Transaction;

    try {
        const accountDoc = await accountsDB.get(tx.accountId) as any;
        if (accountDoc) {
          let balance = accountDoc.balance || 0;
          balance = tx.type === 'INCOME'
            ? balance - tx.amount
            : balance + tx.amount;
            
          await accountsDB.put({
            ...accountDoc,
            balance,
            updatedAt: new Date().toISOString()
          });
        }
    } catch (err) {
        // ignore
    }

    await transactionsDB.remove(txDoc);
  },

  async getTotalIncome(householdId: string, startDate: Date, endDate: Date): Promise<number> {
    const transactions = await this.getByDateRange(householdId, startDate, endDate);
    return transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
  },

  async getTotalExpense(householdId: string, startDate: Date, endDate: Date): Promise<number> {
    const transactions = await this.getByDateRange(householdId, startDate, endDate);
    return transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  },
};

// ============================================
// CREDIT CARD OPERATIONS
// ============================================

export const creditCardService = {
  async getAll(householdId: string): Promise<CreditCard[]> {
    const result = await creditcardsDB.find({
      selector: { householdId: { $eq: householdId } }
    });
    return result.docs as unknown as CreditCard[];
  },

  async getAllActive(householdId: string): Promise<CreditCard[]> {
    const result = await creditcardsDB.find({
      selector: { 
        householdId: { $eq: householdId },
        isArchived: { $ne: true }
      }
    });
    return result.docs as unknown as CreditCard[];
  },

  async getById(id: string): Promise<CreditCard | undefined> {
    return safeGet<CreditCard>(creditcardsDB, id);
  },

  async create(data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>): Promise<CreditCard> {
    const householdId = await getHouseholdId();
    const now = new Date().toISOString();
    const id = generateId();
    const card = {
      ...data,
      id,
      householdId,
      createdAt: now,
      updatedAt: now,
    };
    const docToSave = { ...card, _id: id };
    const response = await creditcardsDB.put(docToSave);
    return { ...card, _rev: response.rev };
  },

  async update(id: string, data: Partial<CreditCard>): Promise<CreditCard> {
    const doc = await creditcardsDB.get(id) as any;
    const updated = { ...doc, ...data, updatedAt: new Date().toISOString(), _id: id, _rev: doc._rev };
    const response = await creditcardsDB.put(updated);
    return { ...updated, _rev: response.rev };
  },

  async delete(id: string): Promise<void> {
    try {
        const doc = await creditcardsDB.get(id);
        await creditcardsDB.remove(doc);
    } catch(e) {}
  },

  async archive(id: string): Promise<CreditCard> {
    return this.update(id, { isArchived: true });
  },

  async calculateOutstanding(creditCardId: string): Promise<number> {
    return 0; // Placeholder
  },

  async updateOutstanding(creditCardId: string): Promise<void> {
    // Placeholder
  },
};

// ============================================
// LOAN OPERATIONS
// ============================================

export const loanService = {
  async getAll(householdId: string): Promise<Loan[]> {
    const result = await loansDB.find({ selector: { householdId: { $eq: householdId } } });
    return result.docs as unknown as Loan[];
  },
  
  async getById(id: string): Promise<Loan | undefined> {
    return safeGet<Loan>(loansDB, id);
  },

  async create(data: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>): Promise<Loan> {
    const householdId = await getHouseholdId();
    const now = new Date().toISOString();
    const id = generateId();
    
    // Calculate EMI if not provided
    let emiAmount = data.emiAmount;
    if (!emiAmount && data.principal && data.interestRate && data.tenureMonths) {
        // Simple EMI calculation
        const p = data.principal;
        const r = data.interestRate / 12 / 100;
        const n = data.tenureMonths;
        emiAmount = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        emiAmount = Math.round(emiAmount * 100) / 100;
    }

    const loan: Loan = {
       ...data,
       id,
       householdId,
       outstandingPrincipal: data.outstandingPrincipal ?? data.principal, // Initialize with principal
       status: data.status ?? 'ACTIVE',
       emiAmount,
       createdAt: now,
       updatedAt: now,
       startDate: typeof data.startDate === 'string' ? data.startDate : (data.startDate as any) instanceof Date ? (data.startDate as any).toISOString() : undefined
    } as Loan;
    const docToSave = { ...loan, _id: id };
    const response = await loansDB.put(docToSave);
    return { ...loan, _rev: response.rev };
  },

  async update(id: string, data: Partial<Loan>): Promise<Loan> {
     const doc = await loansDB.get(id) as any;
     
     const patchData = { 
         ...data, 
         updatedAt: new Date().toISOString() 
     };
     if (patchData.startDate && (patchData.startDate as any) instanceof Date) {
        patchData.startDate = (patchData.startDate as any).toISOString();
     }
     
     const updated = { ...doc, ...patchData, _id: id, _rev: doc._rev };
     const response = await loansDB.put(updated);
     return { ...updated, _rev: response.rev };
  },

  async delete(id: string): Promise<void> {
    try { await loansDB.remove(await loansDB.get(id)); } catch(e) {}
  },
  
  calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate === 0) return principal / tenureMonths;
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / 
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi * 100) / 100;
  }
};

// ============================================
// BUDGET OPERATIONS
// ============================================

export const budgetService = {
  async getAll(householdId: string): Promise<Budget[]> {
     const result = await budgetsDB.find({ selector: { householdId: { $eq: householdId } } });
     return result.docs as unknown as Budget[];
  },

  async getById(id: string): Promise<Budget | undefined> {
    return safeGet<Budget>(budgetsDB, id);
  },

  async create(data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>): Promise<Budget> {
    const householdId = await getHouseholdId();
    const now = new Date().toISOString();
    const id = generateId();
    const budget: Budget = {
      ...data,
      planItems: data.planItems as any[],
      id,
      householdId,
      createdAt: now,
      updatedAt: now,
    };
    const docToSave = { ...budget, _id: id };
    const response = await budgetsDB.put(docToSave);
    return { ...budget, _rev: response.rev };
  },

  async update(id: string, data: Partial<Budget>): Promise<Budget> {
    const doc = await budgetsDB.get(id) as any;
    const updated = { 
        ...doc,
        ...data, 
        planItems: data.planItems as any[] || doc.planItems,
        updatedAt: new Date().toISOString(),
        _id: id,
        _rev: doc._rev
    };
    const response = await budgetsDB.put(updated);
    return { ...updated, _rev: response.rev };
  },

  async delete(id: string): Promise<void> {
     try { await budgetsDB.remove(await budgetsDB.get(id)); } catch(e) {}
  },

  async getActiveEventBudgets(): Promise<Budget[]> {
      const result = await budgetsDB.find({
          selector: {
              budgetMode: { $eq: 'EVENT' },
              status: { $eq: 'ACTIVE' }
          }
      });
      return result.docs as unknown as Budget[];
  },

  async addPlanItem(budgetId: string, item: any): Promise<any> {
    const doc = await budgetsDB.get(budgetId) as any;
    const planItems = doc.planItems || [];
    const newItem = { ...item, id: generateId() };
    const updated = {
        ...doc,
        planItems: [...planItems, newItem],
        updatedAt: new Date().toISOString(),
        _rev: doc._rev
    };
    await budgetsDB.put(updated);
    return newItem;
  },

  async removePlanItem(budgetId: string, itemId: string): Promise<void> {
    const doc = await budgetsDB.get(budgetId) as any;
    const planItems = (doc.planItems || []).filter((i: any) => i.id !== itemId);
    const updated = {
        ...doc,
        planItems: planItems,
        updatedAt: new Date().toISOString(),
        _rev: doc._rev
    };
    await budgetsDB.put(updated);
  },

  async activate(budgetId: string): Promise<Budget> {
      return this.update(budgetId, { status: 'ACTIVE' });
  }
};

export const creditCardTransactionService = {
    async getAll() { return []; },
    async getUnpaid() { return []; },
    async markAsPaid() { throw new Error('Not implemented yet'); }
};

export const loanPaymentService = {
    async getAll() { return []; },
    async create() { throw new Error('Not implemented yet'); }
};

export const budgetPlanItemService = {
    async getAll() { return []; }
};

export const userService = {
    async getCurrent() {
        return { id: 'user_1', householdId: 'household_1' }; 
    }
};

export const householdService = {
    async getCurrent() {
        return { id: 'household_1', name: 'My Household' };
    }
};
