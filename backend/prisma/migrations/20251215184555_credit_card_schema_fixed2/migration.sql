-- CreateTable
CREATE TABLE "CreditCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "issuer" TEXT,
    "creditLimit" DECIMAL NOT NULL,
    "billingCycleStartDay" INTEGER NOT NULL,
    "dueDays" INTEGER NOT NULL,
    "interestRateMonthly" DECIMAL NOT NULL,
    "minimumDuePercent" DECIMAL NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "CreditCard_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditCardStatement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creditCardId" TEXT NOT NULL,
    "cycleStart" DATETIME NOT NULL,
    "cycleEnd" DATETIME NOT NULL,
    "statementDate" DATETIME NOT NULL,
    "openingBalance" DECIMAL NOT NULL,
    "totalSpends" DECIMAL NOT NULL,
    "totalPayments" DECIMAL NOT NULL,
    "interestCharged" DECIMAL NOT NULL DEFAULT 0,
    "lateFee" DECIMAL NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL NOT NULL,
    "minimumDue" DECIMAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditCardStatement_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditCardPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creditCardId" TEXT NOT NULL,
    "statementId" TEXT,
    "amount" DECIMAL NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "paymentType" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    CONSTRAINT "CreditCardPayment_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CreditCardPayment_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CreditCardStatement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CreditCardPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditCard_accountId_key" ON "CreditCard"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCardPayment_transactionId_key" ON "CreditCardPayment"("transactionId");
