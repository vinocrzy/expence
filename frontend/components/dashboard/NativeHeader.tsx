
import { User, Bell } from 'lucide-react';

// Update Props Interface
interface NativeHeaderProps {
  userName?: string | null;
  photoUrl?: string | null;
  title?: string;
}

export default function NativeHeader({ userName, photoUrl, title }: NativeHeaderProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 18) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  return (
    <div className="flex items-center justify-between py-6 px-1">
      <div className="flex flex-col gap-0.5">
        <span className="text-gray-400 text-sm font-medium tracking-wide">
          {title ? (userName || 'User') : getGreeting()}
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {title || userName || 'User'}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <Bell className="w-6 h-6" />
        </button>

        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[1.5px] shadow-lg shadow-purple-500/20">
            <div className="h-full w-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                {photoUrl ? (
                    <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                    <User className="h-5 w-5 text-gray-400" />
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
