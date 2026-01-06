'use client';

import { useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, TrendingUp, Calendar } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ReportBuilderModal from '@/components/ReportBuilderModal';
import { useReportExport } from '@/hooks/useReportExport';

export default function ReportsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { exportReport, isLoading } = useReportExport();

  const handleExport = async (type: any, format: any, filters: any) => {
    await exportReport(type, format, filters);
  };

  const quickReports = [
    {
      title: 'This Month Expenses',
      description: 'All expenses for current month',
      icon: TrendingUp,
      iconColor: 'text-red-400',
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
      description: 'Month-by-month trends',
      icon: Calendar,
      iconColor: 'text-blue-400',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FileDown className="w-8 h-8 text-cyan-400" />
            Reports
          </h1>
          <p className="text-gray-400">
            Export your financial data in Excel or PDF format
          </p>
        </div>

        {/* main CTA */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">
                Create Custom Report
              </h2>
              <p className="text-gray-300 mb-4">
                Choose report type, date range, and filters to export exactly what you need
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                  8 different report types available
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                  Filter by accounts, categories, and tags
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                  Export as Excel (.xlsx) or PDF
                </li>
              </ul>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center gap-2 text-lg"
            >
              <FileDown className="w-5 h-5" />
              Create Report
            </button>
          </div>
        </div>

        {/* Quick Reports */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Quick Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickReports.map((report, index) => (
              <button
                key={index}
                onClick={report.onClick}
                disabled={isLoading}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-left hover:border-gray-600 hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <report.icon className={`w-8 h-8 ${report.iconColor} mb-3`} />
                <h4 className="text-white font-medium mb-1">{report.title}</h4>
                <p className="text-sm text-gray-400">{report.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Report Types Grid */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Available Report Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Expense Report', desc: 'All expenses grouped by category', icon: TrendingUp, color: 'red' },
              { name: 'Income Report', desc: 'All income grouped by source', icon: TrendingUp, color: 'green' },
              { name: 'Account Summary', desc: 'Balance and activity per account', icon: FileSpreadsheet, color: 'blue' },
              { name: 'Loan Report', desc: 'EMI schedule and payments', icon: FileText, color: 'orange' },
              { name: 'Credit Card Report', desc: 'Statement history', icon: FileText, color: 'purple' },
              { name: 'Budget vs Actual', desc: 'Compare budgeted vs spending', icon: Calendar, color: 'yellow' },
              { name: 'Trip/Event Report', desc: 'Tag-based expenses', icon: Calendar, color: 'pink' },
              { name: 'Yearly Summary', desc: 'Month-by-month trends', icon: TrendingUp, color: 'cyan' },
            ].map((report, index) => (
              <div
                key={index}
                className="bg-gray-800/30 border border-gray-700 rounded-lg p-4"
              >
                <report.icon className={`w-6 h-6 text-${report.color}-400 mb-2`} />
                <h4 className="text-white font-medium text-sm mb-1">{report.name}</h4>
                <p className="text-xs text-gray-400">{report.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Offline Warning */}
        {typeof window !== 'undefined' && !navigator.onLine && (
          <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-400 text-sm">
            <p className="font-medium mb-1">You are offline</p>
            <p className="text-xs text-yellow-400/80">
              Report export requires an internet connection. Please connect to generate reports.
            </p>
          </div>
        )}
      </main>

      {/* Report Builder Modal */}
      <ReportBuilderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExport={handleExport}
      />
    </div>
  );
}
