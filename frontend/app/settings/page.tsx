'use client';

import React, { useState } from 'react';
import { downloadBackup, readBackupFile, importBackup } from '@/lib/backup';
import { Loader2, Download, Upload, AlertTriangle, CheckCircle, Database, ChevronRight, User, Folder, Shield, Cloud } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const { user } = useUser();

    const handleExport = async () => {
        try {
            setLoading(true);
            setStatus({ type: 'info', message: 'Preparing...' });
            await downloadBackup();
            setStatus({ type: 'success', message: 'Backup downloaded.' });
        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: 'Export failed.' });
        } finally {
            setLoading(false);
            setTimeout(() => setStatus(null), 3000);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('OVERWRITE WARNING: This will replace ALL current data. Continue?')) {
            e.target.value = '';
            return;
        }

        try {
            setLoading(true);
            setStatus({ type: 'info', message: 'Importing...' });
            const backupData = await readBackupFile(file);
            const householdId = (user?.publicMetadata as any)?.householdId || user?.id;
            await importBackup(backupData, householdId);
            setStatus({ type: 'success', message: 'Done. Reloading...' });
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            setStatus({ type: 'error', message: 'Import failed.' });
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="min-h-screen bg-black text-gray-100 pb-24 font-sans">
            <Navbar />
            
             <main className="max-w-3xl mx-auto px-4 py-8">
                 <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

                 {/* Status Toast */}
                 {status && (
                    <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                        status.type === 'error' ? 'bg-red-500/20 text-red-200' :
                        status.type === 'success' ? 'bg-green-500/20 text-green-200' : 'bg-blue-500/20 text-blue-200'
                    }`}>
                        {status.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
                        <span className="font-medium">{status.message}</span>
                    </div>
                 )}

                 <div className="space-y-6">
                    
                    {/* Group 1: General */}
                    <div>
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-4">General</h2>
                        <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-gray-800">
                             <SettingsItem 
                                icon={User} color="bg-blue-500" 
                                label="Household Settings" 
                                href="/household"
                             />
                             <SettingsItem 
                                icon={Folder} color="bg-pink-500" 
                                label="Manage Categories" 
                                href="/settings/categories"
                             />
                        </div>
                    </div>

                    {/* Group 2: Data */}
                    <div>
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-4">Data Management</h2>
                        <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-gray-800">
                             
                             <button onClick={handleExport} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-white">
                                        <Download className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium">Export Backup</span>
                                </div>
                                {loading && status?.message.includes('Preparing') ? <Loader2 className="w-5 h-5 animate-spin text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
                             </button>

                             <label className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium">Import Backup</span>
                                </div>
                                <input type="file" accept=".json" onChange={handleImport} disabled={loading} className="hidden" />
                                {loading && status?.message.includes('Importing') ? <Loader2 className="w-5 h-5 animate-spin text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
                             </label>

                        </div>
                    </div>

                    {/* Group 3: Sync */}
                    <div>
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-4">Sync</h2>
                        <div className="bg-[#1c1c1e] rounded-2xl p-4">
                            <CouchDbSettings />
                        </div>
                    </div>

                 </div>

                 <div className="mt-12 text-center">
                    <p className="text-xs text-gray-600">PocketTogether v1.2</p>
                 </div>
             </main>
        </div>
    );
}

function SettingsItem({ icon: Icon, color, label, href }: any) {
    return (
        <Link href={href} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white shadow-sm`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-white">{label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
        </Link>
    );
}

function CouchDbSettings() {
    const { user } = useUser();
    const [config, setConfig] = useState<{
        url: string;
        username: string;
        password: string;
        enabled: boolean;
        forceEnable?: boolean;
    }>({ url: '', username: '', password: '', enabled: false });
    
    const [expanded, setExpanded] = useState(false);
    const [status, setStatus] = useState('');

    React.useEffect(() => {
        const stored = localStorage.getItem('couchdb_config');
        if (stored) {
            try { setConfig(JSON.parse(stored)); } catch (e) {}
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('couchdb_config', JSON.stringify(config));
        setStatus('Saved. Please reload.');
        setTimeout(() => window.location.reload(), 1000);
    };

    return (
        <div>
            <div className="flex items-center justify-between" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white">
                        <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-medium text-white">Custom Sync Server</div>
                        <div className="text-xs text-gray-500">{config.enabled ? 'Enabled' : 'Disabled'}</div>
                    </div>
                </div>
                 <div className={`text-xs px-3 py-1 rounded-full ${config.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {config.enabled ? 'Active' : 'Off'}
                 </div>
            </div>

            {/* Inline Form */}
            {expanded && (
                <div className="mt-4 pt-4 border-t border-gray-800 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                         <span className="text-sm text-gray-300">Enable Custom Sync</span>
                         <input 
                            type="checkbox" 
                            checked={config.enabled} 
                            onChange={e => setConfig({...config, enabled: e.target.checked})}
                            className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500"
                         />
                    </div>
                    
                    {config.enabled && (
                        <>
                            <input 
                                type="text" 
                                placeholder="Server URL (https://...)" 
                                value={config.url}
                                onChange={e => setConfig({...config, url: e.target.value})}
                                className="w-full bg-black/50 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Username" 
                                    value={config.username}
                                    onChange={e => setConfig({...config, username: e.target.value})}
                                    className="w-full bg-black/50 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                                />
                                <input 
                                    type="password" 
                                    placeholder="Password" 
                                    value={config.password}
                                    onChange={e => setConfig({...config, password: e.target.value})}
                                    className="w-full bg-black/50 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            <button 
                                onClick={handleSave}
                                className="w-full py-2 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors"
                            >
                                Save Configuration
                            </button>
                            {status && <p className="text-xs text-green-400 text-center">{status}</p>}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
