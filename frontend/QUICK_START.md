# 🚀 Quick Start: Local-First Development

## Testing the Migration

### 1. Start the App
```bash
cd frontend
npm run dev
```

Open http://localhost:3000

### 2. Test Offline Mode
**Chrome DevTools Method:**
1. Press F12 to open DevTools
2. Go to Network tab
3. Check "Offline" checkbox
4. Refresh the page
5. ✅ App should work perfectly!

**Manual Method:**
1. Disconnect from WiFi
2. Refresh the page
3. Try adding transactions, accounts, etc.

### 3. Inspect Local Database
**Chrome/Edge:**
1. F12 → Application tab
2. IndexedDB → expense-tracker-db
3. Explore tables: accounts, transactions, budgets, etc.

**Firefox:**
1. F12 → Storage tab
2. IndexedDB → expense-tracker-db

### 4. Test Backup Flow
1. Add some test data (transactions, accounts)
2. Click backup icon in navbar
3. Click "Create Backup"
4. Enter passphrase (e.g., "test123")
5. Download backup file
6. Clear IndexedDB (DevTools → Application → Clear Storage)
7. Refresh page
8. Click backup icon → "Restore Backup"
9. Upload file and enter passphrase
10. ✅ All data restored!

## Common Development Tasks

### Add New Page
```typescript
'use client';
import { useTransactions, useAccounts } from '@/hooks/useLocalData';

export default function MyPage() {
  const { transactions, loading, addTransaction } = useTransactions();
  const { accounts } = useAccounts();
  
  return (
    <div>
      {/* Your UI */}
    </div>
  );
}
```

### Add New Service Method
```typescript
// In lib/localdb-services.ts

export const transactionService = {
  // ... existing methods
  
  async getByCategory(categoryId: string): Promise<Transaction[]> {
    return db.transactions
      .where('categoryId')
      .equals(categoryId)
      .toArray();
  },
};
```

### Add New Hook
```typescript
// In hooks/useLocalData.ts

export function useTransactionsByCategory(categoryId: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    transactionService.getByCategory(categoryId).then(setTransactions);
  }, [categoryId]);
  
  return { transactions };
}
```

## Troubleshooting

### Issue: "No household found"
**Solution:** The app expects a user with householdId. Check:
```typescript
// In browser console
import { db } from '@/lib/localdb';
const users = await db.users.toArray();
console.log(users);
```

Create test user if needed:
```typescript
import { userService } from '@/lib/localdb-services';
await userService.create({
  email: 'test@example.com',
  name: 'Test User',
  householdId: 'test-household'
});
```

### Issue: Data not persisting
**Check:**
1. Browser isn't in incognito mode
2. IndexedDB not disabled in browser settings
3. Storage quota not exceeded

**Fix:**
```typescript
// Check storage
if (navigator.storage && navigator.storage.estimate) {
  const { usage, quota } = await navigator.storage.estimate();
  console.log(`Using ${usage} of ${quota} bytes`);
}
```

### Issue: TypeScript errors
**Run:**
```bash
npm run build
```

**Check:**
- All imports are correct
- Types match database schema
- No missing properties

### Issue: Hooks not updating
**Remember:**
- Hooks auto-refresh after mutations
- Use `refresh()` to manually reload
- Check React DevTools for state

## Performance Tips

### 1. Use Indexes
```typescript
// In localdb.ts - add indexes for frequent queries
accounts: '++id, householdId, type, [householdId+isArchived]',
```

### 2. Batch Operations
```typescript
// Instead of:
for (const tx of transactions) {
  await transactionService.create(tx);
}

// Do:
await db.transaction('rw', [db.transactions], async () => {
  for (const tx of transactions) {
    await db.transactions.add(tx);
  }
});
```

### 3. Limit Query Results
```typescript
// Get only what you need
const recent = await db.transactions
  .orderBy('date')
  .reverse()
  .limit(100)
  .toArray();
```

## Testing Checklist

Before committing changes:
- [ ] Test in offline mode
- [ ] Check for TypeScript errors (`npm run build`)
- [ ] Test backup/restore with your changes
- [ ] Verify data persists after page refresh
- [ ] Check browser console for errors
- [ ] Test with empty database (first-time user)

## Deployment Checklist

Before deploying:
- [ ] All pages migrated or working
- [ ] No critical TypeScript errors
- [ ] Backup feature tested end-to-end
- [ ] Migration wizard works for existing users
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Backend backup endpoint deployed (if using)

## Environment Variables

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.yourapp.com
NEXT_PUBLIC_ENABLE_EVENT_BUDGETS=true

# Backend
DATABASE_URL=your-database-url
JWT_SECRET=your-jwt-secret
```

## Useful Commands

```bash
# Development
npm run dev

# Build & Check Types
npm run build

# Install dependencies
npm install

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Browser Console Helpers

```javascript
// Get database instance
const { db } = await import('/lib/localdb');

// Check all data
await db.transactions.count(); // Number of transactions
await db.accounts.toArray();   // All accounts
await db.users.toArray();      // All users

// Clear specific table
await db.transactions.clear();

// Clear everything
await db.delete();
await db.open();

// Export data
const backup = await import('/lib/backup');
const data = await backup.createBackup('password');
console.log(data);
```

## VS Code Extensions

Recommended for development:
- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **Pretty TypeScript Errors**
- **Error Lens**
- **Thunder Client** (API testing)

## Resources

- [Dexie.js Docs](https://dexie.org/)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Next.js Docs](https://nextjs.org/docs)

---

Happy coding! 🎉
