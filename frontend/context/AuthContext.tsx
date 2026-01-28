'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  householdId?: string; // Clerk metadata or derived
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut, openSignIn } = useClerk();
  const router = useRouter();

  // Map Clerk user to App user
  const user: User | null = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    name: clerkUser.fullName || clerkUser.username || '',
    householdId: (clerkUser.publicMetadata as any)?.householdId || 'household_1' // Temporary fallback
  } : null;

  const login = () => {
    // Redirect to Clerk sign in
    openSignIn();
  };

  const logout = async () => {
    await signOut();
    router.push('/');
  };

  const refreshUser = async () => {
    await clerkUser?.reload();
  };

  return (
    <AuthContext.Provider value={{ user, loading: !isLoaded, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
