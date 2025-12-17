'use client';

import Navbar from '../../components/Navbar';
import { BarChart as BarChartIcon } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans pb-24">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
             <BarChartIcon className="h-8 w-8 text-blue-400" />
             Insights & Analytics
        </h1>
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 text-center">
            <p className="text-gray-400 text-lg">Detailed analytics and trends coming soon.</p>
            <p className="text-gray-500 mt-2">View Dashboard for current month summary.</p>
        </div>
      </main>
    </div>
  );
}
