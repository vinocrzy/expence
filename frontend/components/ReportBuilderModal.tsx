'use client';

import { useState, useEffect } from 'react';
import { X, FileDown, FileSpreadsheet, FileText, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ReportType = 
  | 'EXPENSE' 
  | 'INCOME' 
  | 'ACCOUNT_SUMMARY' 
  | 'LOAN' 
  | 'CREDIT_CARD' 
  | 'BUDGET_VS_ACTUAL' 
  | 'TRIP_EVENT' 
  | 'YEARLY_SUMMARY';

type ReportFormat = 'EXCEL' | 'PDF';

interface ReportFilters {
  startDate: string;
  endDate: string;
  accountIds: string[];
  categoryIds: string[];
  tags: string[];
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  kind: string;
  color?: string;
}

interface ReportBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (type: ReportType, format: ReportFormat, filters: ReportFilters) => Promise<void>;
}

const reportTypes = [
  { value: 'EXPENSE', label: 'Expense Report', description: 'All expense transactions grouped by category' },
  { value: 'INCOME', label: 'Income Report', description: 'All income transactions grouped by source' },
  { value: 'ACCOUNT_SUMMARY', label: 'Account Summary', description: 'Balance and activity per account' },
  { value: 'LOAN', label: 'Loan Report', description: 'EMI schedule and payment history' },
  { value: 'CREDIT_CARD', label: 'Credit Card Report', description: 'Statement history and outstanding amounts' },
  { value: 'BUDGET_VS_ACTUAL', label: 'Budget vs Actual', description: 'Compare budgeted vs actual spending' },
  { value: 'TRIP_EVENT', label: 'Trip/Event Report', description: 'Tag-based expense grouping' },
  { value: 'YEARLY_SUMMARY', label: 'Yearly Summary', description: 'Month-by-month income and expense trends' },
];

const datePresets = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3_months' },
  { label: 'Last 6 Months', value: 'last_6_months' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'Custom Range', value: 'custom' },
];

export default function ReportBuilderModal({ isOpen, onClose, onExport }: ReportBuilderModalProps) {
  const [reportType, setReportType] = useState<ReportType>('EXPENSE');
  const [format, setFormat] = useState<ReportFormat>('EXCEL');
  const [datePreset, setDatePreset] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch metadata on mount
  useEffect(() => {
    if (isOpen) {
      fetchMetadata();
      loadSavedPreferences();
      updateDatesFromPreset('this_month');
    }
  }, [isOpen]);

  // Update dates when preset changes
  useEffect(() => {
    if (datePreset !== 'custom') {
      updateDatesFromPreset(datePreset);
    }
  }, [datePreset]);

  const fetchMetadata = async () => {
    try {
      const { accountService, categoryService } = await import('@/lib/localdb-services');
      const { userService } = await import('@/lib/localdb-services');
      
      const user = await userService.getCurrent();
      if (!user?.householdId) return;
      
      const [accountsData, categoriesData] = await Promise.all([
        accountService.getAll(user.householdId),
        categoryService.getAll(user.householdId)
      ]);
      
      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
      // Tags can be extracted from transactions if needed
      setAvailableTags([]);
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  };

  const updateDatesFromPreset = (preset: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last_3_months':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_6_months':
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last_year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const loadSavedPreferences = () => {
    try {
      const saved = localStorage.getItem('report_preferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.reportType) setReportType(prefs.reportType);
        if (prefs.format) setFormat(prefs.format);
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  const savePreferences = () => {
    const prefs = {
      reportType,
      format,
      datePreset,
      selectedAccounts,
      selectedCategories,
      selectedTags
    };
    localStorage.setItem('report_preferences', JSON.stringify(prefs));
  };

  const handleExport = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const filters: ReportFilters = {
        startDate,
        endDate,
        accountIds: selectedAccounts,
        categoryIds: selectedCategories,
        tags: selectedTags
      };

      savePreferences();
      await onExport(reportType, format, filters);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to export report');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-3xl max-h-[90vh] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FileDown className="w-6 h-6 text-cyan-400" />
                  Create Report
                </h2>
                <p className="text-sm text-gray-400 mt-1">Export your financial data</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Report Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reportTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setReportType(type.value as ReportType)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        reportType === type.value
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                      }`}
                    >
                      <div className="font-medium text-white text-sm">{type.label}</div>
                      <div className="text-xs text-gray-400 mt-1">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Date Range
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {datePresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setDatePreset(preset.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        datePreset === preset.value
                          ? 'bg-cyan-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {datePreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Export Format
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setFormat('EXCEL')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      format === 'EXCEL'
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${format === 'EXCEL' ? 'text-green-400' : 'text-gray-400'}`} />
                    <div className="text-sm font-medium text-white text-center">Excel (.xlsx)</div>
                    <div className="text-xs text-gray-400 text-center mt-1">Editable spreadsheet</div>
                  </button>

                  <button
                    onClick={() => setFormat('PDF')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      format === 'PDF'
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <FileText className={`w-8 h-8 mx-auto mb-2 ${format === 'PDF' ? 'text-red-400' : 'text-gray-400'}`} />
                    <div className="text-sm font-medium text-white text-center">PDF</div>
                    <div className="text-xs text-gray-400 text-center mt-1">Printable document</div>
                  </button>
                </div>
              </div>

              {/* Filters - Accounts */}
              {accounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Accounts (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {accounts.map(account => (
                      <button
                        key={account.id}
                        onClick={() => toggleAccount(account.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedAccounts.includes(account.id)
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {account.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters - Categories */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Categories (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedCategories.includes(category.id)
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                        style={selectedCategories.includes(category.id) && category.color ? {
                          backgroundColor: category.color,
                          color: 'white'
                        } : undefined}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters - Tags (for trip/event reports) */}
              {reportType === 'TRIP_EVENT' && availableTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedTags.includes(tag)
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isLoading || !startDate || !endDate}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                {isLoading ? 'Generating...' : 'Export Report'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
