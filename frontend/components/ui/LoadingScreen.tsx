import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      <div className="relative flex flex-col items-center">
        {/* Logo Container - Native Style */}
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-700 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-purple-500/20 mb-8 relative">
            {/* Subtle inner glow/border */}
            <div className="absolute inset-0 rounded-[1.5rem] border border-white/10"></div>
            
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-10 h-10 text-white drop-shadow-md"
            >
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
        </div>

        {/* Brand Name - Clean & Minimal */}
        <h1 className="text-xl font-medium tracking-wide text-white mb-6">
            PocketTogether
        </h1>

        {/* Native-style Spinner */}
        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
      </div>
    </div>
  );
}
