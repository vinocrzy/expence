# Stock Portfolio Module - Scheduling Guide

This guide explains how to set up automated market data synchronization for the Stock Portfolio module.

## Overview

The portfolio module needs market prices fetched **twice per day**:
- **9:20 AM IST** - Shortly after market opens
- **3:35 PM IST** - Shortly after market closes

You have three options for scheduling:

## Option 1: GitHub Actions (Recommended)

✅ **Best for:** Projects hosted on Vercel, Netlify, or any platform  
✅ **Pros:** Free, reliable, no additional setup  
✅ **Cons:** None

### Setup

1. The workflow file already exists at `.github/workflows/market-sync.yml`

2. Add your app URL as a GitHub secret:
   - Go to your repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `APP_URL`
   - Value: `https://your-app-domain.com` (no trailing slash)

3. Commit and push the workflow file:
   ```bash
   git add .github/workflows/market-sync.yml
   git commit -m "Add market sync workflow"
   git push
   ```

4. The workflow will run automatically at:
   - 3:50 AM UTC (9:20 AM IST) - Monday to Friday
   - 10:05 AM UTC (3:35 PM IST) - Monday to Friday

### Manual Trigger

You can also trigger the workflow manually:
1. Go to GitHub → Actions → Stock Market Sync
2. Click "Run workflow"
3. Select session: AUTO, OPEN, or CLOSE
4. Click "Run workflow"

---

## Option 2: Netlify Scheduled Functions

✅ **Best for:** Projects hosted on Netlify  
✅ **Pros:** Native Netlify integration  
✅ **Cons:** Requires Netlify plugin

### Setup

1. Install the Netlify scheduled functions plugin:
   ```bash
   npm install -D @netlify/plugin-scheduled-functions
   ```

2. Add to `netlify.toml`:
   ```toml
   # Netlify Scheduled Functions Configuration
   [[plugins]]
   package = "@netlify/plugin-scheduled-functions"

   # OPEN session - 9:20 AM IST (3:50 AM UTC)
   [[plugins.inputs.schedule]]
   name = "trigger-market-sync"
   cron = "50 3 * * 1-5"

   # CLOSE session - 3:35 PM IST (10:05 AM UTC)  
   [[plugins.inputs.schedule]]
   name = "trigger-market-sync"
   cron = "5 10 * * 1-5"
   ```

3. Deploy to Netlify:
   ```bash
   git add netlify.toml
   git commit -m "Add market sync scheduling"
   git push
   ```

---

## Option 3: Vercel Cron Jobs

✅ **Best for:** Projects hosted on Vercel (Pro plan required)  
✅ **Pros:** Native Vercel integration  
✅ **Cons:** Requires Vercel Pro plan

### Setup

1. Add to `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/portfolio/market-sync",
         "schedule": "50 3 * * 1-5"
       },
       {
         "path": "/api/portfolio/market-sync",
         "schedule": "5 10 * * 1-5"
       }
     ]
   }
   ```

2. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

---

## Timezone Reference

Indian Stock Exchange operates in IST (UTC+5:30):

| IST Time | UTC Time | Session |
|----------|----------|---------|
| 9:20 AM  | 3:50 AM  | OPEN    |
| 3:35 PM  | 10:05 AM | CLOSE   |

---

## Testing

### Manual Testing via Test Page

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/test-portfolio`

3. Use the buttons to trigger sync manually:
   - **Trigger OPEN Session** - Fetches opening prices
   - **Trigger CLOSE Session** - Fetches closing prices
   - **Trigger Auto Session** - Auto-detects based on current time
   - **Fetch Cached Data** - Retrieves last cached prices
   - **View Debug Storage** - Inspects server storage (dev only)

### Manual Testing via API

```bash
# Trigger OPEN session sync
curl -X POST http://localhost:3000/api/portfolio/market-sync \
  -H "Content-Type: application/json" \
  -d '{"session": "OPEN"}'

# Trigger CLOSE session sync
curl -X POST http://localhost:3000/api/portfolio/market-sync \
  -H "Content-Type: application/json" \
  -d '{"session": "CLOSE"}'

# Fetch cached data for specific symbols
curl "http://localhost:3000/api/portfolio/market-data?symbols=RELIANCE,TCS,INFY"

# View debug storage (dev only)
curl http://localhost:3000/api/portfolio/debug-storage
```

---

## Environment Variables

Required for **production** only (development uses mock data):

```bash
# RapidAPI Credentials
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=latest-stock-price.p.rapidapi.com

# Comma-separated list of default symbols (optional)
ACTIVE_SYMBOLS=RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK
```

Get your API key from: https://rapidapi.com/suneetk92/api/latest-stock-price

---

## Monitoring

### GitHub Actions

- View logs: GitHub → Actions → Stock Market Sync
- Each run shows HTTP status and response data
- Failed runs will be marked with ❌

### Netlify

- View logs: Netlify Dashboard → Functions → trigger-market-sync
- Check execution logs for each scheduled run

### Vercel

- View logs: Vercel Dashboard → Functions → market-sync
- Monitor cron execution in the Cron Jobs tab

---

## Troubleshooting

### Sync Not Running

1. **Check timezone:** Ensure your cron expression matches IST → UTC conversion
2. **Check logs:** View platform logs for error messages
3. **Verify secrets:** Ensure `APP_URL` (GitHub) or environment variables are set
4. **Test manually:** Use the test page to verify API routes work

### Mock Data in Production

If you see mock data in production:
1. Set `RAPIDAPI_KEY` and `RAPIDAPI_HOST` environment variables
2. Redeploy your application
3. Trigger a manual sync

### Stale Prices

If prices aren't updating:
1. Check that scheduled functions are running (view logs)
2. Verify RapidAPI quota hasn't been exceeded
3. Check for API errors in server logs
4. Manually trigger sync via test page

---

## Cost Optimization

The free RapidAPI tier allows **2 API calls per day**, which is perfect for our use case:
- 1 call at 9:20 AM IST (OPEN)
- 1 call at 3:35 PM IST (CLOSE)

**Important:** Don't increase sync frequency beyond 2 times per day unless you upgrade to a paid plan.

---

## Architecture

```
┌─────────────────────┐
│  GitHub Actions /   │
│  Netlify Scheduler  │ (Triggers at 9:20 AM & 3:35 PM IST)
└──────────┬──────────┘
           │ POST
           ▼
┌─────────────────────────────────────┐
│  Next.js API Route                  │
│  /api/portfolio/market-sync         │
│  - Fetches from RapidAPI            │
│  - Saves to .data/market/latest.json│
└──────────┬──────────────────────────┘
           │ When user opens app
           ▼
┌─────────────────────────────────────┐
│  Frontend                           │
│  - Calls GET /api/portfolio/market-data│
│  - Stores quotes in PouchDB         │
│  - Calculates holdings with pure fns│
└─────────────────────────────────────┘
```

---

## Next Steps

1. Choose a scheduling option (GitHub Actions recommended)
2. Follow the setup instructions above
3. Test using the `/test-portfolio` page
4. Monitor the first scheduled run
5. Verify data appears in your portfolio

**Questions?** Check the main portfolio documentation in `STOCK_PORTFOLIO_MODULE.md`
