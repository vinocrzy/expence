/**
 * Local-First Context Provider
 * Manages local database initialization and migration state
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { checkMigrationStatus, type MigrationStatus } from '@/lib/migration';
import MigrationWizard from '@/components/MigrationWizard';

interface LocalFirstContextValue {
  isReady: boolean;
  migrationStatus: MigrationStatus | null;
}

const LocalFirstContext = createContext<LocalFirstContextValue>({
  isReady: false,
  migrationStatus: null,
});

export function useLocalFirst() {
  return useContext(LocalFirstContext);
}

export function LocalFirstProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);

  useEffect(() => {
    initializeLocalFirst();
  }, []);

  const initializeLocalFirst = async () => {
    const status = await checkMigrationStatus();
    setMigrationStatus(status);
    setIsReady(status.isComplete);
  };

  // Show migration wizard if not ready
  if (!isReady && migrationStatus && !migrationStatus.isComplete) {
    return <MigrationWizard />;
  }

  // Show loading while checking
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing local database...</p>
        </div>
      </div>
    );
  }

  return (
    <LocalFirstContext.Provider value={{ isReady, migrationStatus }}>
      {children}
    </LocalFirstContext.Provider>
  );
}
