'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, ArrowRightLeft, Plus, BarChart2, User, 
    Wallet, CreditCard, Landmark, LogOut, ChevronDown, Menu, Target,
    MoreHorizontal, Home, Settings, CloudOff, RefreshCw, CloudUpload, FileDown,
    Users,
    ChartBar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useCallback, useMemo, useEffect } from 'react';
import QuickActionSheet from './QuickActionSheet';
// import BackupStatusIndicator from './BackupStatusIndicator'; // Removed legacy
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useAccounts, useCreditCards } from '../hooks/useLocalData';
import SyncStatusIndicator from './ui/SyncStatus';
import { setCurrentUser } from '../lib/localdb-services';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  useEffect(() => {
      if (user) {
          // Map Clerk user to our local context user
          setCurrentUser({ 
              id: user.id, 
              name: user.name || 'User',
              color: 'blue' // Default color, ideally from metadata
          });
      }
  }, [user]);

  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { accounts } = useAccounts();
  const { creditCards } = useCreditCards();

  const allAccounts = useMemo(() => {
    const ccs = creditCards.map(c => ({
        id: c.id,
        name: c.name || c.bankName || 'Credit Card',
        currency: 'INR', 
        type: 'CREDIT_CARD'
    }));
    return [...accounts, ...ccs];
  }, [accounts, creditCards]);
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
      <nav className="hidden md:block bg-black/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
               {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-900/20">
                    P
                 </div>
                 <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Pocket
                 </span>
                 <span 
                 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Together
                 </span>
               </Link>
              
              {/* Desktop Links */}
              <div className="flex items-center gap-5">
                {/* Home link removed */}
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
                         <Link href="/budgets" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-b-xl">
                            <ChartBar className="h-4 w-4" /> Budgets
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

                {/* Household Dropdown - HIDDEN FOR NOW
                <div className="relative group">
                    <button className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-white ${
                        ['/household', '/shared-dashboard'].some(p => pathname.startsWith(p)) ? 'text-white' : 'text-gray-400'
                    }`}>
                        Household <ChevronDown className="h-4 w-4" />
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left">
                        <Link href="/shared-dashboard" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-t-xl">
                             <div className="p-1 bg-blue-500/20 rounded text-blue-400"><Users className="h-3 w-3" /></div>
                             Shared Dashboard
                        </Link>
                        <div className="h-px bg-gray-700/50 mx-2"></div>
                        <Link href="/household" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-b-xl">
                             <Settings className="h-4 w-4" /> Settings
                        </Link>
                    </div>
                </div>
                */}

              </div>
            </div>

            {/* Profile & Actions */}
            <div className="flex items-center gap-4">
               <SyncStatusIndicator />
               
               <button 
                onClick={handleOpenQuickAction}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-purple-600/20"
               >
                   <Plus className="h-4 w-4" /> <span className="hidden lg:inline">Add New</span><span className="lg:hidden">Add</span>
               </button>
               
               <div className="h-6 w-px bg-gray-800"></div>
               
               <div className="flex items-center gap-3">
                    <Link href="/settings" className="text-gray-400 hover:text-white transition-colors" title="Settings">
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
      
      {/* Top Bar (Mobile) - Hidden on Dashboard and Pages with NativeHeader */}
      {!['/dashboard', '/finances', '/reports', '/settings/categories'].includes(pathname) && (
      <nav className="md:hidden bg-gray-900/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40 px-4 pt-safe pb-3 flex items-center justify-between transition-all duration-300">
           <div className="flex items-center gap-3 pt-2"> {/* Added pt-2 for extra island clearance */}
                 <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-purple-900/20">
                 P
                 </div>
                 <span className="font-semibold text-white text-lg tracking-tight">PocketTogether</span>
           </div>
           
            {/* Status Indicator (Mobile) */}
            <div className="flex items-center gap-3 pt-2">
                <SyncStatusIndicator />
                <Link href="/profile" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                    <User className="h-5 w-5" />
                </Link>
            </div>
      </nav>
      )}

       {/* Bottom Nav (Mobile) */}
       <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-gray-900/95 backdrop-blur-2xl border border-white/10 z-50 rounded-[2rem] shadow-2xl shadow-black/80 transition-all duration-300 pb-2 pt-2 safe-area-bottom-margin">
        <div className="flex items-center justify-between px-6">
            {mobileNavItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                if (item.isFab) {
                     return (
                        <div key="fab" className="relative -top-10"> {/* Adjusted for floating nav */}
                            <motion.button 
                                onClick={() => {
                                    if (navigator.vibrate) navigator.vibrate(15);
                                    handleOpenQuickAction();
                                }}
                                className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-purple-600/40 border-[6px] border-gray-900"
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <Plus className="h-8 w-8 stroke-[3]" />
                            </motion.button>
                        </div>
                    );
                }

                if (item.isMenu) {
                    return (
                        <button 
                            key="menu"
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                handleOpenMobileMenu();
                            }}
                             className={`relative flex flex-col items-center justify-center w-12 h-12 gap-1 rounded-2xl transition-all duration-200 ${isMobileMenuOpen ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <MoreHorizontal className={`h-6 w-6 ${isMobileMenuOpen ? 'stroke-[2.5px]' : ''}`} />
                            {isMobileMenuOpen && <span className="absolute -bottom-1 w-1 h-1 bg-blue-400 rounded-full"></span>}
                        </button>
                    )
                }

                return (
                    <Link 
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(10);
                        }}
                        className={`relative flex flex-col items-center justify-center w-12 h-12 gap-1 rounded-2xl transition-all duration-200 ${isActive ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Icon 
                            className={`h-6 w-6 transition-all duration-200 ${isActive ? 'stroke-[2.5px]' : ''}`} 
                        />
                         {isActive && <span className="absolute -bottom-1 w-1 h-1 bg-blue-400 rounded-full"></span>}
                    </Link>
                );
            })}
        </div>
      </nav>

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
                        
                        {/* Group 2: Shared & Household (Promoted) - HIDDEN FOR NOW
                         <div className="bg-gray-900 rounded-2xl overflow-hidden mb-4 border border-white/5">
                             <Link href="/shared-dashboard" onClick={handleCloseMobileMenu} className="flex items-center gap-4 p-4 border-b border-white/5 active:bg-gray-800 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Users className="h-5 w-5" />
                                </div>
                                <span className="text-base font-medium flex-1">Shared Dashboard</span>
                                <div className="text-gray-500"><ChevronDown className="h-4 w-4 -rotate-90" /></div>
                            </Link>
                             <Link href="/household" onClick={handleCloseMobileMenu} className="flex items-center gap-4 p-4 active:bg-gray-800 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                                    <Home className="h-5 w-5" />
                                </div>
                                <span className="text-base font-medium flex-1">Household Settings</span>
                                <div className="text-gray-500"><ChevronDown className="h-4 w-4 -rotate-90" /></div>
                            </Link>
                        </div>
                        */}

                        {/* Group 3: Management */}
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

                        {/* Group 4: Settings & Profile */}
                        <div className="bg-gray-900 rounded-2xl overflow-hidden mb-6 border border-white/5">
                            <Link href="/profile" onClick={handleCloseMobileMenu} className="flex items-center gap-4 p-4 border-b border-white/5 active:bg-gray-800 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-300">
                                    <User className="h-5 w-5" />
                                </div>
                                <span className="text-base font-medium flex-1">My Profile</span>
                                <div className="text-gray-500"><ChevronDown className="h-4 w-4 -rotate-90" /></div>
                            </Link>
                            <Link href="/settings" onClick={handleCloseMobileMenu} className="flex items-center gap-4 p-4 active:bg-gray-800 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-300">
                                    <Settings className="h-5 w-5" />
                                </div>
                                <span className="text-base font-medium flex-1">App Settings</span>
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

      
      {/* Global Quick Action Sheet */}
      <QuickActionSheet 
        isOpen={isQuickActionOpen} 
        onClose={handleCloseQuickAction}
        accounts={allAccounts}
      />
    </>
  );
}
