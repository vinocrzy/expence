# Stock Portfolio Module

**Complete offline-first stock portfolio tracking system for Indian Stock Exchange (NSE/BSE)**

---

## 📁 Folder Structure

```
frontend/
├── lib/
│   └── portfolio/
│       ├── types.ts                      # TypeScript type definitions
│       ├── repository.ts                 # PouchDB data layer
│       ├── holdings-calculator.ts        # Pure function: holdings & P&L
│       ├── portfolio-analytics.ts        # Pure function: analytics & insights
│       └── market-sync-service.ts        # Market price sync orchestration
│
├── hooks/
│   └── usePortfolio.ts                   # React hooks for portfolio data
│
└── netlify/
    └── functions/
        └── market-sync.ts                # Scheduled function (RapidAPI)
```

---

## 🏗️ Architecture Overview

### Core Principles

1. **Offline-First**: All data stored in PouchDB, works without internet
2. **Pure Functions**: Business logic in `/lib` is stateless and testable
3. **Serverless**: Market data fetched via Netlify scheduled functions
4. **Efficient API Usage**: Only 2 requests per day (market open & close)

### Data Flow

```
User Input
    ↓
[React Hook] → usePortfolio()
    ↓
[Repository] → PouchDB CRUD operations
    ↓
[Pure Functions] → Holdings Calculator → Analytics Engine
    ↓
[UI Components] ← Derived Data
```

### Market Data Sync Flow

```
Scheduled Function (Netlify)
    ↓
09:20 IST & 15:35 IST (Weekdays)
    ↓
RapidAPI Indian Stock Exchange
    ↓
Returns: { symbol, price, timestamp }
    ↓
Frontend Market Sync Service
    ↓
PouchDB (quotes & snapshots)
    ↓
Auto-refresh UI via events
```

---

## 📦 Core Modules

### 1. **types.ts** - Type Definitions

All TypeScript interfaces and types for the portfolio module.

**Key Types:**

- `StockTransaction` - BUY/SELL transaction records
- `MarketQuote` - Latest cached price per symbol
- `MarketSnapshot` - Historical OPEN/CLOSE prices
- `Holding` - Derived holding with P&L calculations
- `PortfolioSummary` - Aggregated portfolio metrics
- `PortfolioAnalytics` - Advanced analytics (top gainer/loser, diversification, etc.)
- `PortfolioDashboardData` - Dashboard widget data contract

---

### 2. **repository.ts** - PouchDB Data Layer

**Purpose:** All database operations for portfolio module.

**Document Prefixes:**
- `stock_txn_` - Stock transactions
- `quote_` - Latest market quotes
- `market_` - Historical snapshots

**Key Functions:**

```typescript
// Transactions
addStockTransaction(transaction)
updateStockTransaction(transaction)
deleteStockTransaction(id)
getStockTransactionsByHousehold(options)
getUniqueSymbols(householdId?)

// Market Quotes
upsertMarketQuotes(quotes)
getLatestQuotes(symbols?)
getQuote(exchange, symbol)

// Market Snapshots
storeMarketSnapshot(date, session, quotes)
getMarketSnapshots(date, session)
hasTodayCloseSnapshot()
```

**Indexes:**
- `householdId + date`
- `symbol + date`
- `type + date`

---

### 3. **holdings-calculator.ts** - Holdings Engine (Pure Function)

**Purpose:** Calculate holdings, P&L, and portfolio summary from transactions.

**Algorithm:**
- Process transactions chronologically (oldest first)
- BUY: Add units, update weighted average price
- SELL: Reduce units proportionally, maintain avg price
- All units sold → remove holding

**Key Functions:**

```typescript
calculateHoldings(input: HoldingsCalculationInput): HoldingsCalculationResult

// Input:
{
  transactions: StockTransaction[],
  quotes: Record<string, MarketQuote>
}

// Output:
{
  holdings: Holding[],
  summary: PortfolioSummary
}
```

**Validation:**

```typescript
validateTransaction(transaction, existingTransactions?): TransactionValidationError[]

// Checks:
// - Quantity > 0
// - Price > 0
// - Valid date
// - Sufficient units for SELL
```

**Realized P&L:**

```typescript
calculateRealizedPnL(transactions): number
// Returns profit/loss from completed SELL transactions
```

---

### 4. **portfolio-analytics.ts** - Analytics Engine (Pure Function)

**Purpose:** Generate advanced portfolio metrics and insights.

**Key Functions:**

