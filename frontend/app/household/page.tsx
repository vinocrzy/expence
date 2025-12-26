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
    <div className="min-h-screen theme-wine text-white font-sans selection:bg-[var(--color-gold-500)] selection:text-black">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Household Settings</h1>
        <p className="text-[var(--color-text-muted)] mb-8">Manage your shared finance space</p>

        {loading ? (
             <div className="text-center text-[var(--color-text-muted)] py-12">Loading...</div>
        ) : (
            <div className="space-y-8">
                {/* Current Household Info */}
                <div className="bg-[var(--color-wine-surface)] rounded-2xl p-6 border border-[var(--color-border-gold)] backdrop-blur-sm shadow-xl">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-[var(--color-gold-500)]/10 rounded-xl text-[var(--color-gold-500)]">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{household?.name}</h2>
                            <p className="text-sm text-[var(--color-text-muted)]">Created on {new Date(household?.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="bg-[var(--color-wine-deep)] rounded-xl p-4 border border-[var(--color-border-gold)] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <div className="text-sm font-medium text-[var(--color-text-muted)] mb-1">Invite Code</div>
                            <div className="text-lg font-mono font-bold text-white tracking-wider">
                                {household?.inviteCode || 'No Code'}
                            </div>
                        </div>
                        <button 
                            onClick={copyCode}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-wine-surface)] hover:bg-white/5 text-white transition-colors border border-[var(--color-border-gold)] shadow-md"
                        >
                            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-[var(--color-gold-500)]" />}
                            {copied ? 'Copied!' : 'Copy Code'}
                        </button>
                    </div>
                </div>

                {/* Members List */}
                <div className="bg-[var(--color-wine-surface)] rounded-2xl p-6 border border-[var(--color-border-gold)] backdrop-blur-sm shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-4">Members</h3>
                    <div className="space-y-4">
                        {household?.users?.map((user: any) => (
                            <div key={user.id} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-[var(--color-gold-500)]/20">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-600)] flex items-center justify-center text-black font-bold shadow-lg shadow-[var(--color-gold-500)]/20">
                                    {user.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <div className="font-bold text-white">{user.name}</div>
                                    <div className="text-sm text-[var(--color-text-muted)]">{user.email}</div>
                                </div>
                            </div>
                        )) || <div className="text-[var(--color-text-muted)]">No members found</div>}
                    </div>
                </div>

                {/* Join Another Household */}
                <div className="bg-[var(--color-wine-surface)] rounded-2xl p-6 border border-[var(--color-border-gold)] backdrop-blur-sm shadow-xl">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-[var(--color-gold-500)]/10 rounded-xl text-[var(--color-gold-500)]">
                            <UserPlus className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Join Another Household</h2>
                            <p className="text-sm text-[var(--color-text-muted)]">Enter an invite code to switch households</p>
                        </div>
                    </div>

                    <form onSubmit={handleJoin} className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            placeholder="Enter Invite Code"
                            className="flex-1 px-4 py-3 bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 font-mono"
                        />
                        <button
                            type="submit"
                            disabled={joining || !joinCode}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 text-black font-bold disabled:opacity-50 transition-all shadow-lg shadow-[var(--color-gold-500)]/20"
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
