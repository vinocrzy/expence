'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { getDatabase } from '@/lib/rxdb';
import Navbar from '@/components/Navbar';
import { CheckCircle, XCircle, AlertTriangle, Database, Cloud, Lock, Server } from 'lucide-react';

export default function DebugPage() {
  const { user, loading } = useAuth();
  const { isOnline, isConnected, isSyncing, error: syncError } = useSyncStatus();
  
  const [dbStatus, setDbStatus] = useState<'CHECKING' | 'OK' | 'ERROR'>('CHECKING');
  const [docCount, setDocCount] = useState<Record<string, number>>({});
  const [envCheck, setEnvCheck] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Check Env
    setEnvCheck({
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        'NEXT_PUBLIC_COUCHDB_URL': !!process.env.NEXT_PUBLIC_COUCHDB_URL,
    });

    // Check DB
    const checkDB = async () => {
        try {
            const db = await getDatabase();
            setDbStatus('OK');
            
            const counts: Record<string, number> = {};
            const collections = ['accounts', 'transactions', 'categories', 'budgets'];
            
            for (const col of collections) {
                // @ts-ignore
                const count = await db[col].count().exec();
                counts[col] = count;
            }
            setDocCount(counts);

        } catch (e) {
            console.error(e);
            setDbStatus('ERROR');
        }
    };
    
    checkDB();
  }, []);

  const StatusRow = ({ icon: Icon, label, status, detail, error }: any) => (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl border border-gray-700">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status === 'OK' ? 'bg-green-500/10 text-green-500' : status === 'ERROR' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <div className="font-medium text-white">{label}</div>
                {error && <div className="text-xs text-red-400">{error}</div>}
            </div>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{detail}</span>
            {status === 'OK' && <CheckCircle className="w-5 h-5 text-green-500" />}
            {status === 'ERROR' && <XCircle className="w-5 h-5 text-red-500" />}
            {status === 'CHECKING' && <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />}
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
        <Navbar />
        <main className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Server className="w-8 h-8 text-purple-500" /> System Diagnostics
            </h1>

            <div className="grid gap-4">
                <StatusRow 
                    icon={Lock}
                    label="Authentication"
                    status={loading ? 'CHECKING' : user ? 'OK' : 'ERROR'}
                    detail={user ? `Logged in as ${user.email}` : 'Not logged in'}
                />

                <StatusRow 
                    icon={Database}
                    label="Local Database (RxDB)"
                    status={dbStatus}
                    detail={dbStatus === 'OK' ? `${Object.values(docCount).reduce((a,b) => a+b, 0)} docs` : 'Failed'}
                />

                <StatusRow 
                    icon={Cloud}
                    label="Sync Connection"
                    status={!isConnected ? 'ERROR' : isSyncing ? 'CHECKING' : 'OK'}
                    detail={isConnected ? 'Connected to CouchDB' : 'Disconnected'}
                    error={syncError ? String(syncError) : (!process.env.NEXT_PUBLIC_COUCHDB_URL ? 'Missing URL' : undefined)}
                />
            </div>

            <h2 className="text-xl font-bold mt-8 mb-4">Environment Config</h2>
            <div className="grid gap-2">
                {Object.entries(envCheck).map(([key, valid]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg text-sm border border-gray-700">
                        <code className="text-gray-300">{key}</code>
                        <span className={valid ? 'text-green-400' : 'text-red-400'}>{valid ? 'Set' : 'Missing'}</span>
                    </div>
                ))}
            </div>

            <h2 className="text-xl font-bold mt-8 mb-4">Collection Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(docCount).map(([col, count]) => (
                    <div key={col} className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
                        <div className="text-2xl font-bold text-white">{count}</div>
                        <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">{col}</div>
                    </div>
                ))}
            </div>
        </main>
    </div>
  );
}
