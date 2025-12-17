-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CreditCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "issuer" TEXT,
    "creditLimit" DECIMAL NOT NULL,
    "billingCycleStartDay" INTEGER NOT NULL,
    "dueDays" INTEGER NOT NULL,
    "interestRateMonthly" DECIMAL NOT NULL,
    "minimumDuePercent" DECIMAL NOT NULL DEFAULT 5,
    "outstandingAmount" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "CreditCard_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CreditCard" ("accountId", "billingCycleStartDay", "creditLimit", "dueDays", "id", "interestRateMonthly", "issuer", "minimumDuePercent", "status") SELECT "accountId", "billingCycleStartDay", "creditLimit", "dueDays", "id", "interestRateMonthly", "issuer", "minimumDuePercent", "status" FROM "CreditCard";
DROP TABLE "CreditCard";
ALTER TABLE "new_CreditCard" RENAME TO "CreditCard";
CREATE UNIQUE INDEX "CreditCard_accountId_key" ON "CreditCard"("accountId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
