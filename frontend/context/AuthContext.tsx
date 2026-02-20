'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
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

  // Local state to manage user, initialized potentially from cache
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Initialize from Cache on Mount
  useEffect(() => {
    const cached = localStorage.getItem('pocket_user_cache');
    if (cached) {
      try {
        setUser(JSON.parse(cached));
        setLoading(false); // Immediate load from cache
      } catch (e) {
        console.error("Failed to parse user cache", e);
      }
    }
  }, []);

  // 2. Sync with Clerk when loaded
  useEffect(() => {
    if (isLoaded) {
      if (clerkUser) {
        const mappedUser: User = {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          name: clerkUser.fullName || clerkUser.username || '',
          username: clerkUser.username || null,
          firstName: clerkUser.firstName,
          imageUrl: clerkUser.imageUrl,
          householdId: (clerkUser.publicMetadata as any)?.householdId || clerkUser.id
        };
        
        setUser(mappedUser);
        localStorage.setItem('pocket_user_cache', JSON.stringify(mappedUser));
      } else {
        setUser(null);
        // Only clear cache if we know for sure user is logged out (clerk loaded and no user)
        // But be careful not to clear if just a network blip. 
        // Standard behavior: if Clerk says no user, we trust it.
         localStorage.removeItem('pocket_user_cache');
      }
      setLoading(false);
    }
  }, [isLoaded, clerkUser]);


  const login = () => {
    openSignIn();
  };

  const logout = async () => {
    try {
        await signOut();
        localStorage.removeItem('pocket_user_cache');
        setUser(null);
        router.push('/');
    } catch (error) {
        console.error("Logout failed", error);
    }
  };

  const refreshUser = async () => {
    await clerkUser?.reload();
  };

  return (
    <AuthContext.Provider value={{ user, loading: loading && !user, login, logout, refreshUser, getToken }}>
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
