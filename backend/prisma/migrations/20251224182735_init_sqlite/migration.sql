-- CreateTable
CREATE TABLE "AnalyticsMonthly" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "income" DECIMAL NOT NULL DEFAULT 0,
    "expense" DECIMAL NOT NULL DEFAULT 0,
    "netSavings" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalyticsMonthly_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalyticsCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalyticsCategory_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalyticsAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "income" DECIMAL NOT NULL DEFAULT 0,
    "expense" DECIMAL NOT NULL DEFAULT 0,
    "transfersIn" DECIMAL NOT NULL DEFAULT 0,
    "transfersOut" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalyticsAccount_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AnalyticsMonthly_householdId_year_month_idx" ON "AnalyticsMonthly"("householdId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsMonthly_householdId_year_month_key" ON "AnalyticsMonthly"("householdId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsCategory_householdId_year_month_categoryId_key" ON "AnalyticsCategory"("householdId", "year", "month", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsAccount_householdId_year_month_accountId_key" ON "AnalyticsAccount"("householdId", "year", "month", "accountId");