```typescript
calculatePortfolioAnalytics(input: AnalyticsCalculationInput): PortfolioAnalytics

// Calculates:
// - todayPnL (using OPEN vs CLOSE prices)
// - topGainer / topLoser
// - diversification (% per stock)
// - concentrationRisk (if stock > 40%)
```

**Insights Generation:**

```typescript
generatePortfolioInsights(analytics, summary): PortfolioInsight[]

// Returns prioritized insights:
// - Concentration risk warnings
// - Top performer notifications
// - Underperforming stock alerts
// - Overall portfolio health
// - Daily movement alerts
```

**Risk Scoring:**

```typescript
calculateRiskScore(holdings, diversification, concentrationRisk): number
// Returns 0-100 risk score based on:
// - Number of holdings (diversification)
// - Concentration risk
// - Volatility (P&L swings)
```

---

### 5. **market-sync-service.ts** - Market Sync Orchestration

**Purpose:** Coordinate market price synchronization with Netlify function.

**Key Functions:**

```typescript
// Automatic sync (checks if needed)
syncIfNeeded(householdId?)

// Manual sync (force update)
manualSync(householdId?)

// Full sync with logic
syncMarketPrices(householdId?, forceSync?)

// Utility
isMarketOpen(): boolean
getCurrentMarketSession(): 'OPEN' | 'CLOSE' | null
getLastSyncTime(): string | null
arePricesStale(): boolean
getMarketSyncStatus(): MarketSyncStatus
```

**Market Timings (IST):**
- **OPEN:** 09:15 - 09:45 IST
- **CLOSE:** After 15:30 IST

**Sync Logic:**
1. Check if today's CLOSE snapshot exists → skip if yes
2. Get unique symbols from user holdings
3. Call Netlify function
4. Store latest quotes in PouchDB
5. Store OPEN/CLOSE snapshot
6. Handle errors gracefully (market holidays, empty responses)

---

### 6. **usePortfolio.ts** - React Hooks

**Purpose:** Provide portfolio data to React components.

#### Main Hook: `usePortfolio()`

```typescript
const {
  // Data
  holdings,              // Holding[]
  summary,               // PortfolioSummary
  analytics,             // PortfolioAnalytics | null
  dashboardData,         // PortfolioDashboardData
  insights,              // PortfolioInsight[]
  transactions,          // StockTransaction[]
  quotes,                // Record<string, MarketQuote>
  syncStatus,            // MarketSyncStatus
  
  // State
  loading,               // boolean
  error,                 // string | null
  
  // Actions
  addTransaction,        // (data) => Promise<StockTransaction>
  updateTransaction,     // (txn) => Promise<StockTransaction>
  deleteTransaction,     // (id) => Promise<void>
  syncPrices,            // (force?) => Promise<MarketSyncResponse>
  refreshSyncStatus,     // () => Promise<MarketSyncStatus>
  refresh,               // () => Promise<void>
} = usePortfolio();
```

#### Specialized Hooks:

```typescript
// Dashboard widget (lightweight)
usePortfolioDashboard()

// Holdings list only
useHoldings()

// Insights only
usePortfolioInsights()
```

**Event System:**
- Subscribes to `PORTFOLIO_CHANGED` event
- Auto-refreshes on data changes
- Memoized calculations for performance

---

### 7. **market-sync.ts** - Netlify Scheduled Function

**Purpose:** Fetch market prices from RapidAPI.

**Configuration:**

```typescript
export const config = {
  schedule: [
    '50 3 * * 1-5',    // 09:20 IST (Market OPEN)
    '5 10 * * 1-5',    // 15:35 IST (Market CLOSE)
  ],
};
```

**Environment Variables:**

```bash
RAPIDAPI_KEY=your_api_key_here
RAPIDAPI_HOST=indian-stock-exchange-api2.p.rapidapi.com
```

**Request Format:**

```json
POST /.netlify/functions/market-sync
{
  "symbols": [
    { "symbol": "RELIANCE", "exchange": "NSE" },
    { "symbol": "TCS", "exchange": "BSE" }
  ],
  "session": "OPEN" | "CLOSE"
}
```

**Response Format:**

```json
{
  "success": true,
  "quotes": [
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "price": 2450.50,
      "timestamp": "2026-02-24T09:20:00.000Z",
      "change": 12.30,
      "changePercent": 0.50
    }
  ],
  "timestamp": "2026-02-24T09:20:15.000Z",
  "session": "OPEN"
}
```

**Important Notes:**
- Function is **stateless** (no DB access)
- Frontend stores the quotes
- Retry logic: 3 attempts with 2s delay
- 30s timeout per request
- Small delay between symbols (rate limiting)

---

## 🚀 Usage Guide

### Basic Usage in Components

