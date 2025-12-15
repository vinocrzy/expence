/*
  Warnings:

  - You are about to drop the column `amortizationSchedule` on the `Loan` table. All the data in the column will be lost.
  - You are about to drop the column `borrower` on the `Loan` table. All the data in the column will be lost.
  - You are about to drop the column `outstanding` on the `Loan` table. All the data in the column will be lost.
  - You are about to drop the column `termMonths` on the `Loan` table. All the data in the column will be lost.
  - Added the required column `outstandingPrincipal` to the `Loan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenureMonths` to the `Loan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "LoanEMI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "emiNumber" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "principalComponent" DECIMAL NOT NULL,
    "interestComponent" DECIMAL NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidDate" DATETIME,
    "transactionId" TEXT,
    CONSTRAINT "LoanEMI_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LoanEMI_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoanPrepayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "date" DATETIME NOT NULL,
    "strategy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanPrepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Loan',
    "lender" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PERSONAL',
    "principal" DECIMAL NOT NULL,
    "interestRate" DECIMAL NOT NULL,
    "interestType" TEXT NOT NULL DEFAULT 'REDUCING',
    "startDate" DATETIME NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "emiAmount" DECIMAL NOT NULL,
    "linkedAccountId" TEXT,
    "outstandingPrincipal" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Loan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Loan_linkedAccountId_fkey" FOREIGN KEY ("linkedAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Loan" ("createdAt", "emiAmount", "householdId", "id", "interestRate", "lender", "principal", "startDate") SELECT "createdAt", "emiAmount", "householdId", "id", "interestRate", "lender", "principal", "startDate" FROM "Loan";
DROP TABLE "Loan";
ALTER TABLE "new_Loan" RENAME TO "Loan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LoanEMI_transactionId_key" ON "LoanEMI"("transactionId");
