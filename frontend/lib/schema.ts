import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema
} from 'rxdb';

// ==========================================
// 1. Account Schema
// ==========================================
export const accountSchemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    type: { type: 'string' }, // CHECKING, SAVINGS, etc.
    balance: { type: 'number' },
    currency: { type: 'string' },
    isArchived: { type: 'boolean' },
    householdId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'type', 'currency', 'householdId'],
} as const;

const schemaTyped = toTypedRxJsonSchema(accountSchemaLiteral);
export type AccountDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;
export const accountSchema: RxJsonSchema<AccountDocType> = accountSchemaLiteral;

// ==========================================
// 2. Transaction Schema
// ==========================================
export const transactionSchemaLiteral = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    amount: { type: 'number' },
    type: { type: 'string' }, // INCOME, EXPENSE, TRANSFER
    description: { type: 'string' },
    date: { type: 'string', format: 'date-time', maxLength: 100 },
    categoryId: { type: 'string', maxLength: 100 },
    accountId: { type: 'string', maxLength: 100 },
    householdId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'amount', 'type', 'date', 'accountId', 'householdId', 'categoryId'],
  indexes: ['date', 'accountId', 'categoryId'],
} as const;

const txSchemaTyped = toTypedRxJsonSchema(transactionSchemaLiteral);
export type TransactionDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof txSchemaTyped>;
export const transactionSchema: RxJsonSchema<TransactionDocType> = transactionSchemaLiteral;

// ==========================================
// 3. Category Schema
// ==========================================
export const categorySchemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    type: { type: 'string' }, // INCOME, EXPENSE
    icon: { type: 'string' },
    color: { type: 'string' },
    householdId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'type', 'householdId'],
} as const;

const catSchemaTyped = toTypedRxJsonSchema(categorySchemaLiteral);
export type CategoryDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof catSchemaTyped>;
export const categorySchema: RxJsonSchema<CategoryDocType> = categorySchemaLiteral;

// ==========================================
// 4. Credit Card Schema
// ==========================================
export const creditCardSchemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    bankName: { type: 'string' },
    lastFourDigits: { type: 'string' },
    billingCycle: { type: 'number' },
    paymentDueDay: { type: 'number' },
    creditLimit: { type: 'number' },
    currentOutstanding: { type: 'number' },
    isArchived: { type: 'boolean' },
    householdId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'householdId'],
} as const;

const ccSchemaTyped = toTypedRxJsonSchema(creditCardSchemaLiteral);
export type CreditCardDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof ccSchemaTyped>;
export const creditCardSchema: RxJsonSchema<CreditCardDocType> = creditCardSchemaLiteral;

// ==========================================
// 5. Loan Schema
// ==========================================
export const loanSchemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    lenderName: { type: 'string' },
    principalAmount: { type: 'number' },
    interestRate: { type: 'number' },
    tenure: { type: 'number' },
    startDate: { type: 'string', format: 'date-time' },
    emiAmount: { type: 'number' },
    remainingBalance: { type: 'number' },
    isArchived: { type: 'boolean' },
    householdId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'principalAmount', 'householdId'],
} as const;

const loanSchemaTyped = toTypedRxJsonSchema(loanSchemaLiteral);
export type LoanDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof loanSchemaTyped>;
export const loanSchema: RxJsonSchema<LoanDocType> = loanSchemaLiteral;

// ==========================================
// 6. Budget Schema
// ==========================================
export const budgetSchemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    budgetMode: { type: 'string' },
    period: { type: 'string' },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    totalBudget: { type: 'number' },
    totalSpent: { type: 'number' },
    status: { type: 'string' },
    isArchived: { type: 'boolean' },
    householdId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    planItems: {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                unitAmount: { type: 'number' },
                quantity: { type: 'number' },
                totalAmount: { type: 'number' }
            }
        }
    }
  },
  required: ['id', 'name', 'householdId'],
} as const;

const budgetSchemaTyped = toTypedRxJsonSchema(budgetSchemaLiteral);
export type BudgetDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof budgetSchemaTyped>;
export const budgetSchema: RxJsonSchema<BudgetDocType> = budgetSchemaLiteral;
