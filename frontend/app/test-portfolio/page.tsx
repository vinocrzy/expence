'use client';

import { useState } from 'react';

/**
 * Test Page for Stock Portfolio Module
 * 
 * This page provides manual controls to test the new Next.js API routes:
 * - Trigger OPEN session sync
 * - Trigger CLOSE session sync
 * - Fetch latest cached data
 * - View debug storage info
 */

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export default function TestPortfolioPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  /**
   * Trigger market sync for a specific session
   */
  const triggerSync = async (session?: 'OPEN' | 'CLOSE') => {
    setLoading(true);
    setResult(null);

    try {
      const body = session ? { session } : {};
      
      const response = await fetch('/api/portfolio/market-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      setResult({
        success: response.ok,
        data,
      });
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch latest cached market data
   */
  const fetchCachedData = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Example symbols (you can modify this list)
      const symbols = 'RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK';
      
      const response = await fetch(
        `/api/portfolio/market-data?symbols=${symbols}`
      );

      const data = await response.json();
      
      setResult({
        success: response.ok,
        data,
      });
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * View debug storage information
   */
  const viewDebugStorage = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/portfolio/debug-storage');

      const data = await response.json();
      
      setResult({
        success: response.ok,
        data,
      });
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Stock Portfolio Test Page</h1>
      
      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Use these buttons to test the Stock Portfolio API routes</li>
          <li>In development, mock data will be used (no API key required)</li>
          <li>In production, set RAPIDAPI_KEY and RAPIDAPI_HOST in .env</li>
          <li>Market hours: 9:15 AM - 3:30 PM IST (Monday-Friday)</li>
        </ul>
      </div>

      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trigger OPEN Session */}
          <button
            onClick={() => triggerSync('OPEN')}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Loading...' : 'Trigger OPEN Session'}
          </button>

          {/* Trigger CLOSE Session */}
          <button
            onClick={() => triggerSync('CLOSE')}
            disabled={loading}
            className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Loading...' : 'Trigger CLOSE Session'}
          </button>

          {/* Trigger Auto Session */}
          <button
            onClick={() => triggerSync()}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Loading...' : 'Trigger Auto Session'}
          </button>

          {/* Fetch Cached Data */}
          <button
            onClick={fetchCachedData}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Loading...' : 'Fetch Cached Data'}
          </button>

          {/* View Debug Storage */}
          <button
            onClick={viewDebugStorage}
            disabled={loading}
            className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition md:col-span-2"
          >
            {loading ? 'Loading...' : 'View Debug Storage (Dev Only)'}
          </button>
        </div>
      </div>

      {/* Results Display */}
      {result && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Results:</h2>
          
          <div
            className={`p-4 rounded-lg border-2 ${
              result.success
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
            }`}
          >
            <div className="mb-2">
              <span className="font-semibold">Status: </span>
              <span
                className={result.success ? 'text-green-700' : 'text-red-700'}
              >
                {result.success ? 'Success ✅' : 'Failed ❌'}
              </span>
            </div>

            {result.error && (
              <div className="mb-2">
                <span className="font-semibold">Error: </span>
                <span className="text-red-700">{result.error}</span>
              </div>
            )}

            {result.data && (
              <div>
                <span className="font-semibold block mb-2">Response Data:</span>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="mt-12 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">About Market Sessions</h2>
        <div className="text-sm space-y-2">
          <p>
            <strong>OPEN Session (9:20 AM IST):</strong> Fetches prices shortly
            after market opens. Use this to capture opening prices.
          </p>
          <p>
            <strong>CLOSE Session (3:35 PM IST):</strong> Fetches prices after
            market closes. Use this to capture closing prices.
          </p>
          <p>
            <strong>Auto Session:</strong> Server automatically determines the
            appropriate session based on current IST time.
          </p>
          <p className="mt-4 text-gray-600">
            💡 <strong>Tip:</strong> In production, you'll use GitHub Actions or
            Netlify scheduled functions to automatically trigger sync at these
            times. This page is for manual testing only.
          </p>
        </div>
      </div>

      {/* API Routes Reference */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">API Routes</h2>
        <div className="text-sm space-y-1 font-mono">
          <div>
            <span className="text-blue-600">POST</span>{' '}
            /api/portfolio/market-sync
          </div>
          <div>
            <span className="text-green-600">GET</span>{' '}
            /api/portfolio/market-data
          </div>
          <div>
            <span className="text-green-600">GET</span>{' '}
            /api/portfolio/debug-storage
          </div>
        </div>
      </div>
    </div>
  );
}
