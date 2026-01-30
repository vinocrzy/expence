'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { householdService } from '../../lib/localdb-services';
import { Users, Copy, Check, UserPlus, LogOut } from 'lucide-react';
import { useAuth, useUser } from '@clerk/nextjs';

export default function HouseholdPage() {
  const { user } = useUser();
  const [household, setHousehold] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<'OWNER' | 'GUEST'>('OWNER');

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const r = localStorage.getItem('household_role') as any;
        if (r) setRole(r);
    }
  }, []);

  useEffect(() => {
    if (user) {
        fetchHousehold();
    }
  }, [user, role]);

  const fetchHousehold = async () => {
    try {
      setLoading(true);
      if (role === 'GUEST') {
          // As guest, we don't have full household info, just the ID we joined
          const joinedId = localStorage.getItem('joined_household_id');
          setHousehold({
              name: 'Shared Household',
              inviteCode: 'N/A (Guest View)',
              users: [],
              id: joinedId || 'Unknown'
          });
      } else {
          // As owner, we fetch or create
          let data = await householdService.getCurrent();
          if (!data && user) {
             // Auto-create for owner
             const ownerData = {
                 id: user.id,
                 name: user.fullName || 'User',
                 email: user.primaryEmailAddress?.emailAddress || ''
             };
             data = await householdService.create(`${ownerData.name}'s Household`, ownerData);
          }
          setHousehold(data);
      }
    } catch (error) {
      console.error('Failed to fetch household', error);
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
        // Real Join Logic:
        // 1. We assume the code is the household ID (or we use a lookup service if we had a server)
        // For this local-first offline architecture, the "Invite Code" provided by Owner IS the Household ID (or mapped).
        // Let's assume the user enters the Household ID directly ideally, or we parse it.
        // If the code is "INV-...", and we don't have a lookup, we might need the raw ID.
        // DESIGN DECISION: For now, we assume the code IS the ID the user needs to enter. 
        // Or we assume the invite code is just the ID. 
        
        // Actually, householdService.create makes 'INV-'+uuid.
        // Since we can't resolve INV code to ID without a central server in this architecture easily,
        // we will ask the user to enter the Owner's Household ID for now? 
        // OR: The implementation plan implies a "Code".
        // Let's just mock the resolution: Code -> ID? No, that won't work peer-to-peer.
        // We will assume the code IS the ID for simplicity in this version, OR we store the ID in the invite code?
        // Let's strip 'INV-' and assume the rest is the ID? No, uuid is unrelated.
        
        // CORRECTION: For this PouchDB setup to work, the Guest needs the household ID to form the DB name `hh_{id}_shared`.
        // So the "Invite Code" displayed should probably just BE the household ID (maybe base64 encoded?)
        // Let's treat the joinCode as the target ID.
        
        const targetId = joinCode.trim();
        
        localStorage.setItem('household_role', 'GUEST');
        localStorage.setItem('joined_household_id', targetId);
        
        // We also need to configure Sync to use this ID.
        // We restart the app or alert user.
        alert(`Joined! You are now a Guest viewing household: ${targetId}. The page will reload to apply changes.`);
        window.location.reload();

    } catch (err: any) {
        console.error(err);
        setError('Failed to join household');
    } finally {
        setJoining(false);
    }
  };

  const leaveHousehold = () => {
      if (confirm('Are you sure you want to leave this household? You will return to your own data.')) {
          localStorage.removeItem('household_role');
          localStorage.removeItem('joined_household_id');
          window.location.reload();
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
                            <h2 className="text-xl font-bold text-white">{household?.name || 'My Household'}</h2>
                            {role === 'OWNER' && (
                                <p className="text-sm text-gray-400">Created on {household?.createdAt ? new Date(household.createdAt).toLocaleDateString() : 'Unknown'}</p>
                            )}
                            {role === 'GUEST' && (
                                <span className="inline-flex mt-1 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Guest Mode
                                </span>
                            )}
                        </div>
                    </div>

                    {role === 'OWNER' && (
                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <div className="text-sm font-medium text-gray-400 mb-1">Household ID (Share this)</div>
                            <div className="text-lg font-mono font-bold text-white tracking-wider break-all">
                                {household?.id || 'No ID'}
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(household?.id || '');
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600"
                        >
                            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                            {copied ? 'Copied!' : 'Copy ID'}
                        </button>
                    </div>
                    )}
                    
                    {role === 'GUEST' && (
                        <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-700/30">
                            <p className="text-blue-200 text-sm mb-4">
                                You have joined a shared household ({household?.id}).
                            </p>
                            
                            <div className="flex flex-wrap gap-3">
                                <a 
                                    href="/shared-dashboard"
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-lg shadow-blue-900/20"
                                >
                                    <Users className="h-4 w-4" />
                                    Open Shared Dashboard
                                </a>

                                <button 
                                    onClick={leaveHousehold}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/50"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Leave Household
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Members List - Only for Owner */}
                {role === 'OWNER' && (
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-bold text-white mb-4">Members</h3>
                    <div className="space-y-4">
                        {household?.members?.map((member: any) => (
                            <div key={member.userId} className="flex items-center gap-4 p-3 hover:bg-gray-700/30 rounded-xl transition-colors">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                    {member.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <div className="font-bold text-white">{member.name} {member.role === 'OWNER' && '(You)'}</div>
                                    <div className="text-sm text-gray-400">{member.email}</div>
                                </div>
                                <div className="ml-auto text-xs text-gray-500">{member.role}</div>
                            </div>
                        )) || <div className="text-gray-500">No members found</div>}
                    </div>
                </div>
                )}

                {/* Join Another Household */}
                {role === 'OWNER' && (
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                            <UserPlus className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Join External Household</h2>
                            <p className="text-sm text-gray-400">Enter a Household ID to switch to Guest View</p>
                        </div>
                    </div>

                    <form onSubmit={handleJoin} className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            placeholder="Enter Household ID"
                            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                        />
                        <button
                            type="submit"
                            disabled={joining || !joinCode}
                            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 transition-colors"
                        >
                            {joining ? 'Joining...' : 'Join as Guest'}
                        </button>
                    </form>
                    {error && (
                        <p className="mt-2 text-red-400 text-sm">{error}</p>
                    )}
                </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}

