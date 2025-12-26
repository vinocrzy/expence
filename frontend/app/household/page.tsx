'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../lib/api';
import { Users, Copy, Check, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function HouseholdPage() {
  const { refreshUser } = useAuth();
  const [household, setHousehold] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHousehold();
  }, []);

  const fetchHousehold = async () => {
    try {
      const res = await api.get('/household');
      setHousehold(res.data);
    } catch (error) {
      console.error('Failed to fetch household', error);
      // If 404, maybe user not in household? But our schema enforces it mostly.
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (household?.inviteCode) {
        navigator.clipboard.writeText(household.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    
    setJoining(true);
    setError('');
    
    try {
        await api.post('/household/join', { inviteCode: joinCode });
        // Refresh everything
        await refreshUser();
        await fetchHousehold();
        setJoinCode('');
        alert('Joined household successfully!');
    } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || 'Failed to join household');
    } finally {
        setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Household Settings</h1>
        <p className="text-gray-400 mb-8">Manage your shared finance space</p>

        {loading ? (
             <div className="text-center text-gray-400 py-12">Loading...</div>
        ) : (
            <div className="space-y-8">
                {/* Current Household Info */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{household?.name}</h2>
                            <p className="text-sm text-gray-400">Created on {new Date(household?.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <div className="text-sm font-medium text-gray-400 mb-1">Invite Code</div>
                            <div className="text-lg font-mono font-bold text-white tracking-wider">
                                {household?.inviteCode || 'No Code'}
                            </div>
                        </div>
                        <button 
                            onClick={copyCode}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600"
                        >
                            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                            {copied ? 'Copied!' : 'Copy Code'}
                        </button>
                    </div>
                </div>

                {/* Members List */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-bold text-white mb-4">Members</h3>
                    <div className="space-y-4">
                        {household?.users?.map((user: any) => (
                            <div key={user.id} className="flex items-center gap-4 p-3 hover:bg-gray-700/30 rounded-xl transition-colors">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                    {user.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <div className="font-bold text-white">{user.name}</div>
                                    <div className="text-sm text-gray-400">{user.email}</div>
                                </div>
                            </div>
                        )) || <div className="text-gray-500">No members found</div>}
                    </div>
                </div>

                {/* Join Another Household */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                            <UserPlus className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Join Another Household</h2>
                            <p className="text-sm text-gray-400">Enter an invite code to switch households</p>
                        </div>
                    </div>

                    <form onSubmit={handleJoin} className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            placeholder="Enter Invite Code"
                            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                        />
                        <button
                            type="submit"
                            disabled={joining || !joinCode}
                            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 transition-colors"
                        >
                            {joining ? 'Joining...' : 'Join Household'}
                        </button>
                    </form>
                    {error && (
                        <p className="mt-2 text-red-400 text-sm">{error}</p>
                    )}
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
