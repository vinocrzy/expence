'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { householdService, sharedDataService } from '../../lib/localdb-services';
import { Users, Copy, Check, UserPlus, LogOut, CloudUpload, RefreshCw, Home, Shield } from 'lucide-react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useToast } from '../../context/ToastContext';

export default function HouseholdPage() {
  const { user } = useUser();
  const { showToast } = useToast();
  
  const [household, setHousehold] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [publishing, setPublishing] = useState(false);
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
          const joinedId = localStorage.getItem('joined_household_id');
          setHousehold({
              name: 'Shared Household',
              inviteCode: 'N/A (Guest View)',
              users: [],
              id: joinedId || 'Unknown'
          });
      } else {
          let data = await householdService.getCurrent();
          if (!data && user) {
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
      showToast('Failed to load household data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
      if (!household?.id) return;
      try {
          setPublishing(true);
          await sharedDataService.publishSnapshot(household.id);
          showToast('Shared data updated successfully!', 'success');
      } catch (e) {
          console.error(e);
          showToast('Failed to publish data', 'error');
      } finally {
          setPublishing(false);
      }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    
    setJoining(true);
    
    try {
        const targetId = joinCode.trim();
        localStorage.setItem('household_role', 'GUEST');
        localStorage.setItem('joined_household_id', targetId);
        
        showToast('Joined! Reloading...', 'success');
        setTimeout(() => window.location.reload(), 1500);

    } catch (err: any) {
        console.error(err);
        showToast('Failed to join household', 'error');
    } finally {
        setJoining(false);
    }
  };

  const leaveHousehold = () => {
      // Custom confirmation dialog could be better, but keeping simple for now
      if (confirm('Are you sure you want to leave this household?')) {
          localStorage.removeItem('household_role');
          localStorage.removeItem('joined_household_id');
          window.location.reload();
      }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-24">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Home className="w-8 h-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white">Household</h1>
                <p className="text-gray-400">Manage shared access & guest views</p>
            </div>
        </div>

        {loading ? (
             <div className="space-y-4">
                 <div className="h-32 bg-gray-900 rounded-3xl animate-pulse" />
                 <div className="h-24 bg-gray-900 rounded-3xl animate-pulse delay-75" />
             </div>
        ) : (
            <div className="space-y-6">
                
                {/* STATUS CARD */}
                <div className="relative group overflow-hidden rounded-3xl bg-[#1c1c1e] border border-white/5 p-6">
                     <div className="flex justify-between items-start mb-6">
                         <div>
                             <h2 className="text-xl font-bold text-white">{household?.name || 'Household'}</h2>
                             <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${role === 'OWNER' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {role}
                                </span>
                                {role === 'OWNER' && (
                                    <span className="text-xs text-gray-500">
                                        ID: {household?.id?.substring(0, 8)}...
                                    </span>
                                )}
                             </div>
                         </div>
                         {role === 'OWNER' && (
                             <button
                                onClick={() => {
                                    navigator.clipboard.writeText(household?.id || '');
                                    setCopied(true);
                                    showToast('ID copied to clipboard', 'success');
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className="p-3 bg-gray-800 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                             >
                                 {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                             </button>
                         )}
                     </div>

                     {role === 'GUEST' && (
                         <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
                             <p className="text-sm text-blue-300 mb-3">You are viewing a shared household.</p>
                             <div className="flex gap-3">
                                 <a 
                                    href="/shared-dashboard"
                                    className="px-4 py-2 bg-blue-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-blue-500/20"
                                 >
                                     Open Dashboard
                                 </a>
                                 <button onClick={leaveHousehold} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-bold border border-red-500/20">
                                     Leave
                                 </button>
                             </div>
                         </div>
                     )}

                     {role === 'OWNER' && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Members</h3>
                            <div className="space-y-2">
                                {household?.members?.map((member: any) => (
                                    <div key={member.userId} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 flex items-center justify-center text-xs font-bold">
                                                {member.name?.[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{member.name}</div>
                                                <div className="text-xs text-gray-500">{member.role}</div>
                                            </div>
                                        </div>
                                    </div>
                                )) || <div className="text-gray-500 text-sm p-2">No other members</div>}
                            </div>
                        </div>
                     )}
                </div>

                {/* PUBLISH ACTION - Only Owner */}
                {role === 'OWNER' && (
                    <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                                <CloudUpload className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Share Data</h2>
                                <p className="text-sm text-gray-400">Publish snapshot for guests</p>
                            </div>
                        </div>
                        <button 
                            onClick={handlePublish}
                            disabled={publishing}
                            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                        >
                            {publishing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <CloudUpload className="h-5 w-5" />}
                            {publishing ? 'Publishing...' : 'Update Shared Snapshot'}
                        </button>
                    </div>
                )}

                {/* JOIN ACTION - Only Owner */}
                {role === 'OWNER' && (
                    <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <UserPlus className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Join Household</h2>
                                <p className="text-sm text-gray-400">Switch to viewing another household</p>
                            </div>
                        </div>
                        
                        <form onSubmit={handleJoin} className="flex gap-3">
                             <input 
                                type="text" 
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                placeholder="Paste Household ID"
                                className="flex-1 bg-black/40 border border-gray-700 rounded-xl px-4 text-white focus:border-indigo-500 focus:outline-none"
                             />
                             <button 
                                type="submit"
                                disabled={joining || !joinCode}
                                className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-bold whitespace-nowrap"
                             >
                                 Join
                             </button>
                        </form>
                    </div>
                )}

            </div>
        )}
      </main>
    </div>
  );
}
