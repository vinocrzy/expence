'use client';

import React, { useState } from 'react';
import { downloadBackup, readBackupFile, importBackup } from '@/lib/backup';
import { Loader2, Download, Upload, AlertTriangle, CheckCircle, Database } from 'lucide-react';

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

    const handleExport = async () => {
        try {
            setLoading(true);
            setStatus({ type: 'info', message: 'Preparing backup...' });
            await downloadBackup();
            setStatus({ type: 'success', message: 'Backup downloaded successfully.' });
        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: 'Failed to export backup.' });
        } finally {
            setLoading(false);
            // Clear success message after 3 seconds
            setTimeout(() => {
                setStatus((prev) => prev?.type === 'success' ? null : prev);
            }, 3000);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('WARNING: Importing a backup will overwrite ALL current data. This cannot be undone. Are you sure?')) {
            e.target.value = '';
            return;
        }

        try {
            setLoading(true);
            setStatus({ type: 'info', message: 'Reading backup file...' });
            const backupData = await readBackupFile(file);
            
            setStatus({ type: 'info', message: 'Restoring data (this may take a moment)...' });
            await importBackup(backupData);
            
            setStatus({ type: 'success', message: 'Backup restored successfully. Reloading...' });
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: 'Failed to import backup. Please ensure the file is a valid PocketTogether backup.' });
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 pb-24 md:pb-10 pt-safe-top px-4 md:px-8">
            {/* Mobile Header Spacer */}
            <div className="h-16 md:h-24"></div> 
            
             <div className="max-w-4xl mx-auto space-y-8">
                 <div className="flex items-center gap-4 mb-2">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center shadow-xl">
                        <Database className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Data Settings
                        </h1>
                        <p className="text-gray-400">Manage your local data and backups</p>
                    </div>
                 </div>

                 {status && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                        status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}>
                        {status.type === 'error' ? <AlertTriangle className="h-5 w-5" /> :
                         status.type === 'success' ? <CheckCircle className="h-5 w-5" /> :
                         <Loader2 className="h-5 w-5 animate-spin" />}
                        <p className="font-medium">{status.message}</p>
                    </div>
                 )}

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                     <a href="/household" className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors group flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                            <Database className="h-6 w-6 text-green-400" /> {/* Reusing icon or import Home */}
                        </div>
                        <div>
                             <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">Household Settings</h3>
                             <p className="text-gray-400 text-sm">Manage users and household preferences</p>
                        </div>
                     </a>
                     
                     <a href="/settings/categories" className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors group flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                            <Database className="h-6 w-6 text-pink-400" /> {/* Reusing icon or import Target */}
                        </div>
                        <div>
                             <h3 className="text-xl font-bold text-white group-hover:text-pink-400 transition-colors">Manage Categories</h3>
                             <p className="text-gray-400 text-sm">Customize transaction categories</p>
                        </div>
                     </a>
                 </div>

                 <div className="flex items-center gap-2 mb-6 mt-10">
                    <Database className="h-5 w-5 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">Data & Backup</h2>
                 </div>

                 <div className="grid md:grid-cols-2 gap-6">
                    {/* Export Card */}
                    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors group">
                        <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                            <Download className="h-6 w-6 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white">Export Backup</h3>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                            Create a complete backup of all your accounts, transactions, and budgets. 
                            The file will be saved to your device as a JSON file.
                        </p>
                        <button 
                            onClick={handleExport}
                            disabled={loading || (status?.type === 'info')}
                            className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                            {loading && status?.message.includes('Export') ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                            <span>Download Backup</span>
                        </button>
                    </div>

                    {/* Import Card */}
                    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors group">
                        <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                             <Upload className="h-6 w-6 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white">Import Backup</h3>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                            Restore your data from a valid backup file. 
                            <span className="block mt-1 text-red-400 font-medium flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                This will replace all current data!
                            </span>
                        </p>
                         <label className={`w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-600 cursor-pointer active:scale-95 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {loading && status?.message.includes('Import') ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                            <span>Select Backup File</span>
                            <input 
                                type="file" 
                                accept=".json" 
                                onChange={handleImport}
                                disabled={loading}
                                className="hidden" 
                            />
                        </label>
                    </div>
                 </div>
                 
                 <div className="text-center text-sm text-gray-500 mt-8">
                    PocketTogether Data Management v1.0
                 </div>
             </div>
        </div>
    );
}
