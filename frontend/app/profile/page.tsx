'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import api from '../../lib/api';
import { User, Mail, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [budgetMode, setBudgetMode] = useState('CALENDAR');
  const [salaryDay, setSalaryDay] = useState(1);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
    if (user?.householdId) {
        api.get('/household').then(res => {
            if(res.data.budgetMode) setBudgetMode(res.data.budgetMode);
             if(res.data.budgetConfig) {
                 try {
                    const conf = JSON.parse(res.data.budgetConfig);
                    if(conf.salaryDay) setSalaryDay(conf.salaryDay);
                 } catch(e) {}
            }
        });
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      await api.put('/auth/me', { name, email });
      if (user && user.householdId) {
          await api.patch('/household', {
              budgetMode,
              budgetConfig: { salaryDay }
          });
      }
      await refreshUser();
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (e: any) {
      console.error(e);
      const detail = e.response ? `${e.response.status} ${e.response.statusText}: ${JSON.stringify(e.response.data)}` : e.message;
      setMessage({ type: 'error', text: `Failed: ${detail}` });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen theme-wine text-white font-sans selection:bg-[var(--color-gold-500)] selection:text-black">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Profile Settings</h1>

        <div className="bg-[var(--color-wine-surface)] backdrop-blur-md p-8 rounded-2xl border border-[var(--color-border-gold)] shadow-xl">
          <form onSubmit={handleUpdate} className="space-y-6">
            
            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-muted)] ml-1">Full Name</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-500 group-focus-within:text-[var(--color-gold-500)] transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)] transition-all font-medium"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-muted)] ml-1">Email Address</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-[var(--color-gold-500)] transition-colors" />
                    </div>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)] transition-all font-medium"
                        required
                    />
                </div>
            </div>

            <div className="pt-4 border-t border-[var(--color-border-gold)]/30">
                <p className="text-sm text-[var(--color-text-muted)] mb-2">Household ID</p>
                <code className="block w-full p-3 bg-[var(--color-wine-deep)] rounded-lg text-sm text-[var(--color-gold-500)] font-mono break-all select-all border border-[var(--color-border-gold)]/20">
                    {user.householdId || 'No active household'}
                </code>
            </div>

            {/* Budget Settings */}
            <div className="pt-8 border-t border-[var(--color-border-gold)]/30">
                <h2 className="text-xl font-bold text-white mb-6">Budget Settings</h2>
                <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--color-text-muted)] ml-1">Budget Mode</label>
                        <select 
                            value={budgetMode}
                            onChange={(e) => setBudgetMode(e.target.value)}
                            className="block w-full px-4 py-3 bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]"
                        >
                            <option value="CALENDAR">Calendar Month (Default)</option>
                            <option value="SALARY">Salary Cycle</option>
                            <option value="CASHFLOW">Cashflow Window</option>
                        </select>
                        <p className="text-xs text-[var(--color-text-muted)] ml-1">
                            {budgetMode === 'CALENDAR' && 'Budgets run from 1st to last day of each month.'}
                            {budgetMode === 'SALARY' && 'Budgets run from your payday to the day before next payday.'}
                            {budgetMode === 'CASHFLOW' && 'Budgets track available cash until next expected income.'}
                        </p>
                    </div>

                    {budgetMode === 'SALARY' && (
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--color-text-muted)] ml-1">Salary Day of Month</label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={salaryDay}
                                onChange={(e) => setSalaryDay(parseInt(e.target.value))}
                                className="block w-full px-4 py-3 bg-[var(--color-wine-deep)] border border-[var(--color-border-gold)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]"
                            />
                        </div>
                    )}
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {message.text}
                </div>
            )}

            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-black bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-wine-deep)] focus:ring-[var(--color-gold-500)] font-bold transition-all shadow-lg shadow-[var(--color-gold-500)]/20 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isSaving ? 'Saving...' : (
                        <>
                            <Save className="h-5 w-5" />
                            Save Changes
                        </>
                    )}
                </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
