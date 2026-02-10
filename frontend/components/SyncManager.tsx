'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { initializeSync } from '../lib/localdb-services';

export default function SyncManager() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    // If not loaded yet, do nothing
    if (!isLoaded) return;

    // Trigger sync initialization
    // If user is null (guest), it will disable sync
    // If user is present, it will enable sync and push existing local data
    initializeSync(user ? user.id : null);
    
  }, [user, isLoaded]);

  return null; // This component handles logic only, no UI
}
