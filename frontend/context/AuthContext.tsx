'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string | null;
  username?: string | null;
  imageUrl?: string;
  householdId?: string; // Clerk metadata or derived
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  getToken: (options?: any) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut, openSignIn } = useClerk();
  const { getToken } = useClerkAuth();
  const router = useRouter();

  // Map Clerk user to App user
  const user: User | null = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    name: clerkUser.fullName || clerkUser.username || '',
    username: clerkUser.username || null,
    firstName: clerkUser.firstName,
    imageUrl: clerkUser.imageUrl,
    householdId: (clerkUser.publicMetadata as any)?.householdId || clerkUser.id // Default to User ID if no household set
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
    <AuthContext.Provider value={{ user, loading: !isLoaded, login, logout, refreshUser, getToken }}>
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
