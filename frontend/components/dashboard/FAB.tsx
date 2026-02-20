
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function FAB() {
  return (
    <Link 
        href="/transactions" 
        className="hidden md:flex fixed bottom-24 right-6 md:bottom-8 md:right-8 h-14 w-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full items-center justify-center shadow-lg shadow-purple-500/10 text-white z-50 hover:scale-105 active:scale-95 transition-all"
    >
        <Plus className="h-8 w-8" />
    </Link>
  );
}