```typescript
'use client';

import { usePortfolio } from '@/hooks/usePortfolio';

export default function PortfolioPage() {
  const {
    holdings,
    summary,
    analytics,
    loading,
    addTransaction,
    syncPrices,
  } = usePortfolio();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Portfolio Summary</h1>
      <p>Total Investment: ₹{summary.totalInvestment.toFixed(2)}</p>
      <p>Current Value: ₹{summary.totalCurrentValue.toFixed(2)}</p>
      <p>P&L: ₹{summary.totalUnrealisedPnL.toFixed(2)} 
         ({summary.totalUnrealisedPnLPercent.toFixed(2)}%)</p>
      
      <button onClick={() => syncPrices(true)}>
        Sync Market Prices
      </button>

      <h2>Holdings</h2>
      {holdings.map(holding => (
        <div key={`${holding.exchange}_${holding.symbol}`}>
          <h3>{holding.symbol} ({holding.exchange})</h3>
          <p>Units: {holding.totalUnits}</p>
          <p>Avg Buy: ₹{holding.avgBuyPrice.toFixed(2)}</p>
          <p>Current: ₹{holding.currentPrice.toFixed(2)}</p>
          <p>P&L: ₹{holding.unrealisedPnL.toFixed(2)} 
             ({holding.unrealisedPnLPercent.toFixed(2)}%)</p>
        </div>
      ))}
    </div>
  );
}
```

### Dashboard Widget

```typescript
import { usePortfolioDashboard } from '@/hooks/usePortfolio';

export function PortfolioDashboardWidget() {
  const { data, loading } = usePortfolioDashboard();

  if (loading) return <Skeleton />;

  return (
    <Card>
      <h3>Portfolio</h3>
      <MetricRow label="Value" value={`₹${data.totalValue}`} />
      <MetricRow 
        label="P&L" 
        value={`₹${data.totalPnL} (${data.totalPnLPercent}%)`}
        color={data.totalPnL >= 0 ? 'green' : 'red'}
      />
      <MetricRow 
        label="Today" 
        value={`${data.todayPnL >= 0 ? '+' : ''}₹${data.todayPnL}`}
      />
      {data.topGainer && (
        <p>Top Gainer: {data.topGainer.symbol} (+{data.topGainer.pnlPercent}%)</p>
      )}
    </Card>
  );
}
```

### Adding a Transaction

```typescript
const { addTransaction } = usePortfolio();

const handleBuy = async () => {
  await addTransaction({
    type: 'BUY',
    symbol: 'RELIANCE',
    exchange: 'NSE',
    quantity: 10,
    price: 2450.50,
    charges: 25.00,
    date: new Date().toISOString(),
    notes: 'Long-term investment',
  });
};
```

---

## 🧪 Edge Cases Handled

### 1. **New Stock Without Market Price**

```typescript
// Fallback to user-entered price or avg buy price
const currentPrice = quote?.price ?? holding.avgBuyPrice;
```

### 2. **Sell All Units**

```typescript
// Holding is removed from the list
if (newTotalUnits <= 0) {
  holdings.delete(key);
}
```

### 3. **No Transactions**

```typescript
// Returns empty state
{
  holdings: [],
  summary: { totalInvestment: 0, ... },
  analytics: null,
}
```

### 4. **Offline Mode**

```typescript
// Uses last cached quotes from PouchDB
// All calculations work offline
```

### 5. **Market Holiday**

```typescript
// Sync returns early with message
if (!isWeekday || isMarketHoliday) {
  return { success: true, quotes: [], message: 'Market closed' };
}
```

### 6. **Sell More Than Available**

```typescript
// Validation prevents this
if (txn.type === 'SELL' && holding.totalUnits < txn.quantity) {
  return { field: 'quantity', message: 'Insufficient units' };
}
```

### 7. **Stale Prices**

```typescript
// Dashboard shows isStale flag
isStale: lastSyncTime > 24 hours ago
```

---

## 🔧 Integration with Existing System

### 1. **PouchDB Integration**

```typescript
// Added to frontend/lib/pouchdb.ts
export const portfolioDB = createDB('portfolio');

// Indexes created in initDB()
await portfolioDB.createIndex({
  index: { fields: ['householdId', 'date'] }
});
```

### 2. **Events System**

```typescript
// Added to frontend/lib/events.ts
PORTFOLIO_CHANGED: 'portfolio_changed'

// Emit on any portfolio data change
events.emit(EVENTS.PORTFOLIO_CHANGED);
```

### 3. **Insights Engine Integration**

