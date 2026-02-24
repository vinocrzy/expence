#!/usr/bin/env python3
"""
Fetch all NSE stock symbols and names and save as JSON file.
This script fetches equity stock list from NSE India's official API.
"""

import json
import requests
from typing import List, Dict
import time
import os
from pathlib import Path

def fetch_nse_stocks() -> List[Dict[str, str]]:
    """
    Fetch all NSE equity stocks from NSE India API.
    Returns list of dicts with symbol and name.
    """
    print("Fetching NSE stock list...")
    
    # NSE India requires proper headers to avoid 403 errors
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/',
    }
    
    # NSE API endpoint for equity stock list
    url = "https://www.nseindia.com/api/equity-stockIndices?index=SECURITIES%20IN%20F%26O"
    
    try:
        # Create session to maintain cookies
        session = requests.Session()
        
        # First, visit the homepage to get cookies
        session.get("https://www.nseindia.com", headers=headers, timeout=10)
        time.sleep(1)  # Brief delay
        
        # Now fetch the stock list
        response = session.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        stocks = []
        
        if 'data' in data:
            for item in data['data']:
                if 'symbol' in item:
                    stocks.append({
                        'symbol': item.get('symbol', ''),
                        'name': item.get('meta', {}).get('companyName', item.get('symbol', '')),
                        'exchange': 'NSE'
                    })
        
        print(f"Fetched {len(stocks)} F&O stocks from NSE")
        return stocks
        
    except Exception as e:
        print(f"Error fetching from NSE API: {e}")
        return []

def fetch_all_nse_equities() -> List[Dict[str, str]]:
    """
    Fetch all NSE equity stocks (broader list).
    """
    print("Fetching complete NSE equity list...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/',
    }
    
    url = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20500"
    
    try:
        session = requests.Session()
        session.get("https://www.nseindia.com", headers=headers, timeout=10)
        time.sleep(1)
        
        response = session.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        stocks = []
        
        if 'data' in data:
            for item in data['data']:
                if 'symbol' in item:
                    stocks.append({
                        'symbol': item.get('symbol', ''),
                        'name': item.get('meta', {}).get('companyName', item.get('symbol', '')),
                        'exchange': 'NSE'
                    })
        
        print(f"Fetched {len(stocks)} stocks from NIFTY 500")
        return stocks
        
    except Exception as e:
        print(f"Error fetching NIFTY 500: {e}")
        return []

def fetch_nse_etfs() -> List[Dict[str, str]]:
    """
    Fetch all NSE ETFs from NSE India API.
    Returns list of dicts with symbol and name.
    """
    print("Fetching NSE ETF list...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/',
    }
    
    # NSE API endpoint for ETF list
    url = "https://www.nseindia.com/api/etf"
    
    try:
        session = requests.Session()
        session.get("https://www.nseindia.com", headers=headers, timeout=10)
        time.sleep(1)
        
        response = session.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        etfs = []
        
        if 'data' in data:
            for item in data['data']:
                if 'symbol' in item:
                    etfs.append({
                        'symbol': item.get('symbol', ''),
                        'name': item.get('companyName', item.get('symbol', '')),
                        'exchange': 'NSE',
                        'type': 'ETF'
                    })
        
        print(f"Fetched {len(etfs)} ETFs from NSE")
        return etfs
        
    except Exception as e:
        print(f"Error fetching ETFs from NSE API: {e}")
        return []

