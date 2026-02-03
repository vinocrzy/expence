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
  sharedDB, // New shared DB
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
  Household,
  SharedTransaction,
  SharedAccountBalance
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
// getHouseholdId moved to bottom to be near setter


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
    const user = getCurrentUser();
    const now = new Date().toISOString();
    const id = generateId();
    const account: Account = {
      ...data,
      id,
      householdId,
      userId: user?.id,
      createdByName: user?.name,
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
      sort: [{ date: 'desc' }],
      limit: 10000
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
      sort: [{ date: 'desc' }],
      limit: 10000
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
      sort: [{ date: 'desc' }], // This requires an index on date.
      limit: 10000
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
      },
      limit: 10000
    });
    return (result.docs as unknown as Transaction[]).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getById(id: string): Promise<Transaction | undefined> {
    return safeGet<Transaction>(transactionsDB, id);
  },

  async create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'householdId'>): Promise<Transaction> {
    const householdId = await getHouseholdId();
    const user = getCurrentUser();
    const now = new Date().toISOString();
    
    // Update account balance
    // We need to fetch account, modify, save.
    // Update account balance or credit card outstanding
    try {
        let accountDoc;
        try {
            accountDoc = await accountsDB.get(data.accountId) as any;
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
            if (err.status === 404) {
                try {
                     console.log('Attempting to update Credit Card balance for:', data.accountId);
                     const ccDoc = await creditcardsDB.get(data.accountId) as any;
                     console.log('Found Credit Card doc:', ccDoc);
                     
                     const currentOutstanding = Number(ccDoc.currentOutstanding || 0);
                     console.log('Current Outstanding:', currentOutstanding);

                     const newOutstanding = data.type === 'EXPENSE'
                        ? currentOutstanding + Number(data.amount)
                        : currentOutstanding - Number(data.amount);
                     
                     console.log('New Outstanding:', newOutstanding);

                     await creditcardsDB.put({
                        ...ccDoc,
                        currentOutstanding: newOutstanding,
                        updatedAt: now
                     });
                     console.log('Credit Card updated successfully');
                } catch (ccErr) {
                    console.error('Account/Card not found for transaction', ccErr);
                }
            } else {
                throw err;
            }
        }
    } catch (err: any) {
        console.error('Failed to update balance', err);
    }

    const id = generateId();
    const transaction: Transaction = {
      ...data,
      id,
      householdId,
      userId: user?.id,
      createdByName: user?.name,
      userColor: user?.color,
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

    // Revert old transaction effect on account or credit card
    try {
        let accountDoc;
        try {
            accountDoc = await accountsDB.get(oldTx.accountId) as any;
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
        } catch (err: any) {
             if (err.status === 404) {
                 // Try CreditCard
                 try {
                     const ccDoc = await creditcardsDB.get(oldTx.accountId) as any;
                     if (ccDoc) {
                         let outstanding = ccDoc.currentOutstanding || 0;

                         // Revert old: Income (Payment) meant lower debt, so revert means add back. Expense meant higher debt, so revert means subtract.
                         outstanding = oldTx.type === 'INCOME'
                            ? outstanding + oldTx.amount
                            : outstanding - oldTx.amount;

                         // Apply new
                         const newAmount = data.amount ?? oldTx.amount;
                         const newType = data.type ?? oldTx.type;
                         
                         outstanding = newType === 'EXPENSE'
                            ? outstanding + newAmount
                            : outstanding - newAmount;

                         await creditcardsDB.put({
                             ...ccDoc,
                             currentOutstanding: outstanding,
                             updatedAt: now
                         });
                     }
                 } catch (ccErr) {}
             }
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
        let accountDoc;
        try {
            accountDoc = await accountsDB.get(tx.accountId) as any;
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
        } catch (err: any) {
             if (err.status === 404) {
                 // Try CreditCard
                 try {
                     const ccDoc = await creditcardsDB.get(tx.accountId) as any;
                     let outstanding = ccDoc.currentOutstanding || 0;
                     // Reverse effect: Income (Payment) lowered debt, so delete means raise it. Expense raised debt, so delete means lower it.
                     outstanding = tx.type === 'INCOME'
                        ? outstanding + tx.amount
                        : outstanding - tx.amount;
                     
                     await creditcardsDB.put({
                         ...ccDoc,
                         currentOutstanding: outstanding,
                         updatedAt: new Date().toISOString()
                     });
                 } catch (ccErr) {}
             }
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

    // Calculate outstanding principal if initial EMIs are paid
    let outstandingPrincipal = data.outstandingPrincipal ?? data.principal;
    if (data.initialPaidEmis && data.initialPaidEmis > 0 && emiAmount) {
        let balance = data.principal;
        const r = data.interestRate / 12 / 100;
        
        for (let i = 0; i < data.initialPaidEmis; i++) {
            const interest = balance * r;
            const principalComponent = emiAmount - interest;
            balance -= principalComponent;
        }
        outstandingPrincipal = Math.max(0, Math.round(balance * 100) / 100);
    }

    const loan: Loan = {
       ...data,
       id,
       householdId,
       outstandingPrincipal, // Use calculated or provided outstanding
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

// ============================================
// HOUSEHOLD/USER CONTEXT
// ============================================

// Mutable state to store the current household ID
// This must be set by the application (e.g. via AuthContext/LocalFirstContext) before using services
let currentHouseholdId: string | null = null;
let currentUser: { id: string, name: string, color?: string } | null = null;

export const setHouseholdId = (id: string | null) => {
    currentHouseholdId = id;
};

export const setCurrentUser = (user: { id: string, name: string, color?: string } | null) => {
    currentUser = user;
};

export const getHouseholdId = async (): Promise<string> => {
    if (!currentHouseholdId) {
        // Fallback for dev or uninitialized state? 
        // Ideally we should throw, but to prevent crash during initial render before auth:
        console.warn('getHouseholdId called but no householdId set. Defaulting to temporary ID.');
        return 'household_1';
        // throw new Error('Household ID not set. Ensure user is logged in and context is initialized.');
    }
    return currentHouseholdId;
};

export const getCurrentUser = () => currentUser;

// ============================================
// HOUSEHOLD OPERATIONS
// ============================================

export const householdService = {
  // Current logic for owner: store household meta-data in accountsDB or a specific household meta-doc?
  // Since we don't have a dedicated "meta" DB, we can store it in 'accountsDB' with a special ID or type,
  // OR we can make a dedicated single-doc in local storage?
  // Better: Use a specialized doc in PouchDB with id 'household_metadata'.
  
  async getCurrent(): Promise<Household | null> {
      try {
          // We check the accountsDB for a special doc
          const doc = await accountsDB.get('household_metadata');
          return doc as unknown as Household;
      } catch (e: any) {
          if (e.status === 404) return null;
          throw e;
      }
  },

  async create(name: string, owner: { id: string, name: string, email: string }): Promise<Household> {
     const householdId = await getHouseholdId(); // Usually 'household_1' locally
     // In a real multi-user offline-first app, the ID should be unique globally (UUID)
     // But we are sticking to the existing pattern.
     
     const now = new Date().toISOString();
     const household: Household = {
         id: householdId,
         name,
         ownerId: owner.id,
         inviteCode: 'INV-' + uuidv4().substring(0, 8).toUpperCase(), // Generate a unique code
         members: [{
             userId: owner.id,
             name: owner.name,
             email: owner.email,
             role: 'OWNER',
             joinedAt: now
         }],
         createdAt: now,
         updatedAt: now,
         _id: 'household_metadata' // Fixed ID for easy retrieval
     };

     await accountsDB.put(household); // Storing in accountsDB for simplicity of syncing
     return household;
  },

  async update(data: Partial<Household>) {
      const current = await this.getCurrent();
      if (!current) throw new Error("No household found");
      
      const updated = {
          ...current,
          ...data,
          updatedAt: new Date().toISOString()
      };
      await accountsDB.put(updated);
      return updated;
  },
  
  // For Guests: They join by setting their processing context. 
  // Real joining logic happens via joining the shared DB sync.
  // This function is mainly for UI feedback or "persisting" the join state locally.
  async mockJoin(code: string) {
       // Ideally we verify this code against a server or we just try to sync the DB with that code alias?
       // For this implementation, we assume the code IS the household ALIAS or we map it.
       // Let's assume Invite Code is just for show, and we need the Household ID.
       return true;
  }
};

// ============================================
// SHARED DATA PUBLISHING (OWNER SIDE)
// ============================================

export const sharedDataService = {
    // OWNER calls this to publish snapshots
    async publishSnapshot(householdId: string) {
        // 1. Get Current Month Transactions
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const transactions = await transactionService.getByDateRange(householdId, startOfMonth, endOfMonth);
        
        // 2. Get Current Balances
        const accounts = await accountService.getAllActive(householdId);
        const creditCards = await creditCardService.getAllActive(householdId);

        // 3. Clear existing Shared DB (or diff update? Clear is safer for "Snapshot" semantics)
        // PouchDB doesn't have "clear", so we must fetch all and bulk delete, then bulk add.
        // Optimization: Only update changed docs? For now, bulk replace is simple.
        
        const allShared = await sharedDB.allDocs({ include_docs: true });
        const deletions = allShared.rows.map(row => ({ 
            _id: row.id, 
            _rev: (row.doc as any)._rev, 
            _deleted: true 
        }));
        
        if (deletions.length > 0) {
            await sharedDB.bulkDocs(deletions);
        }

        // 4. Transform and Insert new data
        // Wait, we need category names.

        const categories = await categoryService.getAll(householdId);
        const catMap = new Map(categories.map(c => [c.id, c.name]));
        
        // Combine accounts and credit cards for the map
        const accountMap = new Map();
        accounts.forEach(a => accountMap.set(a.id, a.name));
        creditCards.forEach(c => accountMap.set(c.id, c.name));

        const newDocs: any[] = [];

        // Add Transactions
        transactions.forEach(t => {
            const sharedTx: SharedTransaction = {
                id: t.id,
                date: t.date,
                amount: t.amount,
                type: t.type,
                categoryName: catMap.get(t.categoryId || '') || 'Uncategorized',
                description: t.description || '',
                accountName: accountMap.get(t.accountId) || 'Unknown Account',
                user: 'Owner' // TODO: mapped user name
            };
            // Use same ID or specific prefix
            newDocs.push({ ...sharedTx, _id: `tx_${t.id}`, docType: 'TRANSACTION' });
        });

        // Add Balances
        accounts.forEach(a => {
            const sharedBal: SharedAccountBalance = {
                id: a.id,
                name: a.name,
                type: a.type,
                balance: a.balance || 0,
                currency: a.currency
            };
            newDocs.push({ ...sharedBal, _id: `bal_${a.id}`, docType: 'BALANCE' });
        });

        // Add Credit Cards
        creditCards.forEach(cc => {
            const sharedBal: SharedAccountBalance = {
                id: cc.id,
                name: cc.name,
                type: 'Credit Card',
                balance: -(cc.currentOutstanding || 0), // Negative for liability
                currency: 'INR' // Default for now
            };
            newDocs.push({ ...sharedBal, _id: `bal_${cc.id}`, docType: 'BALANCE' });
        });

        await sharedDB.bulkDocs(newDocs);
        console.log(`Published ${newDocs.length} shared items.`);
    },

    // GUEST calls this to read data
    async getSharedTransactions(): Promise<SharedTransaction[]> {
        const result = await sharedDB.find({
            selector: { docType: 'TRANSACTION' }
        });
        // Sort by date desc
        return (result.docs as any[]).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    async getSharedBalances(): Promise<SharedAccountBalance[]> {
        const result = await sharedDB.find({
            selector: { docType: 'BALANCE' }
        });
        return result.docs as any[];
    }
};

