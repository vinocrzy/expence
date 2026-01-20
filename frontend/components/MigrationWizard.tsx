/**
 * Migration Wizard - First Launch Setup
 * Guides user through one-time migration from backend to local storage
 */

'use client';

import { useState, useEffect } from 'react';
import { checkMigrationStatus, migrateFromBackend, skipMigration, type MigrationStatus } from '@/lib/migration';

export default function MigrationWizard() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [migrationStep, setMigrationStep] = useState<'check' | 'migrate' | 'complete'>('check');
  const [error, setError] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    const migrationStatus = await checkMigrationStatus();
    setStatus(migrationStatus);
    
    if (migrationStatus.isComplete) {
      setMigrationStep('complete');
    }
    
    setIsLoading(false);
  };

  const handleMigrate = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await migrateFromBackend();
      
      if (result.isComplete) {
        setStatus(result);
        setMigrationStep('complete');
      } else {
        setError(result.error || 'Migration failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await skipMigration();
      await checkStatus();
      setMigrationStep('complete');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    window.location.reload();
  };

  if (isLoading && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking setup status...</p>
        </div>
      </div>
    );
  }

  if (migrationStep === 'complete' && status?.isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              All Set!
            </h1>
            <p className="text-gray-600">
              Your local-first expense tracker is ready
            </p>
          </div>

          {status.stats && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Transactions:</span>
                <span className="font-semibold">{status.stats.transactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Accounts:</span>
                <span className="font-semibold">{status.stats.accounts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Categories:</span>
                <span className="font-semibold">{status.stats.categories}</span>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p className="font-semibold mb-2">🏠 Your data now lives locally!</p>
            <ul className="space-y-1 text-xs">
              <li>✓ Works offline</li>
              <li>✓ No internet required</li>
              <li>✓ Backup is optional</li>
            </ul>
          </div>

          <button
            onClick={handleComplete}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Start Using App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Local-First
          </h1>
          <p className="text-gray-600">
            Let's set up your expense tracker
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-bold text-lg mb-3 text-gray-900">What's changing?</h3>
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>Your data stays local</strong> - stored on your device</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>Works offline</strong> - no internet needed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>Backup is optional</strong> - but recommended</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>Privacy-first</strong> - encrypted backups</span>
            </li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleMigrate}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-lg"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Migrating data...
              </span>
            ) : (
              <>📦 Import Existing Data</>
            )}
          </button>

          <button
            onClick={handleSkip}
            disabled={isLoading}
            className="w-full bg-gray-100 text-gray-700 px-6 py-4 rounded-lg font-semibold hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition"
          >
            ✨ Start Fresh (New User)
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          This is a one-time setup. You can backup your data later.
        </p>
      </div>
    </div>
  );
}
