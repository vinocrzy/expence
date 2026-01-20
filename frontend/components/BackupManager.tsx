/**
 * Backup Manager Component
 * UI for backup and restore operations
 */

'use client';

import { useState, useEffect } from 'react';
import {
  createBackup,
  restoreBackup,
  getBackupStatus,
  getBackupStatusMessage,
  isBackupOutdated,
  downloadBackupFile,
  restoreFromFile,
  type BackupMetadata,
} from '@/lib/backup';
import { getDatabaseStats } from '@/lib/localdb';

export default function BackupManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [backupStatusMessage, setBackupStatusMessage] = useState('Loading...');
  const [isOutdated, setIsOutdated] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showFileRestore, setShowFileRestore] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    const statusMsg = await getBackupStatusMessage();
    const outdated = await isBackupOutdated();
    const dbStats = await getDatabaseStats();
    
    setBackupStatusMessage(statusMsg);
    setIsOutdated(outdated);
    setStats(dbStats);
  };

  const handleBackup = async () => {
    if (!password) {
      setMessage('Please enter a password to encrypt your backup');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const result = await createBackup(password);
      
      if (result.success) {
        setMessage('✅ Backup completed successfully!');
        setMessageType('success');
        await loadStatus();
      } else {
        setMessage(`❌ Backup failed: ${result.error}`);
        setMessageType('error');
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!password) {
      setMessage('Please enter your backup password');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setShowRestoreConfirm(false);

    try {
      const result = await restoreBackup(password);
      
      if (result.success) {
        setMessage('✅ Restore completed successfully! Refreshing page...');
        setMessageType('success');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage(`❌ Restore failed: ${result.error}`);
        setMessageType('error');
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    if (!password) {
      setMessage('Please enter a password to encrypt your backup');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    try {
      await downloadBackupFile(password);
      setMessage('✅ Backup file downloaded');
      setMessageType('success');
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileRestore = async (file: File) => {
    if (!password) {
      setMessage('Please enter your backup password');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setShowFileRestore(false);

    try {
      await restoreFromFile(file, password);
      setMessage('✅ Restore from file completed! Refreshing page...');
      setMessageType('success');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-blue-900 mb-2">
          🏠 Local-First Storage
        </h2>
        <p className="text-sm text-blue-700">
          Your data lives on this device. Backup is optional but recommended.
        </p>
      </div>

      {/* Status */}
      <div className={`border rounded-lg p-4 ${isOutdated ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Backup Status</h3>
          {isOutdated && <span className="text-yellow-600 text-sm">⚠️ Outdated</span>}
        </div>
        <p className="text-sm mb-3">{backupStatusMessage}</p>
        
        {stats && (
          <div className="text-xs space-y-1 text-gray-600">
            <div>📊 {stats.totalRecords} total records</div>
            <div>💳 {stats.transactionCount} transactions</div>
            <div>🏦 {stats.accountCount} accounts</div>
          </div>
        )}
      </div>

      {/* Password Input */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Backup Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter encryption password"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">
          This password encrypts your data. Keep it safe!
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          messageType === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message}
        </div>
      )}

      {/* Backup Actions */}
      <div className="space-y-3">
        <button
          onClick={handleBackup}
          disabled={isLoading || !password}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {isLoading ? '⏳ Processing...' : '☁️ Backup to Server'}
        </button>

        <button
          onClick={handleDownloadBackup}
          disabled={isLoading || !password}
          className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {isLoading ? '⏳ Processing...' : '💾 Download Backup File'}
        </button>

        <button
          onClick={() => setShowRestoreConfirm(true)}
          disabled={isLoading || !password}
          className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          🔄 Restore from Server
        </button>

        <button
          onClick={() => setShowFileRestore(true)}
          disabled={isLoading || !password}
          className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          📁 Restore from File
        </button>
      </div>

      {/* Restore Confirmation Dialog */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Warning</h3>
            <p className="mb-4">
              This will <strong>completely replace</strong> all your local data with the backup from the server.
            </p>
            <p className="mb-6 text-sm text-gray-600">
              Current data will be permanently lost. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRestoreConfirm(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Restore Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Restore Dialog */}
      {showFileRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">📁 Restore from File</h3>
            <p className="mb-4 text-sm text-gray-600">
              Select your encrypted backup file (.enc)
            </p>
            <input
              type="file"
              accept=".enc"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileRestore(file);
              }}
              className="w-full mb-4"
            />
            <button
              onClick={() => setShowFileRestore(false)}
              className="w-full px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-700">
        <h4 className="font-semibold mb-2">ℹ️ How it works:</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li>All your data is stored locally on this device</li>
          <li>No internet required for daily use</li>
          <li>Backups are encrypted before upload</li>
          <li>Server never sees your plain data</li>
          <li>You can also download backups as files</li>
        </ul>
      </div>
    </div>
  );
}
