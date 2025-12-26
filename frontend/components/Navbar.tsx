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
      <nav className="hidden md:block bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-12">
               {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-900/20">
                    P
                 </div>
                 <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Pocket
                 </span>
                 <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Together
                 </span>
               </Link>
               
               {/* Status Indicator (Desktop) */}
               <div className="ml-4">
                 {!isOnline ? (
                    <div className="px-2 py-1 rounded bg-red-500/20 text-red-500 text-xs font-bold flex items-center gap-1">
                        <CloudOff className="w-3 h-3"/> Offline
                    </div>
                 ) : isSyncing ? (
                    <div className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 text-xs font-bold flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin"/> Syncing...
                    </div>
                 ) : unsyncedCount > 0 ? (
                    <button onClick={manualSync} className="px-2 py-1 rounded bg-blue-500/20 text-blue-500 text-xs font-bold flex items-center gap-1 hover:bg-blue-500/30 transition-colors">
                        <CloudUpload className="w-3 h-3"/> {unsyncedCount} Pending
                    </button>
                 ) : null}
               </div>
              
              {/* Desktop Links */}
              <div className="flex items-center gap-6">
                <Link 
                    href="/dashboard" 
                    className={`text-sm font-medium transition-colors hover:text-white ${pathname === '/dashboard' ? 'text-white' : 'text-gray-400'}`}
                >
                    Home
                </Link>
                <Link 
                    href="/transactions" 
                    className={`text-sm font-medium transition-colors hover:text-white ${pathname === '/transactions' ? 'text-white' : 'text-gray-400'}`}
                >
                    Activity
                </Link>

                {/* Finances Dropdown (Simple Hover Group) */}
                <div className="relative group">
                    <button className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-white ${
                        ['/accounts', '/loans', '/credit-cards', '/finances'].some(p => pathname.startsWith(p)) ? 'text-white' : 'text-gray-400'
                    }`}>
                        Finances <ChevronDown className="h-4 w-4" />
                    </button>
                    {/* Dropdown Menu */}
                    <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left">
                        <Link href="/finances" className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-t-xl">
                            Overview
                        </Link>
                        <div className="h-px bg-gray-700/50 mx-2"></div>
                        <Link href="/accounts" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50">
                            <Wallet className="h-4 w-4" /> Accounts
                        </Link>
                         <Link href="/credit-cards" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50">
                            <CreditCard className="h-4 w-4" /> Credit Cards
                        </Link>
                         <Link href="/loans" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-b-xl">
                            <Landmark className="h-4 w-4" /> Loans
                        </Link>
                    </div>
                </div>
                
                 <Link 
                    href="/analytics" 
                    className={`text-sm font-medium transition-colors hover:text-white ${pathname === '/analytics' ? 'text-white' : 'text-gray-400'}`}
                >
                    Insights
                </Link>
              </div>
            </div>

            {/* Profile & Actions */}
            <div className="flex items-center gap-6">
               <button 
                onClick={handleOpenQuickAction}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-purple-600/20"
               >
                   <Plus className="h-4 w-4" /> Add New
               </button>
               
               <div className="h-6 w-px bg-gray-800"></div>
               
               <div className="flex items-center gap-3">
                    <Link href="/household" className="text-gray-400 hover:text-white transition-colors" title="Household Settings">
                        <Settings className="h-5 w-5" />
                    </Link>
                    <Link href="/profile" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white">
                        <User className="h-5 w-5" />
                        <span className="hidden lg:inline">{user.name}</span>
                    </Link>
                    <button onClick={logout} className="text-gray-500 hover:text-white">
                        <LogOut className="h-5 w-5" />
                    </button>
               </div>
            </div>
          </div>
        </div>
      </nav>

      {/* --- MOBILE NAVIGATION --- */}
      
      {/* Top Bar (Mobile) */}
      <nav className="md:hidden bg-gray-900 border-b border-gray-800 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
           <Link href="/dashboard" className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-purple-900/20">
                 P
                 </div>
                 <span className="font-bold text-white text-lg">Pocket</span>
                 <span className="font-bold text-white text-lg">Together</span>
           </Link>
           
            {/* Status Indicator (Mobile) */}
            <div className="mr-auto ml-4">
                 {!isOnline ? (
                    <div className="px-2 py-1 rounded bg-red-500/20 text-red-500 text-xs font-bold flex items-center gap-1"><CloudOff className="w-3 h-3"/></div>
                 ) : isSyncing ? (
                    <div className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 text-xs font-bold flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin"/></div>
                 ) : unsyncedCount > 0 ? (
                    <button onClick={manualSync} className="px-2 py-1 rounded bg-blue-500/20 text-blue-500 text-xs font-bold flex items-center gap-1"><CloudUpload className="w-3 h-3"/> {unsyncedCount}</button>
                 ) : null}
            </div>

           <Link href="/profile" className="text-gray-400">
               <User className="h-6 w-6" />
           </Link>
      </nav>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-gray-800/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-40 pb-safe">
        <div className="flex items-center justify-between px-2">
            {mobileNavItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                if (item.isFab) {
                     return (
                        <div key="fab" className="relative -top-5">
                            <motion.button 
                                onClick={handleOpenQuickAction}
                                className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-600/40 border-4 border-gray-900"
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
                            className={`relative flex flex-col items-center justify-center py-3 px-2 w-16 ${isMobileMenuOpen ? 'text-white' : 'text-gray-500'}`}
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
                                className="absolute inset-x-2 top-1 bottom-1 bg-white/10 rounded-xl -z-10"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <Icon 
                            className={`h-6 w-6 mb-1 transition-colors duration-200 ${isActive ? 'fill-white/10 stroke-[2.5px] text-white' : 'text-gray-500'}`} 
                        />
                         <span className={`text-[10px] font-medium transition-opacity duration-200 ${isActive ? 'opacity-100 text-white' : 'opacity-70 text-gray-500'}`}>
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
                    className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl border-t border-gray-800 p-6 pb-24"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">More & & Insights</h3>
                        <button onClick={handleCloseMobileMenu} className="p-2 bg-gray-800 rounded-full">
                            <ChevronDown className="h-6 w-6" />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4">
                         <Link href="/analytics" onClick={handleCloseMobileMenu} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-800 hover:bg-gray-700 col-span-2 flex-row justify-center">
                             <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                                 <BarChart2 className="h-5 w-5" />
                             </div>
                             <span className="text-sm font-medium">Analytics & Insights</span>
                        </Link>
                         <Link href="/settings/categories" onClick={handleCloseMobileMenu} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-800 hover:bg-gray-700 col-span-2 flex-row justify-center">
                             <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500">
                                 <Target className="h-5 w-5" />
                             </div>
                             <span className="text-sm font-medium">Categories</span>
                        </Link>

                        <Link href="/transactions" onClick={handleCloseMobileMenu} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-800 hover:bg-gray-700">
                             <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                 <ArrowRightLeft className="h-5 w-5" />
                             </div>
                             <span className="text-xs font-medium">Activity</span>
                        </Link>
                        
                        <Link href="/household" onClick={handleCloseMobileMenu} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-800 hover:bg-gray-700">
                             <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                 <Home className="h-5 w-5" />
                             </div>
                             <span className="text-xs font-medium">Household</span>
                        </Link>
                        <Link href="/profile" onClick={handleCloseMobileMenu} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-800 hover:bg-gray-700">
                             <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300">
                                 <User className="h-5 w-5" />
                             </div>
                             <span className="text-xs font-medium">Profile</span>
                        </Link>
                         <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-800 opacity-50">
                           {/* Placeholder for symmetry or remove */}
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-800">
                         <button onClick={logout} className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-500/20">
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
