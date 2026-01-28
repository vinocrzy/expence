/**
 * Local-First Context Provider
 * Manages local database initialization and migration state
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// import { checkMigrationStatus, type MigrationStatus } from '@/lib/migration'; // Removed legacy
// import MigrationWizard from '@/components/MigrationWizard'; // Removed legacy
import { useAuth } from '@clerk/nextjs';

interface LocalFirstContextValue {
  isReady: boolean;
}

const LocalFirstContext = createContext<LocalFirstContextValue>({
  isReady: false,
});

export function useLocalFirst() {
  return useContext(LocalFirstContext);
}

export function LocalFirstProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const { getToken } = useAuth(); // Clerk Auth

  useEffect(() => {
    initializeLocalFirst();
  }, []);

  const initializeLocalFirst = async () => {
    // Run migration V2 (Dexie -> RxDB)
    const { runMigration } = await import('@/lib/migration-runner');
    await runMigration();
    
    // Initialize Replication
    const { getDatabase } = await import('@/lib/rxdb');
    const { initializeReplication } = await import('@/lib/replication');
    const db = await getDatabase();
    
    // Pass token getter
    await initializeReplication(db, async () => {
        return await getToken();
    });

    setIsReady(true);
  };
  
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
    <LocalFirstContext.Provider value={{ isReady }}>
      {children}
    </LocalFirstContext.Provider>
  );
}
