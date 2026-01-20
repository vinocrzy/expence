/**
 * Backup Status Indicator
 * Small widget showing backup status in the UI
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBackupStatusMessage, isBackupOutdated } from '@/lib/backup';

export default function BackupStatusIndicator() {
  const [statusMessage, setStatusMessage] = useState('');
  const [isOutdated, setIsOutdated] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadStatus();
    
    // Update online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadStatus = async () => {
    const msg = await getBackupStatusMessage();
    const outdated = await isBackupOutdated();
    setStatusMessage(msg);
    setIsOutdated(outdated);
  };

  return (
    <Link href="/settings/backup">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition hover:shadow-md ${
        !isOnline 
          ? 'bg-gray-100 border-gray-300 text-gray-700'
          : isOutdated 
          ? 'bg-yellow-50 border-yellow-300 text-yellow-800' 
          : 'bg-green-50 border-green-300 text-green-800'
      }`}>
        <span className="text-lg">
          {!isOnline ? '📴' : isOutdated ? '⚠️' : '💾'}
        </span>
        <div className="flex flex-col">
          <span className="font-medium text-xs">
            {!isOnline ? 'Offline Mode' : statusMessage}
          </span>
          {!isOnline && (
            <span className="text-xs opacity-75">All data is local</span>
          )}
        </div>
      </div>
    </Link>
  );
}
