'use client';

import { useState, useEffect } from 'react';
import { FileDown, FileSpreadsheet, FileText, TrendingUp, Calendar, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import NativeHeader from '@/components/dashboard/NativeHeader';
import ReportBuilderModal from '@/components/ReportBuilderModal';
import { useReportExport } from '@/hooks/useReportExport';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';

export default function ReportsPage() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { exportReport, isLoading } = useReportExport();

  const handleExport = async (type: any, format: any, filters: any) => {
    await exportReport(type, format, filters);
  };

  const quickReports = [
    {
      title: 'This Month Expenses',
      description: 'PDF report of all expenses',
      icon: TrendingUp,
      color: 'bg-red-500/10 text-red-400',
      onClick: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        exportReport('EXPENSE', 'EXCEL', {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        });
      }
    },
    {
      title: 'Yearly Summary',
      description: 'Full year performance',
      icon: Calendar,
      color: 'bg-blue-500/10 text-blue-400',
      onClick: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        exportReport('YEARLY_SUMMARY', 'PDF', {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        });
      }
    }
  ];

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-24 selection:bg-purple-500 selection:text-white">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <NativeHeader 
            title="Reports"
        />

        {/* Feature Card */}
        <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
                  <FileDown className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Custom Report Builder</h2>
              <p className="text-gray-400 text-sm mb-6 max-w-sm leading-relaxed">
                  Generate detailed financial reports with custom filters, date ranges, and formats.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={!isOnline}
                className="w-full sm:w-auto px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Start Building
              </button>
          </div>
        </div>

        {/* Quick Actions */}
         <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Quick Exports</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickReports.map((report, index) => (
                <button
                    key={index}
                    onClick={report.onClick}
                    disabled={isLoading || !isOnline}
                    className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-4 text-left hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${report.color}`}>
                            <report.icon className="w-5 h-5" />
                        </div>
                        <div className="bg-white/5 p-1.5 rounded-full text-gray-500 group-hover:text-white transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="font-bold text-white mb-0.5">{report.title}</div>
                    <p className="text-xs text-gray-500 font-medium">{report.description}</p>
                </button>
                ))}
            </div>
        </div>

        {/* Available Types List */}
        <div>
           <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Available Templates</h3>
           <div className="bg-[#1c1c1e] rounded-3xl border border-white/5 overflow-hidden">
                {[
                { name: 'Expense Report', desc: 'Category breakdown', icon: TrendingUp },
                { name: 'Account Summary', desc: 'Balances & flows', icon: FileSpreadsheet },
                { name: 'Loan Metrics', desc: 'EMI & Interest', icon: FileText },
                { name: 'Budget Analysis', desc: 'Planned vs Actual', icon: Calendar },
                ].map((item, i, arr) => (
                    <div key={i} className={`p-4 flex items-center justify-between ${i !== arr.length -1 ? 'border-b border-white/5' : ''}`}>
                         <div className="flex items-center gap-4">
                             <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400">
                                 <item.icon className="w-4 h-4" />
                             </div>
                             <div>
                                 <div className="text-sm font-bold text-white">{item.name}</div>
                                 <div className="text-xs text-gray-500">{item.desc}</div>
                             </div>
                         </div>
                         <div className="text-gray-600 text-xs font-medium bg-gray-900 px-2 py-1 rounded">
                             PDF / XLSX
                         </div>
                    </div>
                ))}
           </div>
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm text-red-400 font-medium">You are currently offline. Reports require internet.</p>
          </div>
        )}
      </main>

      <ReportBuilderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExport={handleExport}
      />
    </div>
  );
}
