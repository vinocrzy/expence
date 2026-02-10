'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import NativeHeader from '../../components/dashboard/NativeHeader';
import { User, Mail, Wallet, Calendar, Check, ChevronRight, Save, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { useToast } from '../../context/ToastContext';

export default function Profile() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [name, setName] = useState('');
  const [budgetMode, setBudgetMode] = useState('CALENDAR');
  const [salaryDay, setSalaryDay] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
    }
  }, [user, isLoaded, router]);

  useEffect(() => {
    if (user) {
      setName(user.fullName || user.firstName || '');
      // Load other settings from localDB / household service if implementing full persistence
    }
  }, [user]);

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      if (user) {
          await user.update({
              firstName: name, 
          });
      }
      showToast('Profile updated successfully', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded || !user) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div></div>;
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32 md:pb-8">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-0 md:pt-8 pb-8">        <NativeHeader title="Profile" />
        
        {/* iOS Style Header with Avatar */}
        <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-black">
                        <img 
                            src={user.imageUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                </div>
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                {user.fullName || 'User'}
            </h1>
            <p className="text-gray-500 text-sm">{user.primaryEmailAddress?.emailAddress}</p>
        </div>

        {/* Group 1: Personal Info */}
        <div className="space-y-6">
            <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-4">Personal Info</h2>
                <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-gray-800">
                     
                     {/* Name Input Row */}
                     <div className="flex items-center justify-between p-4 group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <User className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-white">Name</span>
                        </div>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-transparent text-right text-gray-300 focus:text-white focus:outline-none placeholder-gray-600"
                            placeholder="Your Name"
                        />
                     </div>

                     {/* Household ID (Read Only) */}
                     <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-white">Household ID</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="text-xs text-gray-500 font-mono">
                                {(user?.publicMetadata as any)?.householdId || user?.id?.substring(0, 12) + '...'}
                            </code>
                        </div>
                     </div>
                </div>
            </div>

            {/* Group 2: Budget Preference */}
            <div>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-4">Budgeting</h2>
                <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-gray-800">
                     
                     <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="font-medium text-white block">Budget Cycle</span>
                                    <span className="text-xs text-gray-500">When does your month start?</span>
                                </div>
                             </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                             {['CALENDAR', 'SALARY'].map(mode => (
                                 <button
                                     key={mode}
                                     onClick={() => setBudgetMode(mode)}
                                     className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                                         budgetMode === mode
                                         ? 'bg-white text-black border-white'
                                         : 'bg-gray-800 text-gray-400 border-gray-700'
                                     }`}
                                 >
                                     {mode === 'CALENDAR' ? 'Calendar' : 'Payday'}
                                 </button>
                             ))}
                        </div>

                        {budgetMode === 'SALARY' && (
                            <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                <span className="text-sm text-gray-300">Salary Date</span>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        min="1" max="31"
                                        value={salaryDay}
                                        onChange={(e) => setSalaryDay(Number(e.target.value))}
                                        className="w-12 bg-gray-900 border border-gray-700 rounded-lg py-1 px-2 text-center text-white text-sm"
                                    />
                                    <span className="text-xs text-gray-500">of month</span>
                                </div>
                            </div>
                        )}
                     </div>

                </div>
            </div>

            <button
                onClick={handleUpdate}
                disabled={isSaving}
                className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-lg hover:bg-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5"
            >
                {isSaving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
                ) : (
                    <>Save Changes</>
                )}
            </button>

            <div className="text-center pt-8">
                <button onClick={() => signOut()} className="text-red-500 text-sm font-medium hover:underline">
                    Sign Out
                </button>
            </div>
        </div>

      </main>
    </div>
  );
}
