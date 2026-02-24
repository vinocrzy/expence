# Stock & ETF Symbols Fetcher

## Overview
Python script to fetch all NSE (National Stock Exchange) stock and ETF symbols with company/fund names and save them as a JSON file for reference.

## Files
- `fetch_stock_symbols.py` - Main script to fetch stock data
- `requirements.txt` - Python dependencies
- `../nse_stocks.json` - Generated output file (507 stocks)

## Usage

### Run the script:
```bash
python scripts/fetch_stock_symbols.py
```

The script will:
1. Fetch F&O stocks from NSE  India API
2. Fetch NIFTY 500 stocks from NSE India API
3. Fetch all ETFs from NSE India API
4. Merge with curated popular stocks and ETFs list
5. Remove duplicates and sort by type (ETF first) then symbol
6. Automatically create `frontend/public/data` directory if needed
7. Save directly to `frontend/public/data/nse_stocks.json`

## Frontend Integration

The generated JSON file is automatically used in the Stock Portfolio module:
- **Location**: `frontend/public/data/nse_stocks.json`
- **Used by**: StockTransactionModal and BulkStockImport components
- **Features**: 823+ symbols available in searchable dropdown with type filtering
- **Type Filter**: Toggle between All, Stocks, and ETFs
- **ETF Badge**: Visual indicator for ETF symbols
- **Fallback**: Hardcoded popular stocks and ETFs if JSON fails to load

## Output Format

```json
{
  "symbols": [
    {
      "symbol": "RELIANCE",
      "name": "Reliance Industries Ltd",
      "exchange": "NSE",
      "type": "STOCK"
    },
    {
      "symbol": "NIFTYBEES",
      "name": "Nippon India ETF Nifty BeES",
      "exchange": "NSE",
      "type": "ETF"
    },
    ...
  ],
  "total": 823,
  "stocks": 507,
  "etfs": 316,
  "generated_at": "2026-02-24 22:23:09",
  "source": "NSE India API + Curated List"
}
```

## Installation

Install dependencies:
```bash
pip install -r scripts/requirements.txt
```

Or install directly:
```bash
pip install requests
```

## Features

- ✅ Fetches live data from NSE India official API
- ✅ Includes F&O stocks (206 stocks)
- ✅ Includes NIFTY 500 stocks (501 stocks)
- ✅ Includes all NSE ETFs (312+ ETFs)
- ✅ Curated list of popular stocks and ETFs as fallback
- ✅ Automatic deduplication
- ✅ Sorted by type (ETF first, then stocks) and symbol
- ✅ UTF-8 encoding for proper company name display
- ✅ Type classification (STOCK vs ETF)
- ✅ Timestamp and source metadata

## Notes

- The script requires internet connection to fetch live data from NSE
- NSE India API may occasionally block requests - the script includes proper headers and fallback
- Generated file includes all major Indian stocks and ETFs across sectors
- Perfect for autocomplete/search functionality in stock portfolio apps
- ETFs are sorted first for easy discovery
