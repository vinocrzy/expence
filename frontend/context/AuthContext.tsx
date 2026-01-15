'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  householdId?: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user_data');

        // 1. Optimistic UI: Load from storage immediately
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
            }
        }

        if (token) {
            try {
                const res = await api.get('/auth/me');
                const freshUser = res.data;
                setUser(freshUser);
                // Update storage with fresh data
                localStorage.setItem('user_data', JSON.stringify(freshUser));
            } catch (error: any) {
                console.error('Failed to fetch user', error);
                
                // If unauthorized, clear everything
                if (error.response?.status === 401 || error.response?.status === 403) {
                     localStorage.removeItem('token');
                     localStorage.removeItem('user_data');
                     setUser(null);
                }
                // If offline/network error, we KEEP the storedUser (if any) set above.
                // No action needed effectively.
            }
        } else {
            // No token, ensure clean state
            setUser(null);
            localStorage.removeItem('user_data');
        }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (token: string, newUser: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user_data', JSON.stringify(newUser));
    setUser(newUser);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    setUser(null);
    router.push('/');
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const freshUser = res.data;
      setUser(freshUser);
      localStorage.setItem('user_data', JSON.stringify(freshUser));
    } catch (error) {
      console.error('Failed to refresh user', error);
      // We don't automatically logout on failed refresh (could be offline),
      // unless we want strict security. For offline-first, we can just warn.
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
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
