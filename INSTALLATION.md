# 📦 Installation & Setup Instructions

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (for backend backup storage)
- Modern browser (Chrome, Firefox, Safari, Edge)

## 🚀 Step-by-Step Installation

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

This will install all existing dependencies plus:
- `dexie` - IndexedDB wrapper
- `dexie-react-hooks` - React integration

### 2. Update Frontend Layout

Edit `frontend/app/layout.tsx` and wrap the app with `LocalFirstProvider`:

```typescript
import { LocalFirstProvider } from '@/context/LocalFirstContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LocalFirstProvider>
          {children}
        </LocalFirstProvider>
      </body>
    </html>
  );
}
```

### 3. Add Backup Status to Navbar (Optional)

Edit `frontend/components/Navbar.tsx` and add:

```typescript
import BackupStatusIndicator from '@/components/BackupStatusIndicator';

// Add this somewhere in your navbar
<BackupStatusIndicator />
```

### 4. Run Backend Migration

```bash
cd backend
npx prisma migrate dev --name add_user_backups
```

This creates the `user_backups` table for storing encrypted backups.

### 5. Register Backup Routes in Backend

Edit `backend/src/index.ts` and add:

```typescript
import backupRoutes from './routes/backup.routes';

// After registering other routes
fastify.register(backupRoutes);
```

### 6. Environment Variables (Optional)

Add to `frontend/.env.local` if not already set:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 7. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 8. Open App in Browser

Navigate to `http://localhost:3000`

You should see the **Migration Wizard** on first launch.

## 🎯 First Launch Flow

### Option A: Import Existing Data

1. Migration wizard appears
2. Click **"Import Existing Data"**
3. App fetches data from backend
4. Data imported to local IndexedDB
5. Setup complete!

### Option B: Start Fresh

1. Migration wizard appears
2. Click **"Start Fresh"**
3. App creates empty local database
4. Default categories created
5. Setup complete!

## ✅ Verification

### Check Installation Success

1. **Open browser DevTools** (F12)
2. Go to **Application** tab
3. Check **IndexedDB** → `ExpenseTrackerDB`
4. Should see tables: users, households, accounts, etc.

### Test Offline Mode

1. Open app
2. **Disconnect internet** (airplane mode or disable WiFi)
3. Try creating a transaction
4. Should work instantly!
5. Reconnect internet
6. App continues working

### Test Backup

1. Go to **Settings → Backup**
2. Enter encryption password
3. Click **"Backup Now"**
4. Should show success message
5. Check backend database:
   ```sql
   SELECT * FROM user_backups;
   ```

## 🔧 Configuration Options

### Change Database Name

Edit `frontend/lib/localdb.ts`:

```typescript
constructor() {
  super('YourCustomDBName'); // Change here
  // ...
}
```

### Adjust Encryption Strength

Edit `frontend/lib/encryption.ts`:

```typescript
const ITERATIONS = 200000; // Increase for more security (slower)
const KEY_LENGTH = 256; // Keep at 256 for AES-256
```

### Change Backup Endpoint

Edit `frontend/lib/backup.ts`:

```typescript
const DEFAULT_API_URL = 'https://your-api.com'; // Change here
```

## 📱 Production Deployment

### Frontend (Static Host)

Deploy to Netlify, Vercel, or any static host:

```bash
cd frontend
npm run build
npm run export # If using static export
```

Upload `out/` or `.next/` directory.

### Backend (VPS/Cloud)

Deploy backend with PostgreSQL:

```bash
cd backend
docker-compose up -d
```

Or deploy to cloud platform (Heroku, Railway, Fly.io, etc.)

### Environment Variables (Production)

**Frontend:**
```env
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

**Backend:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://your-frontend.com
```

## 🐛 Troubleshooting

### "Database not found"

**Cause**: LocalFirstProvider not wrapping app

**Solution**: Check `layout.tsx` has `<LocalFirstProvider>`

### "Failed to open database"

**Cause**: IndexedDB not supported or disabled

**Solution**: 
1. Use modern browser
2. Check browser settings (IndexedDB enabled)
3. Clear site data and refresh

### Backup fails with 401

**Cause**: Not authenticated or token expired

**Solution**:
1. Re-login to get new token
2. Check token in localStorage: `localStorage.getItem('token')`

### Migration wizard doesn't appear

**Cause**: LocalFirstProvider not active or data already exists

**Solution**:
1. Clear IndexedDB: DevTools → Application → IndexedDB → Delete
2. Refresh page

### "householdId is undefined"

**Cause**: User not properly set up

**Solution**:
1. Check migration completed
2. Run: `await db.users.toArray()` in console
3. Should see user with householdId

### Data lost after clearing browser cache

**Cause**: IndexedDB cleared with cache

**Solution**:
1. Restore from backup
2. **Prevention**: Regular backups + download backup files

## 🧪 Testing Commands

```bash
# Check if Dexie installed
npm list dexie

# Test database in browser console
// Open DevTools console and run:
await db.transactions.count()

# Check backend migration
cd backend
npx prisma migrate status

# Test API endpoint
curl http://localhost:3001/api/backup/latest \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Database Size Monitoring

Check IndexedDB size in browser:

```javascript
// Browser console
navigator.storage.estimate().then(estimate => {
  console.log('Used:', estimate.usage, 'bytes');
  console.log('Quota:', estimate.quota, 'bytes');
  console.log('Percentage:', (estimate.usage / estimate.quota * 100).toFixed(2) + '%');
});
```

## 🔄 Updating from Old Version

If updating from API-based version:

1. **Backup existing data** using old system
2. **Pull new code** with local-first implementation
3. **Install new dependencies**: `npm install`
4. **Run migrations**: `npx prisma migrate dev`
5. **First launch**: Choose "Import Existing Data"
6. **Verify**: Check all data imported correctly
7. **Update components**: Use checklist in MIGRATION_CHECKLIST.md

## 📞 Support

Issues? Check:

1. Browser console for errors
2. IndexedDB in DevTools
3. Backend logs
4. Documentation files
5. GitHub issues

---

**Installation complete! 🎉**

Next: Read [QUICK_START.md](QUICK_START.md) for usage guide.
