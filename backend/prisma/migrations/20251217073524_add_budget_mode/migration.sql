-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "budgetMode" TEXT NOT NULL DEFAULT 'CALENDAR',
    "budgetConfig" TEXT
);
INSERT INTO "new_Household" ("createdAt", "id", "inviteCode", "name") SELECT "createdAt", "id", "inviteCode", "name" FROM "Household";
DROP TABLE "Household";
ALTER TABLE "new_Household" RENAME TO "Household";
CREATE UNIQUE INDEX "Household_inviteCode_key" ON "Household"("inviteCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
