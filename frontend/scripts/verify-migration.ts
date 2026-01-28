
import { accountService, transactionService } from '../lib/localdb-services';
import { initDB } from '../lib/pouchdb';

async function main() {
  console.log('Starting migration verification...');

  try {
    await initDB();

    // 1. Create Account
    console.log('\n--- Testing Account Creation ---');
    const accountData = {
      name: 'Test Account',
      type: 'CHECKING',
      balance: 1000,
      currency: 'USD',
      householdId: 'household_1'
    };
    const newAccount = await accountService.create(accountData);
    console.log('Created Account:', newAccount);
    
    if (newAccount.name !== accountData.name || newAccount.balance !== 1000) {
      throw new Error('Account creation failed verification');
    }

    // 2. Create Transaction (Income)
    console.log('\n--- Testing Transaction Creation (Income) ---');
    const txData = {
      amount: 500,
      type: 'INCOME',
      description: 'Salary',
      date: new Date().toISOString(),
      accountId: newAccount.id,
      categoryId: 'cat_1', // assuming exists or ignored
      householdId: 'household_1'
    };
    const newTx = await transactionService.create(txData);
    console.log('Created Transaction:', newTx);

    // 3. Verify Account Balance Update
    console.log('\n--- Verifying Account Balance Update ---');
    const updatedAccount = await accountService.getById(newAccount.id);
    console.log('Updated Account:', updatedAccount);

    if (updatedAccount?.balance !== 1500) {
        throw new Error(`Balance mismatch: Expected 1500, got ${updatedAccount?.balance}`);
    }

    // 4. Fetch All Accounts
    console.log('\n--- Testing GetAll Accounts ---');
    const accounts = await accountService.getAll('household_1');
    console.log(`Found ${accounts.length} accounts`);
    const found = accounts.find(a => a.id === newAccount.id);
    if (!found) throw new Error('New account not found in list');

    console.log('\n✅ Verification Successful!');
  } catch (err) {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  }
}

main();