def get_popular_stocks() -> List[Dict[str, str]]:
    """
    Fallback: Return a curated list of popular Indian stocks.
    """
    print("Using curated list of popular stocks...")
    
    return [
        {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "exchange": "NSE"},
        {"symbol": "TCS", "name": "Tata Consultancy Services Ltd", "exchange": "NSE"},
        {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "exchange": "NSE"},
        {"symbol": "INFY", "name": "Infosys Ltd", "exchange": "NSE"},
        {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "exchange": "NSE"},
        {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd", "exchange": "NSE"},
        {"symbol": "ITC", "name": "ITC Ltd", "exchange": "NSE"},
        {"symbol": "SBIN", "name": "State Bank of India", "exchange": "NSE"},
        {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "exchange": "NSE"},
        {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Ltd", "exchange": "NSE"},
        {"symbol": "LT", "name": "Larsen & Toubro Ltd", "exchange": "NSE"},
        {"symbol": "AXISBANK", "name": "Axis Bank Ltd", "exchange": "NSE"},
        {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd", "exchange": "NSE"},
        {"symbol": "WIPRO", "name": "Wipro Ltd", "exchange": "NSE"},
        {"symbol": "ASIANPAINT", "name": "Asian Paints Ltd", "exchange": "NSE"},
        {"symbol": "MARUTI", "name": "Maruti Suzuki India Ltd", "exchange": "NSE"},
        {"symbol": "HCLTECH", "name": "HCL Technologies Ltd", "exchange": "NSE"},
        {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical Industries Ltd", "exchange": "NSE"},
        {"symbol": "TITAN", "name": "Titan Company Ltd", "exchange": "NSE"},
        {"symbol": "ULTRACEMCO", "name": "UltraTech Cement Ltd", "exchange": "NSE"},
        {"symbol": "ADANIPORTS", "name": "Adani Ports and Special Economic Zone Ltd", "exchange": "NSE"},
        {"symbol": "NESTLEIND", "name": "Nestle India Ltd", "exchange": "NSE"},
        {"symbol": "POWERGRID", "name": "Power Grid Corporation of India Ltd", "exchange": "NSE"},
        {"symbol": "ONGC", "name": "Oil and Natural Gas Corporation Ltd", "exchange": "NSE"},
        {"symbol": "NTPC", "name": "NTPC Ltd", "exchange": "NSE"},
        {"symbol": "TATASTEEL", "name": "Tata Steel Ltd", "exchange": "NSE"},
        {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd", "exchange": "NSE"},
        {"symbol": "TECHM", "name": "Tech Mahindra Ltd", "exchange": "NSE"},
        {"symbol": "M&M", "name": "Mahindra & Mahindra Ltd", "exchange": "NSE"},
        {"symbol": "INDUSINDBK", "name": "IndusInd Bank Ltd", "exchange": "NSE"},
        {"symbol": "BAJAJFINSV", "name": "Bajaj Finserv Ltd", "exchange": "NSE"},
        {"symbol": "DRREDDY", "name": "Dr. Reddy's Laboratories Ltd", "exchange": "NSE"},
        {"symbol": "JSWSTEEL", "name": "JSW Steel Ltd", "exchange": "NSE"},
        {"symbol": "CIPLA", "name": "Cipla Ltd", "exchange": "NSE"},
        {"symbol": "DIVISLAB", "name": "Divi's Laboratories Ltd", "exchange": "NSE"},
        {"symbol": "GRASIM", "name": "Grasim Industries Ltd", "exchange": "NSE"},
        {"symbol": "BRITANNIA", "name": "Britannia Industries Ltd", "exchange": "NSE"},
        {"symbol": "EICHERMOT", "name": "Eicher Motors Ltd", "exchange": "NSE"},
        {"symbol": "HINDALCO", "name": "Hindalco Industries Ltd", "exchange": "NSE"},
        {"symbol": "COALINDIA", "name": "Coal India Ltd", "exchange": "NSE"},
        {"symbol": "BPCL", "name": "Bharat Petroleum Corporation Ltd", "exchange": "NSE"},
        {"symbol": "HEROMOTOCO", "name": "Hero MotoCorp Ltd", "exchange": "NSE"},
        {"symbol": "ADANIENT", "name": "Adani Enterprises Ltd", "exchange": "NSE"},
        {"symbol": "UPL", "name": "UPL Ltd", "exchange": "NSE"},
        {"symbol": "SBILIFE", "name": "SBI Life Insurance Company Ltd", "exchange": "NSE"},
        {"symbol": "SHREECEM", "name": "Shree Cement Ltd", "exchange": "NSE"},
        {"symbol": "APOLLOHOSP", "name": "Apollo Hospitals Enterprise Ltd", "exchange": "NSE"},
        {"symbol": "VEDL", "name": "Vedanta Ltd", "exchange": "NSE"},
        {"symbol": "GODREJCP", "name": "Godrej Consumer Products Ltd", "exchange": "NSE"},
        {"symbol": "TATACONSUM", "name": "Tata Consumer Products Ltd", "exchange": "NSE"},
        {"symbol": "DABUR", "name": "Dabur India Ltd", "exchange": "NSE"},
        {"symbol": "PIDILITIND", "name": "Pidilite Industries Ltd", "exchange": "NSE"},
        {"symbol": "HAVELLS", "name": "Havells India Ltd", "exchange": "NSE"},
        {"symbol": "SIEMENS", "name": "Siemens Ltd", "exchange": "NSE"},
        {"symbol": "DLF", "name": "DLF Ltd", "exchange": "NSE"},
        {"symbol": "BOSCHLTD", "name": "Bosch Ltd", "exchange": "NSE"},
        {"symbol": "ABB", "name": "ABB India Ltd", "exchange": "NSE"},
        {"symbol": "AMBUJACEM", "name": "Ambuja Cements Ltd", "exchange": "NSE"},
        {"symbol": "MARICO", "name": "Marico Ltd", "exchange": "NSE"},
        {"symbol": "BANKBARODA", "name": "Bank of Baroda", "exchange": "NSE"},
        {"symbol": "IOC", "name": "Indian Oil Corporation Ltd", "exchange": "NSE"},
        {"symbol": "INDIGO", "name": "InterGlobe Aviation Ltd", "exchange": "NSE"},
        {"symbol": "ADANIGREEN", "name": "Adani Green Energy Ltd", "exchange": "NSE"},
        {"symbol": "ZOMATO", "name": "Zomato Ltd", "exchange": "NSE"},
        {"symbol": "PAYTM", "name": "One 97 Communications Ltd", "exchange": "NSE"},
        {"symbol": "NYKAA", "name": "FSN E-Commerce Ventures Ltd", "exchange": "NSE"},
        {"symbol": "LTI", "name": "LTIMindtree Ltd", "exchange": "NSE"},
        {"symbol": "PGHH", "name": "Procter & Gamble Hygiene and Health Care Ltd", "exchange": "NSE"},
        {"symbol": "BERGEPAINT", "name": "Berger Paints India Ltd", "exchange": "NSE"},
        {"symbol": "CHOLAFIN", "name": "Cholamandalam Investment and Finance Company Ltd", "exchange": "NSE"},
        {"symbol": "TORNTPHARM", "name": "Torrent Pharmaceuticals Ltd", "exchange": "NSE"},
        {"symbol": "MOTHERSON", "name": "Samvardhana Motherson International Ltd", "exchange": "NSE"},
        {"symbol": "BAJAJ-AUTO", "name": "Bajaj Auto Ltd", "exchange": "NSE"},
        {"symbol": "GAIL", "name": "GAIL (India) Ltd", "exchange": "NSE"},
        {"symbol": "PNB", "name": "Punjab National Bank", "exchange": "NSE"},
        {"symbol": "HDFCLIFE", "name": "HDFC Life Insurance Company Ltd", "exchange": "NSE"},
        {"symbol": "ICICIPRULI", "name": "ICICI Prudential Life Insurance Company Ltd", "exchange": "NSE"},
        {"symbol": "MUTHOOTFIN", "name": "Muthoot Finance Ltd", "exchange": "NSE"},
        {"symbol": "PEL", "name": "Piramal Enterprises Ltd", "exchange": "NSE"},
        {"symbol": "VOLTAS", "name": "Voltas Ltd", "exchange": "NSE"},
        {"symbol": "LUPIN", "name": "Lupin Ltd", "exchange": "NSE"},
        {"symbol": "CONCOR", "name": "Container Corporation of India Ltd", "exchange": "NSE"},
        {"symbol": "AUROPHARMA", "name": "Aurobindo Pharma Ltd", "exchange": "NSE"},
        {"symbol": "BIOCON", "name": "Biocon Ltd", "exchange": "NSE"},
        {"symbol": "ACC", "name": "ACC Ltd", "exchange": "NSE"},
        {"symbol": "TATAPOWER", "name": "Tata Power Company Ltd", "exchange": "NSE"},
        {"symbol": "BANDHANBNK", "name": "Bandhan Bank Ltd", "exchange": "NSE"},
        {"symbol": "MCDOWELL-N", "name": "United Spirits Ltd", "exchange": "NSE"},
        {"symbol": "LICHSGFIN", "name": "LIC Housing Finance Ltd", "exchange": "NSE"},
        {"symbol": "SAIL", "name": "Steel Authority of India Ltd", "exchange": "NSE"},
        {"symbol": "RBLBANK", "name": "RBL Bank Ltd", "exchange": "NSE"},
        {"symbol": "INDHOTEL", "name": "The Indian Hotels Company Ltd", "exchange": "NSE"},
        {"symbol": "JUBLFOOD", "name": "Jubilant Foodworks Ltd", "exchange": "NSE"},
        {"symbol": "ALKEM", "name": "Alkem Laboratories Ltd", "exchange": "NSE"},
        {"symbol": "GMRINFRA", "name": "GMR Infrastructure Ltd", "exchange": "NSE"},
        {"symbol": "CANBK", "name": "Canara Bank", "exchange": "NSE"},
        {"symbol": "FEDERALBNK", "name": "The Federal Bank Ltd", "exchange": "NSE"},
        {"symbol": "NMDC", "name": "NMDC Ltd", "exchange": "NSE"},
        {"symbol": "PETRONET", "name": "Petronet LNG Ltd", "exchange": "NSE"},
    ]

def get_popular_etfs() -> List[Dict[str, str]]:
    """
    Fallback: Return a curated list of popular Indian ETFs.
    """
    print("Using curated list of popular ETFs...")
    
    return [
        {"symbol": "NIFTYBEES", "name": "Nippon India ETF Nifty BeES", "exchange": "NSE", "type": "ETF"},
        {"symbol": "JUNIORBEES", "name": "Nippon India ETF Junior BeES", "exchange": "NSE", "type": "ETF"},
        {"symbol": "BANKBEES", "name": "Nippon India ETF Bank BeES", "exchange": "NSE", "type": "ETF"},
        {"symbol": "GOLDBEES", "name": "Nippon India ETF Gold BeES", "exchange": "NSE", "type": "ETF"},
        {"symbol": "LIQUIDBEES", "name": "Nippon India ETF Liquid BeES", "exchange": "NSE", "type": "ETF"},
        {"symbol": "SETFNIF50", "name": "SBI ETF Nifty 50", "exchange": "NSE", "type": "ETF"},
        {"symbol": "SETFNN50", "name": "SBI ETF Nifty Next 50", "exchange": "NSE", "type": "ETF"},
        {"symbol": "ICICIB22", "name": "ICICI Prudential Nifty Bank ETF", "exchange": "NSE", "type": "ETF"},
        {"symbol": "HDFCNIF50", "name": "HDFC Nifty 50 ETF", "exchange": "NSE", "type": "ETF"},
        {"symbol": "HDFCNIFTY", "name": "HDFC Nifty ETF", "exchange": "NSE", "type": "ETF"},
        {"symbol": "KOTAKNIFTY", "name": "Kotak Nifty ETF", "exchange": "NSE", "type": "ETF"},
        {"symbol": "NETFBNK", "name": "Nippon India ETF Bank BeES", "exchange": "NSE", "type": "ETF"},
        {"symbol": "ABSLNN50ET", "name": "Aditya Birla SL Nifty Next 50 ETF", "exchange": "NSE", "type": "ETF"},
        {"symbol": "MOM30", "name": "Motilal Oswal Nifty Midcap 150 ETF", "exchange": "NSE", "type": "ETF"},
        {"symbol": "MON100", "name": "Motilal Oswal Nifty 100 ETF", "exchange": "NSE", "type": "ETF"},
        {"symbol": "NV20", "name": "Nippon India Nifty IT ETF", "exchange": "NSE", "type": "ETF"},
        {"symbol": "CPSEETF", "name": "CPSE ETF", "exchange": "NSE", "type": "ETF"},
        {"symbol": "SILVERBEES", "name": "Nippon India ETF Silver BeES", "exchange": "NSE", "type": "ETF"},
    ]

def main():
    """Main execution function."""
    all_symbols = []
    
    # Try different methods to fetch stocks
    # Method 1: Fetch F&O stocks
    fo_stocks = fetch_nse_stocks()
    if fo_stocks:
        # Add type field to stocks
        for stock in fo_stocks:
            stock['type'] = 'STOCK'
        all_symbols.extend(fo_stocks)
    
    # Method 2: Fetch NIFTY 500 stocks
    nifty_stocks = fetch_all_nse_equities()
    if nifty_stocks:
        # Merge without duplicates
        existing_symbols = {s['symbol'] for s in all_symbols}
        for stock in nifty_stocks:
            if stock['symbol'] not in existing_symbols:
                stock['type'] = 'STOCK'
                all_symbols.append(stock)
                existing_symbols.add(stock['symbol'])
    
    # Method 3: Fetch ETFs
    etfs = fetch_nse_etfs()
    if etfs:
        existing_symbols = {s['symbol'] for s in all_symbols}
        for etf in etfs:
            if etf['symbol'] not in existing_symbols:
                all_symbols.append(etf)
                existing_symbols.add(etf['symbol'])
    
    # Fallback: Use curated lists if API fails
    if not all_symbols:
        all_symbols = get_popular_stocks() + get_popular_etfs()
        # Add type field for fallback stocks
        for item in all_symbols:
            if 'type' not in item:
                item['type'] = 'STOCK'
    else:
        # Merge with popular stocks and ETFs to ensure we have the most common ones
        existing_symbols = {s['symbol'] for s in all_symbols}
        for stock in get_popular_stocks():
            if stock['symbol'] not in existing_symbols:
                stock['type'] = 'STOCK'
                all_symbols.append(stock)
        for etf in get_popular_etfs():
            if etf['symbol'] not in existing_symbols:
                all_symbols.append(etf)
    
    # Sort by type (ETF first) then symbol
    all_symbols.sort(key=lambda x: (x.get('type', 'STOCK'), x['symbol']))
    
    # Create output directory if it doesn't exist
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_dir = project_root / 'frontend' / 'public' / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save to JSON file in frontend public folder
    output_file = output_dir / 'nse_stocks.json'
    
    # Separate stocks and ETFs for metadata
    stocks_count = len([s for s in all_symbols if s.get('type') == 'STOCK'])
    etfs_count = len([s for s in all_symbols if s.get('type') == 'ETF'])
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'symbols': all_symbols,
            'total': len(all_symbols),
            'stocks': stocks_count,
            'etfs': etfs_count,
            'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'source': 'NSE India API + Curated List'
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Successfully saved {len(all_symbols)} symbols to {output_file}")
    print(f"  - Stocks: {stocks_count}")
    print(f"  - ETFs: {etfs_count}")
    print(f"\nSample symbols:")
    for symbol in all_symbols[:5]:
        symbol_type = symbol.get('type', 'STOCK')
        print(f"  - [{symbol_type}] {symbol['symbol']}: {symbol['name']}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
