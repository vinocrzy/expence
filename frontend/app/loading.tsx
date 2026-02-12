import { Wallet } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[120px]" />

        <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-xl shadow-purple-500/20 mb-6 animate-pulse">
                <Wallet className="h-10 w-10 text-white" />
            </div>
            <div className="animate-pulse flex flex-col items-center gap-2">
                 <h1 className="text-2xl font-bold text-white tracking-tight">PocketTogether</h1>
            </div>
        </div>
    </div>
  );
}
