'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, ArrowRightLeft, Tag, Users, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  if (!user) return null;

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/accounts', label: 'Accounts', icon: Wallet },
    { href: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
    { href: '/categories', label: 'Categories', icon: Tag },
    { href: '/household', label: 'Household', icon: Users },
  ];

  return (
    <>
      {/* Desktop Top Navbar */}
      <nav className="hidden md:block bg-gray-800 border-b border-gray-700/50 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    P
                 </div>
                 <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    PocketTogether
                 </span>
              </Link>
              
              <div className="flex items-center gap-6">
                {navItems.map((item) => (
                    <Link 
                        key={item.href}
                        href={item.href} 
                        className={`text-sm font-medium transition-colors hover:text-white ${pathname === item.href ? 'text-white' : 'text-gray-400'}`}
                    >
                        {item.label}
                    </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6">
               <Link 
                href="/profile" 
                className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-white ${pathname === '/profile' ? 'text-white' : 'text-gray-400'}`}
               >
                <User className="h-4 w-4" />
                {user.name}
               </Link>
               <button onClick={logout} className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                <LogOut className="h-4 w-4" />
                Sign Out
               </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar (Logo & Profile only) */}
      <nav className="md:hidden bg-gray-800 border-b border-gray-700/50 sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                P
                </div>
                <span className="font-bold text-white">PocketTogether</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-white">
                <User className="h-4 w-4" />
             </Link>
             <button onClick={logout} className="text-gray-400 hover:text-white">
                <LogOut className="h-5 w-5" />
             </button>
          </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700/50 pb-safe z-50">
        <div className="flex items-center justify-around">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link 
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center justify-center py-3 px-2 w-full transition-colors ${isActive ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Icon className={`h-6 w-6 mb-1 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                );
            })}
        </div>
      </nav>
      {/* Spacer for bottom nav to prevent content overlap */}
      <div className="h-16 md:hidden"></div>
    </>
  );
}