```typescript
import { generatePortfolioInsights } from '@/lib/portfolio/portfolio-analytics';

// In existing insights aggregator
const portfolioInsights = generatePortfolioInsights(analytics, summary);

// Merge with other insights
const allInsights = [
  ...budgetInsights,
  ...spendingInsights,
  ...portfolioInsights, // Add here
];
```

---

## 🌐 Deployment Checklist

### 1. **Environment Variables** (Netlify)

```bash
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=indian-stock-exchange-api2.p.rapidapi.com
```

### 2. **Netlify Function Schedule**

- Ensure Netlify Pro plan or higher (for scheduled functions)
- Alternative: Use manual trigger from frontend

### 3. **API Setup**

1. Sign up for RapidAPI
2. Subscribe to Indian Stock Exchange API
3. Verify endpoint URLs and response format
4. Update `market-sync.ts` based on actual API schema

### 4. **Database Initialization**

```typescript
// Ensure initDB() is called on app startup
// Already integrated in existing app initialization
```

---

## 📊 Data Model Details

### PouchDB Document Structure

#### Stock Transaction

```json
{
  "_id": "stock_txn_1708771200000_abc123",
  "_rev": "1-xyz",
  "type": "BUY",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "quantity": 10,
  "price": 2450.50,
  "charges": 25.00,
  "date": "2026-02-24",
  "householdId": "household_123",
  "createdAt": "2026-02-24T09:20:00.000Z",
  "updatedAt": "2026-02-24T09:20:00.000Z"
}
```

#### Market Quote

```json
{
  "_id": "quote_NSE_RELIANCE",
  "_rev": "3-abc",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "price": 2450.50,
  "change": 12.30,
  "changePercent": 0.50,
  "timestamp": "2026-02-24T09:20:00.000Z",
  "lastUpdated": "2026-02-24T09:20:15.000Z"
}
```

#### Market Snapshot

```json
{
  "_id": "market_2026-02-24_OPEN_NSE_RELIANCE",
  "_rev": "1-def",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "date": "2026-02-24",
  "session": "OPEN",
  "price": 2438.20,
  "timestamp": "2026-02-24T09:20:00.000Z"
}
```

---

## 🧩 Testing Guide

### Unit Tests (Pure Functions)

```typescript
import { calculateHoldings } from '@/lib/portfolio/holdings-calculator';

test('calculates holdings correctly', () => {
  const input = {
    transactions: [
      { type: 'BUY', symbol: 'TCS', exchange: 'NSE', quantity: 10, price: 3500, date: '2026-01-01' },
      { type: 'BUY', symbol: 'TCS', exchange: 'NSE', quantity: 5, price: 3600, date: '2026-01-15' },
    ],
    quotes: {
      'NSE_TCS': { price: 3700, symbol: 'TCS', exchange: 'NSE' },
    },
  };

  const result = calculateHoldings(input);
  
  expect(result.holdings[0].totalUnits).toBe(15);
  expect(result.holdings[0].avgBuyPrice).toBeCloseTo(3533.33, 2);
});
```

### Integration Tests (Hooks)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { usePortfolio } from '@/hooks/usePortfolio';

test('loads portfolio data', async () => {
  const { result } = renderHook(() => usePortfolio());

  await waitFor(() => expect(result.current.loading).toBe(false));
  
  expect(result.current.holdings).toBeInstanceOf(Array);
  expect(result.current.summary).toHaveProperty('totalInvestment');
});
```

---

## 🎯 Future Enhancements

1. **Sector Mapping** - Categorize stocks by sector
2. **Dividend Tracking** - Track dividend income
3. **Tax Reports** - Generate capital gains reports
4. **Performance Charts** - Historical performance graphs
5. **Alerts** - Price alerts and notifications
6. **Auto-rebalancing** - Suggest rebalancing actions
7. **Benchmark Comparison** - Compare with NIFTY/SENSEX
8. **Import/Export** - Import from broker statements

---

## 📞 Support & Troubleshooting

### Common Issues

**Q: Prices not updating?**
- Check sync status: `syncStatus.lastSyncTime`
- Verify API key is set in Netlify
- Check browser console for errors

**Q: Holdings calculation incorrect?**
- Ensure transactions are chronological
- Check for duplicate transactions
- Verify quantity and price values

**Q: Dashboard shows stale data?**
- Manual sync: `syncPrices(true)`
- Check if market is open: `isMarketOpen()`

---

## 📄 License & Credits

Part of the Expense Tracking Application
Built with Next.js, PouchDB, and Netlify Functions

---

**Version:** 1.0.0  
**Last Updated:** February 24, 2026  
**Module Status:** Production Ready ✅
