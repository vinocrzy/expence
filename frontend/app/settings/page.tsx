'use client';

import React, { useState } from 'react';
import { downloadBackup, readBackupFile, importBackup } from '@/lib/backup';
import { Loader2, Download, Upload, AlertTriangle, CheckCircle, Database, RefreshCw } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

import Navbar from '@/components/Navbar';

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const { user } = useUser();

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
            
            // Determine household ID for migration
            const householdId = (user?.publicMetadata as any)?.householdId || user?.id;
            
            await importBackup(backupData, householdId);
            
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
            <Navbar />
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

                 <div className="flex items-center gap-2 mb-6 mt-10">
                    <RefreshCw className="h-5 w-5 text-purple-400" />
                    <h2 className="text-2xl font-bold text-white">Sync Configuration</h2>
                 </div>

                 <CouchDbSettings />

                 <div className="text-center text-sm text-gray-500 mt-8">
                    PocketTogether Data Management v1.1
                 </div>
             </div>
        </div>
    );
}

function CouchDbSettings() {
    const [config, setConfig] = useState<{
        url: string;
        username: string;
        password: string;
        enabled: boolean;
        forceEnable?: boolean;
    }>({
        url: '',
        username: '',
        password: '',
        enabled: false,
        forceEnable: false
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const [testStatus, setTestStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
    const [missingDbs, setMissingDbs] = useState<string[]>([]);
    const [initStatus, setInitStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });

    React.useEffect(() => {
        const stored = localStorage.getItem('couchdb_config');
        if (stored) {
            try {
                setConfig(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse couchdb config', e);
            }
        } else {
             // Pre-populate with env vars if available for convenience, but don't save automatically
             setConfig(prev => ({
                 ...prev,
                 url: process.env.NEXT_PUBLIC_COUCHDB_URL || ''
             }));
        }
    }, []);

    const handleChange = (field: keyof typeof config, value: string | boolean) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        // Reset test status on change
        setTestStatus({ type: 'idle', message: '' });
        setMissingDbs([]);
    };

    const getAuthHeaders = () => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (config.username && config.password) {
            headers['Authorization'] = 'Basic ' + btoa(config.username + ":" + config.password);
        }
        return headers;
    };

    const normalizeUrl = (url: string) => {
        let urlStr = url.trim();
        if (!urlStr) return '';

        // Add protocol if missing
        if (!/^https?:\/\//i.test(urlStr)) {
            urlStr = 'http://' + urlStr;
        }

        // Force HTTP for localhost to avoid SSL errors
        try {
            const urlObj = new URL(urlStr);
            if (urlObj.hostname === 'localhost' && urlObj.protocol === 'https:') {
                 console.warn('Downgrading localhost to HTTP');
                 urlObj.protocol = 'http:';
                 urlStr = urlObj.toString();
            }
             // Remove trailing slash
             if (urlStr.endsWith('/')) {
                 urlStr = urlStr.slice(0, -1);
             }
        } catch (e) {
            console.error('Invalid URL', e);
        }
        return urlStr;
    };

    const testConnection = async () => {
        setTestStatus({ type: 'loading', message: 'Testing connection...' });
        setMissingDbs([]);
        setInitStatus({ type: 'idle', message: '' });

        try {
            const normalizedUrl = normalizeUrl(config.url);
            if (!normalizedUrl) throw new Error('URL is required');

            // Update state with normalized URL if changed
            if (normalizedUrl !== config.url) {
                setConfig(prev => ({ ...prev, url: normalizedUrl }));
            }

            console.log(`Testing connection to: ${normalizedUrl}/_all_dbs`);

            const response = await fetch(`${normalizedUrl}/_all_dbs`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error('Unauthorized: Check username and password.');
                throw new Error(`Connection failed: ${response.status} ${response.statusText}`);
            }

            const allDbs = await response.json();
            const requiredDbs = ['accounts', 'transactions', 'categories', 'creditcards', 'loans', 'budgets'];
            const missing = requiredDbs.filter(db => !allDbs.includes(db));

            if (missing.length > 0) {
                setMissingDbs(missing);
                setTestStatus({ type: 'error', message: `Connected, but ${missing.length} databases are missing.` });
            } else {
                setTestStatus({ type: 'success', message: 'Connection successful! All databases exist.' });
            }

        } catch (err: any) {
            // Use warn for expected network errors to avoid double red-errors in console (browser logs the fetch fail)
            console.warn('Connection test result:', err.message);
            let msg = err.message || 'Failed to connect.';
            
            if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('ECONNREFUSED')) {
                msg = 'Unable to connect to server. Please check if CouchDB is running, accessible, and CORS is enabled.';
            }
            
            setTestStatus({ type: 'error', message: msg });
        }
    };

    const initializeDatabases = async () => {
        setInitStatus({ type: 'loading', message: 'Creating databases...' });
        const normalizedUrl = normalizeUrl(config.url);
        const headers = getAuthHeaders();
        
        let successCount = 0;
        let failCount = 0;

        for (const db of missingDbs) {
            try {
                const res = await fetch(`${normalizedUrl}/${db}`, {
                    method: 'PUT',
                    headers: headers
                });
                if (res.ok || res.status === 412) { // 412 means already exists
                    successCount++;
                } else {
                    failCount++;
                    console.error(`Failed to create ${db}: ${res.statusText}`);
                }
            } catch (e) {
                failCount++;
                console.error(`Error creating ${db}`, e);
            }
        }

        if (failCount === 0) {
            setInitStatus({ type: 'success', message: 'All databases created successfully!' });
            setMissingDbs([]); // Clear missing list
            setTestStatus({ type: 'success', message: 'Connection successful! All databases exist.' });
        } else {
            setInitStatus({ type: 'error', message: `Created ${successCount} databases, failed ${failCount}. Check server logs.` });
            // Re-test to update missing list
            testConnection();
        }
    };

    const handleSave = () => {
        const normalizedUrl = normalizeUrl(config.url);
        const finalConfig = { ...config, url: normalizedUrl };
        if (normalizedUrl !== config.url) {
             setConfig(finalConfig);
        }
        
        localStorage.setItem('couchdb_config', JSON.stringify(finalConfig));
        setIsDirty(false);
        alert('Sync settings saved. Please reload the application for changes to take effect.');
        window.location.reload();
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset to default settings?')) {
            localStorage.removeItem('couchdb_config');
            setConfig({
                url: process.env.NEXT_PUBLIC_COUCHDB_URL || '',
                username: '',
                password: '',
                enabled: false
            });
            setIsDirty(false);
            setTestStatus({ type: 'idle', message: '' });
            window.location.reload();
        }
    };

    return (
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
                <div>
                     <h3 className="text-xl font-bold text-white">Custom Sync Server</h3>
                     <p className="text-gray-400 text-sm">Connect to your own CouchDB/PouchDB instance</p>
                </div>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={config.enabled}
                                onChange={(e) => handleChange('enabled', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 shrink-0 relative"></div>
                            <span className="ml-3 text-sm font-medium text-gray-300 whitespace-nowrap">Use Custom</span>
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={config.forceEnable || false}
                                onChange={(e) => handleChange('forceEnable', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 shrink-0 relative"></div>
                            <div className="ml-3 flex flex-col">
                                <span className="text-sm font-medium text-gray-300 whitespace-nowrap">Force Enable Sync</span>
                                <span className="text-xs text-gray-500">Bypass env restriction</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {config.enabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Server URL</label>
                        <input 
                            type="text" 
                            value={config.url}
                            onChange={(e) => handleChange('url', e.target.value)}
                            placeholder="https://your-couchdb-instance.com"
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                            <input 
                                type="text" 
                                value={config.username}
                                onChange={(e) => handleChange('username', e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={config.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Test Connection & Output */}
                   <div className="pt-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                            <button
                                onClick={testConnection}
                                disabled={!config.url || testStatus.type === 'loading'}
                                className="w-full md:w-auto px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors border border-gray-700 whitespace-nowrap"
                            >
                                {testStatus.type === 'loading' ? 'Testing...' : 'Test Connection'}
                            </button>
                            
                            {testStatus.message && (
                                <span className={`text-sm flex items-start md:items-center gap-2 ${
                                    testStatus.type === 'success' ? 'text-green-400' : 
                                    testStatus.type === 'error' ? 'text-red-400' : 'text-gray-400'
                                }`}>
                                    <span className="mt-1 md:mt-0">
                                        {testStatus.type === 'success' && <CheckCircle className="h-4 w-4" />}
                                        {testStatus.type === 'error' && <AlertTriangle className="h-4 w-4" />}
                                    </span>
                                    <span>{testStatus.message}</span>
                                </span>
                            )}
                        </div>

                        {missingDbs.length > 0 && (
                            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                <p className="text-yellow-200 text-sm mb-2">
                                    The following databases are missing: <span className="font-mono text-yellow-100">{missingDbs.join(', ')}</span>.
                                    The application will not sync correctly without them.
                                </p>
                                <button 
                                    onClick={initializeDatabases}
                                    disabled={initStatus.type === 'loading'}
                                    className="w-full md:w-auto px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-200 text-xs font-bold uppercase tracking-wider rounded-lg border border-yellow-500/30 transition-colors"
                                >
                                    {initStatus.type === 'loading' ? 'Creating...' : 'Initialize Databases'}
                                </button>
                                {initStatus.message && (
                                    <p className={`text-xs mt-2 ${initStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                        {initStatus.message}
                                    </p>
                                )}
                            </div>
                        )}
                   </div>


                    <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-3 pt-4 border-t border-gray-800 mt-4">
                        <button 
                            onClick={handleReset}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Reset to Default
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={!isDirty}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20"
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
