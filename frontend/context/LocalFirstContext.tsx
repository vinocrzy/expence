/**
 * Local-First Context Provider
 * Manages local database initialization and migration state
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// import { checkMigrationStatus, type MigrationStatus } from '@/lib/migration'; // Removed legacy
// import MigrationWizard from '@/components/MigrationWizard'; // Removed legacy
import { useAuth } from '@/context/AuthContext'; // Use local AuthContext
import { setHouseholdId } from '@/lib/localdb-services';

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
  const { getToken, user, loading } = useAuth(); // Custom AuthContext

  useEffect(() => {
    if (!loading) {
        if (user) {
             initializeLocalFirst();
        } else {
             handleLogout();
        }
    }
  }, [loading, user]);

  const handleLogout = async () => {
      setIsReady(false);
      const { resetReplicationState } = await import('@/lib/replication');
      resetReplicationState();
      setHouseholdId(null);
      setIsReady(true); // Ready (but empty/logged out)
  };

  const initializeLocalFirst = async () => {
    if (!user?.householdId) return;

    // Run migration V2 (Dexie -> RxDB) - DISABLED/REMOVED
    // const { runMigration } = await import('@/lib/migration-runner');
    // await runMigration();
    
    // Initialize Replication
    const { initDB } = await import('@/lib/pouchdb');
    const { initializeReplication } = await import('@/lib/replication');
    
    // Ensure indexes are created
    await initDB();
    
    // Set context for services
    setHouseholdId(user.householdId);

    // Pass token getter and householdId
    await initializeReplication(async () => {
        return await getToken();
    }, user.householdId);

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
