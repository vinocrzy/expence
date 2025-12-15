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
        if (process.env.NODE_ENV === 'development') {
            // Speed up dev: always try to fetch current user with DEV_TOKEN
            try {
                const res = await api.get('/auth/me');
                setUser(res.data);
                // Also set a dummy token so other parts of app don't break
                localStorage.setItem('token', 'DEV_TOKEN'); 
            } catch (e) {
                console.error('Dev auth failed', e);
            }
        } else {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                const res = await api.get('/auth/me');
                setUser(res.data);
                } catch (error) {
                console.error('Failed to fetch user', error);
                localStorage.removeItem('token');
                setUser(null);
                }
            }
        }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (token: string, newUser: User) => {
    localStorage.setItem('token', token);
    setUser(newUser);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/');
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (error) {
      console.error('Failed to refresh user', error);
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
