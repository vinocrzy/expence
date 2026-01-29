'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, ArrowRightLeft, Plus, BarChart2, User, 
    Wallet, CreditCard, Landmark, LogOut, ChevronDown, Menu, Target,
    MoreHorizontal, Home, Settings, CloudOff, RefreshCw, CloudUpload, FileDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useCallback } from 'react';
import QuickActionSheet from './QuickActionSheet';
// import BackupStatusIndicator from './BackupStatusIndicator'; // Removed legacy
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useAccounts } from '../hooks/useLocalData';
import SyncStatusIndicator from './ui/SyncStatus';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { accounts } = useAccounts(); // Use local hook
  const { isOnline, isSyncing, unsyncedCount, manualSync } = useSyncStatus();

  const handleOpenQuickAction = useCallback(() => setIsQuickActionOpen(true), []);
  const handleCloseQuickAction = useCallback(() => setIsQuickActionOpen(false), []);
  const handleOpenMobileMenu = useCallback(() => setIsMobileMenuOpen(true), []);
  const handleCloseMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  
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
                <Link 
                    href="/reports" 
                    className={`text-sm font-medium transition-colors hover:text-white ${pathname === '/reports' ? 'text-white' : 'text-gray-400'}`}
                >
                    Reports
                </Link>
              </div>
            </div>

            {/* Profile & Actions */}
            <div className="flex items-center gap-6">
               <SyncStatusIndicator />
               
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
                        <span className="hidden lg:inline">{user?.name}</span>
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
      {/* Top Bar (Mobile) */}
      <nav className="md:hidden bg-gray-900/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40 px-4 pt-safe pb-3 flex items-center justify-between transition-all duration-300">
           <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-purple-900/20">
                 P
                 </div>
                 <span className="font-semibold text-white text-lg tracking-tight">PocketTogether</span>
           </div>
           
            {/* Status Indicator (Mobile) */}
            <div className="flex items-center gap-3">
                <SyncStatusIndicator />
                <Link href="/profile" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                    <User className="h-5 w-5" />
                </Link>
            </div>
      </nav>

      {/* Bottom Nav (Mobile) */}
      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/85 backdrop-blur-xl border-t border-white/10 z-50 pb-safe pt-2">
        <div className="flex items-center justify-between px-6">
            {mobileNavItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                if (item.isFab) {
                     return (
                        <div key="fab" className="relative -top-8">
                            <motion.button 
                                onClick={() => {
                                    if (navigator.vibrate) navigator.vibrate(10);
                                    handleOpenQuickAction();
                                }}
                                className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-600/40 border-4 border-gray-900"
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <Plus className="h-7 w-7 stroke-[3]" />
                            </motion.button>
                        </div>
                    );
                }

                if (item.isMenu) {
                    return (
                        <button 
                            key="menu"
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(5);
                                handleOpenMobileMenu();
                            }}
                            className={`relative flex flex-col items-center justify-center w-12 h-12 gap-1 rounded-xl transition-all duration-200 ${isMobileMenuOpen ? 'text-blue-500' : 'text-gray-500'}`}
                        >
                            <MoreHorizontal className={`h-6 w-6 ${isMobileMenuOpen ? 'stroke-[2.5px]' : ''}`} />
                            <span className="text-[10px] font-medium">More</span>
                        </button>
                    )
                }

                return (
                    <Link 
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(5);
                        }}
                        className={`relative flex flex-col items-center justify-center w-12 h-12 gap-1 rounded-xl transition-all duration-200 ${isActive ? 'text-blue-500' : 'text-gray-500'}`}
                    >
                        <Icon 
                            className={`h-6 w-6 transition-all duration-200 ${isActive ? 'fill-current' : ''}`} 
                            strokeWidth={isActive ? 0 : 2}
                        />
                         <span className="text-[10px] font-medium">
                             {item.label}
                         </span>
                    </Link>
                );
            })}
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {/* Mobile Menu Drawer (iOS Style Grouped List) */}
       <AnimatePresence>
       {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex flex-col">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
                    onClick={handleCloseMobileMenu} 
                />
                <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="absolute bottom-0 left-0 right-0 bg-gray-950 rounded-t-[2rem] border-t border-white/10 flex flex-col max-h-[90vh]"
                >
                    {/* Handle */}
                    <div className="w-full flex justify-center pt-3 pb-2">
                        <div className="w-12 h-1.5 bg-gray-700/50 rounded-full" />
                    </div>

                    <div className="p-4 pt-2 overflow-y-auto pb-safe">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <h3 className="text-2xl font-bold text-white">Menu</h3>
                            <button 
                                onClick={handleCloseMobileMenu}
                                className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-full text-gray-400"
                            >
                                <ChevronDown className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Group 1: Insights & Reports */}
                        <div className="bg-gray-900 rounded-2xl overflow-hidden mb-4 border border-white/5">
                            <Link href="/analytics" onClick={handleCloseMobileMenu} className="flex items-center gap-4 p-4 border-b border-white/5 active:bg-gray-800 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                                    <BarChart2 className="h-5 w-5" />
                                </div>
                                <span className="text-base font-medium flex-1">Analytics</span>
                                <div className="text-gray-500"><ChevronDown className="h-4 w-4 -rotate-90" /></div>
                            </Link>
                            <Link href="/reports" onClick={handleCloseMobileMenu} className="flex items-center gap-4 p-4 active:bg-gray-800 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                                    <FileDown className="h-5 w-5" />
                                </div>
                                <span className="text-base font-medium flex-1">Reports</span>
                                <div className="text-gray-500"><ChevronDown className="h-4 w-4 -rotate-90" /></div>
                            </Link>
                        </div>

                        {/* Group 2: Management */}
                        <div className="bg-gray-900 rounded-2xl overflow-hidden mb-4 border border-white/5">
                            <Link href="/transactions" onClick={handleCloseMobileMenu} className="flex items-center gap-4 p-4 border-b border-white/5 active:bg-gray-800 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <ArrowRightLeft className="h-5 w-5" />
                                </div>
                                <span className="text-base font-medium flex-1">All Activity</span>
                                <div className="text-gray-500"><ChevronDown className="h-4 w-4 -rotate-90" /></div>
                            </Link>
                            <Link href="/settings/categories" onClick={handleCloseMobileMenu} className="flex items-center gap-4 p-4 active:bg-gray-800 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
                                    <Target className="h-5 w-5" />
                                </div>
                                <span className="text-base font-medium flex-1">Manage Categories</span>
                                <div className="text-gray-500"><ChevronDown className="h-4 w-4 -rotate-90" /></div>
                            </Link>
                        </div>

                        {/* Group 3: Settings & Profile */}
                        <div className="bg-gray-900 rounded-2xl overflow-hidden mb-6 border border-white/5">
                            <Link href="/household" onClick={handleCloseMobileMenu} className="flex items-center gap-4 p-4 border-b border-white/5 active:bg-gray-800 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                                    <Home className="h-5 w-5" />
                                </div>
                                <span className="text-base font-medium flex-1">Household Settings</span>
                                <div className="text-gray-500"><ChevronDown className="h-4 w-4 -rotate-90" /></div>
                            </Link>
                            <Link href="/profile" onClick={handleCloseMobileMenu} className="flex items-center gap-4 p-4 active:bg-gray-800 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-300">
                                    <User className="h-5 w-5" />
                                </div>
                                <span className="text-base font-medium flex-1">My Profile</span>
                                <div className="text-gray-500"><ChevronDown className="h-4 w-4 -rotate-90" /></div>
                            </Link>
                        </div>

                        <button onClick={logout} className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 rounded-2xl font-bold hover:bg-red-500/20 transition-colors">
                             <LogOut className="h-5 w-5" /> Log Out
                        </button>
                        
                        <div className="h-8" />
                    </div>
                </motion.div>
            </div>
       )}
       </AnimatePresence>
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
