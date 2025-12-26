'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, ArrowRightLeft, Plus, BarChart2, User, 
    Wallet, CreditCard, Landmark, LogOut, ChevronDown, Menu, Target,
    MoreHorizontal, Home, Settings, CloudOff, RefreshCw, CloudUpload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import QuickActionSheet from './QuickActionSheet';
import api from '../lib/api';
import { motion } from 'framer-motion';
import { useSyncStatus } from '../hooks/useSyncStatus';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const { isOnline, isSyncing, unsyncedCount, manualSync } = useSyncStatus();

  const handleOpenQuickAction = useCallback(() => setIsQuickActionOpen(true), []);
  const handleCloseQuickAction = useCallback(() => setIsQuickActionOpen(false), []);
  const handleOpenMobileMenu = useCallback(() => setIsMobileMenuOpen(true), []);
  const handleCloseMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  
  // Fetch accounts only if needed for FAB (lazy load or on mount?)
  // Better to fetch on mount or Context. For now, fetch to pass to Sheet.
  useEffect(() => {
     if(user) {
         api.get('/accounts').then(res => setAccounts(res.data)).catch(err => console.error(err));
     }
  }, [user]);
  
  if (!user) return null;

  // Mobile Bottom Nav Items (optimized count: 5)
  const mobileNavItems = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/finances', label: 'Wallet', icon: Wallet }, // Grouping: Accounts, Cards, Loans
    { href: '#add', label: 'Add', icon: Plus, isFab: true },
    { href: '/budgets', label: 'Budgets', icon: Target },
    { href: '#menu', label: 'Menu', icon: Menu, isMenu: true }, // Grouping: Activity, Insights, Household, Profile
  ];

  // Desktop Top Nav Items
  const desktopNavItems = [
      { href: '/dashboard', label: 'Home' },
      { href: '/transactions', label: 'Activity' },
      { href: '/budgets', label: 'Budgets' },
      // Finances Dropdown logic handled separately
      { href: '/analytics', label: 'Insights' },
  ];

  return (
    <>
      {/* --- DESKTOP NAVIGATION --- */}
      <nav className="hidden md:block bg-[var(--color-wine-deep)]/80 backdrop-blur-xl border-b border-[var(--color-border-gold)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-12">
               {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-600)] rounded-lg flex items-center justify-center text-black font-bold text-lg shadow-lg shadow-[var(--color-gold-500)]/20">
                    P
                 </div>
                 <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)]">
                    Pocket Together
                 </span>
               </Link>
               
               {/* Status Indicator (Desktop) */}
               <div className="ml-4">
                 {!isOnline ? (
                    <div className="px-2 py-1 rounded bg-red-500/20 text-red-500 text-xs font-bold flex items-center gap-1 border border-red-500/30">
                        <CloudOff className="w-3 h-3"/> Offline
                    </div>
                 ) : isSyncing ? (
                    <div className="px-2 py-1 rounded bg-[var(--color-gold-500)]/20 text-[var(--color-gold-500)] text-xs font-bold flex items-center gap-1 border border-[var(--color-gold-500)]/30">
                        <RefreshCw className="w-3 h-3 animate-spin"/> Syncing...
                    </div>
                 ) : unsyncedCount > 0 ? (
                    <button onClick={manualSync} className="px-2 py-1 rounded bg-blue-500/20 text-blue-500 text-xs font-bold flex items-center gap-1 hover:bg-blue-500/30 transition-colors border border-blue-500/30">
                        <CloudUpload className="w-3 h-3"/> {unsyncedCount} Pending
                    </button>
                 ) : null}
               </div>
              
              {/* Desktop Links */}
              <div className="flex items-center gap-6">
                <Link 
                    href="/dashboard" 
                    className={`text-sm font-medium transition-colors hover:text-[var(--color-gold-500)] ${pathname === '/dashboard' ? 'text-[var(--color-gold-500)]' : 'text-gray-400'}`}
                >
                    Home
                </Link>
                <Link 
                    href="/transactions" 
                    className={`text-sm font-medium transition-colors hover:text-[var(--color-gold-500)] ${pathname === '/transactions' ? 'text-[var(--color-gold-500)]' : 'text-gray-400'}`}
                >
                    Activity
                </Link>

                {/* Finances Dropdown (Simple Hover Group) */}
                <div className="relative group">
                    <button className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-[var(--color-gold-500)] ${
                        ['/accounts', '/loans', '/credit-cards', '/finances'].some(p => pathname.startsWith(p)) ? 'text-[var(--color-gold-500)]' : 'text-gray-400'
                    }`}>
                        Finances <ChevronDown className="h-4 w-4" />
                    </button>
                    {/* Dropdown Menu */}
                    <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left backdrop-blur-xl">
                        <Link href="/finances" className="block px-4 py-2 text-sm text-gray-300 hover:text-[var(--color-gold-500)] hover:bg-white/5 rounded-t-xl">
                            Overview
                        </Link>
                        <div className="h-px bg-[var(--color-border-gold)] mx-2"></div>
                        <Link href="/accounts" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-[var(--color-gold-500)] hover:bg-white/5">
                            <Wallet className="h-4 w-4" /> Accounts
                        </Link>
                         <Link href="/credit-cards" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-[var(--color-gold-500)] hover:bg-white/5">
                            <CreditCard className="h-4 w-4" /> Credit Cards
                        </Link>
                         <Link href="/loans" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-[var(--color-gold-500)] hover:bg-white/5 rounded-b-xl">
                            <Landmark className="h-4 w-4" /> Loans
                        </Link>
                    </div>
                </div>
                
                 <Link 
                    href="/analytics" 
                    className={`text-sm font-medium transition-colors hover:text-[var(--color-gold-500)] ${pathname === '/analytics' ? 'text-[var(--color-gold-500)]' : 'text-gray-400'}`}
                >
                    Insights
                </Link>
              </div>
            </div>

            {/* Profile & Actions */}
            <div className="flex items-center gap-6">
               <button 
                onClick={handleOpenQuickAction}
                className="bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-600)] hover:brightness-110 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-[var(--color-gold-500)]/20"
               >
                   <Plus className="h-4 w-4" /> Add New
               </button>
               
               <div className="h-6 w-px bg-[var(--color-border-gold)]"></div>
               
               <div className="flex items-center gap-3">
                    <Link href="/household" className="text-gray-400 hover:text-[var(--color-gold-500)] transition-colors" title="Household Settings">
                        <Settings className="h-5 w-5" />
                    </Link>
                    <Link href="/profile" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-wine-surface)] border border-[var(--color-border-gold)] flex items-center justify-center text-[var(--color-gold-500)]">
                             <User className="h-4 w-4" />
                        </div>
                        <span className="hidden lg:inline">{user.name}</span>
                    </Link>
                    <button onClick={logout} className="text-gray-500 hover:text-[var(--color-gold-500)]">
                        <LogOut className="h-5 w-5" />
                    </button>
               </div>
            </div>
          </div>
        </div>
      </nav>

      {/* --- MOBILE NAVIGATION --- */}
      
      {/* Top Bar (Mobile) */}
      <nav className="md:hidden bg-[var(--color-wine-deep)]/90 backdrop-blur-md border-b border-[var(--color-border-gold)] sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
           <Link href="/dashboard" className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-600)] rounded-lg flex items-center justify-center text-black font-bold shadow-lg shadow-[var(--color-gold-500)]/20">
                 P
                 </div>
                 <span className="font-bold text-white text-lg">Pocket Together</span>
           </Link>
           
            {/* Status Indicator (Mobile) */}
            <div className="mr-auto ml-4">
                 {!isOnline ? (
                    <div className="px-2 py-1 rounded bg-red-500/20 text-red-500 text-xs font-bold flex items-center gap-1 border border-red-500/30"><CloudOff className="w-3 h-3"/></div>
                 ) : isSyncing ? (
                    <div className="px-2 py-1 rounded bg-[var(--color-gold-500)]/20 text-[var(--color-gold-500)] text-xs font-bold flex items-center gap-1 border border-[var(--color-gold-500)]/30"><RefreshCw className="w-3 h-3 animate-spin"/></div>
                 ) : unsyncedCount > 0 ? (
                    <button onClick={manualSync} className="px-2 py-1 rounded bg-blue-500/20 text-blue-500 text-xs font-bold flex items-center gap-1 border border-blue-500/30"><CloudUpload className="w-3 h-3"/> {unsyncedCount}</button>
                 ) : null}
            </div>

           <Link href="/profile" className="text-[var(--color-gold-muted)]">
               <User className="h-6 w-6" />
           </Link>
      </nav>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-[var(--color-wine-surface)]/90 backdrop-blur-xl border border-[var(--color-border-gold)] rounded-2xl shadow-2xl z-40 pb-safe">
        <div className="flex items-center justify-between px-2">
            {mobileNavItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                if (item.isFab) {
                     return (
                        <div key="fab" className="relative -top-5">
                            <motion.button 
                                onClick={handleOpenQuickAction}
                                className="w-14 h-14 bg-gradient-to-tr from-[var(--color-gold-500)] to-[var(--color-gold-600)] rounded-full flex items-center justify-center text-black shadow-lg shadow-[var(--color-gold-500)]/40 border-4 border-[var(--color-wine-deep)]"
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <Plus className="h-8 w-8" />
                            </motion.button>
                        </div>
                    );
                }

                if (item.isMenu) {
                    return (
                        <button 
                            key="menu"
                            onClick={handleOpenMobileMenu}
                            className={`relative flex flex-col items-center justify-center py-3 px-2 w-16 ${isMobileMenuOpen ? 'text-[var(--color-gold-500)]' : 'text-gray-500'}`}
                        >
                            <MoreHorizontal className="h-6 w-6 mb-1" />
                            <span className="text-[10px] font-medium">More</span>
                        </button>
                    )
                }

                return (
                    <Link 
                        key={item.href}
                        href={item.href}
                        className="relative flex flex-col items-center justify-center py-3 px-2 w-16"
                    >
                        {isActive && (
                            <motion.div 
                                layoutId="mobile-nav-pill"
                                className="absolute inset-x-2 top-1 bottom-1 bg-white/5 rounded-xl -z-10"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <Icon 
                            className={`h-6 w-6 mb-1 transition-colors duration-200 ${isActive ? 'fill-[var(--color-gold-500)]/20 stroke-[2.5px] text-[var(--color-gold-500)]' : 'text-gray-500'}`} 
                        />
                         <span className={`text-[10px] font-medium transition-opacity duration-200 ${isActive ? 'opacity-100 text-[var(--color-gold-500)]' : 'opacity-70 text-gray-500'}`}>
                             {item.label}
                         </span>
                    </Link>
                );
            })}
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
       {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseMobileMenu} />
                <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="absolute bottom-0 left-0 right-0 bg-[var(--color-wine-surface)] rounded-t-3xl border-t border-[var(--color-border-gold)] p-6 pb-24"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">More & Insights</h3>
                        <button onClick={handleCloseMobileMenu} className="p-2 bg-white/5 rounded-full text-gray-400">
                            <ChevronDown className="h-6 w-6" />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4">
                         <Link href="/analytics" onClick={handleCloseMobileMenu} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 col-span-2 flex-row justify-center border border-white/5">
                             <div className="w-10 h-10 rounded-full bg-[var(--color-gold-500)]/10 flex items-center justify-center text-[var(--color-gold-500)]">
                                 <BarChart2 className="h-5 w-5" />
                             </div>
                             <span className="text-sm font-medium text-white">Analytics & Insights</span>
                        </Link>
                         <Link href="/settings/categories" onClick={handleCloseMobileMenu} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 col-span-2 flex-row justify-center border border-white/5">
                             <div className="w-10 h-10 rounded-full bg-[var(--color-gold-500)]/10 flex items-center justify-center text-[var(--color-gold-500)]">
                                 <Target className="h-5 w-5" />
                             </div>
                             <span className="text-sm font-medium text-white">Categories</span>
                        </Link>

                        <Link href="/transactions" onClick={handleCloseMobileMenu} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5">
                             <div className="w-10 h-10 rounded-full bg-[var(--color-gold-500)]/10 flex items-center justify-center text-[var(--color-gold-500)]">
                                 <ArrowRightLeft className="h-5 w-5" />
                             </div>
                             <span className="text-xs font-medium text-[var(--color-text-muted)]">Activity</span>
                        </Link>
                        
                        <Link href="/household" onClick={handleCloseMobileMenu} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5">
                             <div className="w-10 h-10 rounded-full bg-[var(--color-gold-500)]/10 flex items-center justify-center text-[var(--color-gold-500)]">
                                 <Home className="h-5 w-5" />
                             </div>
                             <span className="text-xs font-medium text-[var(--color-text-muted)]">Household</span>
                        </Link>
                        <Link href="/profile" onClick={handleCloseMobileMenu} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5">
                             <div className="w-10 h-10 rounded-full bg-[var(--color-gold-500)]/10 flex items-center justify-center text-[var(--color-gold-500)]">
                                 <User className="h-5 w-5" />
                             </div>
                             <span className="text-xs font-medium text-[var(--color-text-muted)]">Profile</span>
                        </Link>
                         <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-transparent opacity-50">
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-[var(--color-border-gold)]">
                         <button onClick={logout} className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-500/20 border border-red-500/20">
                             <LogOut className="h-5 w-5" /> Logout
                         </button>
                    </div>
                </motion.div>
            </div>
       )}
      {/* Spacer */}
      <div className="h-24 md:hidden"></div>
      
      {/* Global Quick Action Sheet */}
      <QuickActionSheet 
        isOpen={isQuickActionOpen} 
        onClose={handleCloseQuickAction}
        accounts={accounts}
      />
    </>
  );
}
