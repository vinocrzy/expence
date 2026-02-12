'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Wallet } from 'lucide-react';

// Lazy load Providers (Auth, LocalDB, Toast) to enable immediate splash screen
const Providers = dynamic(() => import('./providers'), {
  ssr: false,
  loading: () => <SplashScreen />,
});

function SplashScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] z-[100]">
       <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]" />
       <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[120px]" />
       
       <div className="relative z-10 flex flex-col items-center animate-pulse">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-xl shadow-purple-500/20 mb-6">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="40" 
                  height="40" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="text-white"
                >
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">PocketTogether</h1>
       </div>
    </div>
  );
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      {children}
    </Providers>
  );
}
