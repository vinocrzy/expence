import { User, Bell, ChevronLeft } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

// Update Props Interface
interface NativeHeaderProps {
  title?: string;
  backUrl?: string;
}

export default function NativeHeader({ title, backUrl }: NativeHeaderProps) {
  const { user } = useUser();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 18) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  return (
    <div className="flex items-center justify-between py-4 pt-safe md:hidden">
      <div className="flex flex-col gap-0.5">
        {backUrl ? (
            <div className="flex items-center gap-2">
                <Link href={backUrl} className="p-1 -ml-1 text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold text-white tracking-tight">
                    {title}
                </h1>
            </div>
        ) : (
            <>
                <span className="text-gray-400 text-sm font-medium tracking-wide">
                {title ? (user?.firstName || 'User') : getGreeting()}
                </span>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                {title || user?.firstName || 'User'}
                </h1>
            </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <Bell className="w-6 h-6" />
        </button>

        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[1.5px] shadow-lg shadow-purple-500/20">
            <div className="h-full w-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                    <User className="h-5 w-5 text-gray-400" />
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
