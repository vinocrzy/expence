'use client';

import { useState, useEffect } from 'react';
import api from '../lib/api';
import { ArrowRight, Lock, Mail, Wallet, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');
    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const payload = isRegistering ? { email, password, name } : { email, password };
      
      const res = await api.post(endpoint, payload);
      const { token, user } = res.data;
      
      login(token, user);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading || user) {
      return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--color-vino-800)] rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--color-gold-600)] rounded-full blur-[120px] opacity-20" />

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-600)] rounded-2xl shadow-xl shadow-yellow-900/20 mb-6">
                <Wallet className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">PocketTogether</h1>
            <p className="text-gray-400 text-lg">Master your shared finances.</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6 transition-all">
            {isRegistering && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
                    <label className="text-sm font-medium text-gray-300 ml-1">Full Name</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-500 group-focus-within:text-[var(--color-gold-500)] transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)] transition-all font-medium"
                            placeholder="John Doe"
                            required={isRegistering}
                        />
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-[var(--color-gold-500)] transition-colors" />
                    </div>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)] transition-all font-medium"
                        placeholder="you@example.com"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-[var(--color-gold-500)] transition-colors" />
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)] transition-all font-medium"
                        placeholder="••••••••"
                        required
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={authLoading}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-black bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-[var(--color-gold-500)] font-bold transition-all shadow-lg shadow-yellow-900/25 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
                {authLoading ? 'Processing...' : (
                    <span className="flex items-center gap-2">
                        {isRegistering ? 'Create Account' : 'Sign In'} <ArrowRight className="h-5 w-5" />
                    </span>
                )}
            </button>
        </form>
        
        <p className="mt-8 text-center text-sm text-gray-500">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="font-medium text-[var(--color-gold-500)] hover:text-[var(--color-gold-bright)] transition-colors focus:outline-none"
            >
                {isRegistering ? 'Sign In' : 'Create one'}
            </button>
        </p>
      </div>
    </div>
  );
}
