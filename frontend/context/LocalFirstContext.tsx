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

import { useHouseholdPublisher } from '@/hooks/useHouseholdPublisher';

export function LocalFirstProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const { getToken, user, loading } = useAuth(); // Custom AuthContext

  // Determine role for publisher
  const [role, setRole] = useState<'OWNER' | 'GUEST'>('OWNER');
  
  useEffect(() => {
      if (typeof window !== 'undefined') {
          const r = localStorage.getItem('household_role');
          if (r === 'GUEST') setRole('GUEST');
      }
  }, []);

  useHouseholdPublisher(role === 'OWNER');

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
    // If we are guest, we might ignore user.householdId check? 
    // But we need to be logged in (user exists).
    
    // Determine target ID and Role
    let activeViewingId: string | undefined = undefined;
    
    if (typeof window !== 'undefined') {
        const guestRole = localStorage.getItem('household_role');
        const joinedId = localStorage.getItem('joined_household_id');
        if (guestRole === 'GUEST' && joinedId) {
             activeViewingId = joinedId;
             setRole('GUEST');
        }
    }

    if (!user || !user.householdId) return;
    const currentUserHouseholdId = user.householdId;

    // Initialize Replication
    const { initDB } = await import('@/lib/pouchdb');
    const { initializeReplication } = await import('@/lib/replication');
    
    // Ensure indexes are created
    await initDB();
    
    // Set context for services
    setHouseholdId(currentUserHouseholdId); // ALWAYS personal ID for write ops

    // Pass token getter and householdId
    await initializeReplication(async () => {
        return await getToken();
    }, currentUserHouseholdId, activeViewingId);

    setIsReady(true);
  };
  
  // Show loading while checking
  if (!isReady && user) { // Only show loading if we have a user and expect to init
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
