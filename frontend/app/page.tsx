'use client';

import { useEffect } from 'react';
import { ArrowRight, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
      return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-xl shadow-purple-500/20 mb-6">
                <Wallet className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">PocketTogether</h1>
            <p className="text-gray-400 text-lg">Master your shared finances.</p>
        </div>

        <div className="space-y-6">
            <button
                onClick={() => login('', {} as any)} // Trigger Clerk Login
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 font-bold transition-all shadow-lg shadow-purple-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
            >
                <span className="flex items-center gap-2">
                    Get Started <ArrowRight className="h-5 w-5" />
                </span>
            </button>
        </div>
      </div>
    </div>
  );
}
