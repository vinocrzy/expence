'use client';

import { useState, useEffect } from 'react';
import { X, FileDown, FileSpreadsheet, FileText, Calendar, Check, ChevronDown, Filter, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Category, Account } from '@/lib/db-types';

type ReportType = 
  | 'CONSOLIDATED'
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

interface ReportBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (type: ReportType, format: ReportFormat, filters: ReportFilters) => Promise<void>;
}

const reportTypes = [
  { value: 'CONSOLIDATED', label: 'Consolidated', description: 'Full analysis', icon: FileSpreadsheet },
  { value: 'EXPENSE', label: 'Expenses', description: 'Category breakdown', icon: FileText },
  { value: 'INCOME', label: 'Income', description: 'Source analysis', icon: FileSpreadsheet },
  { value: 'INVESTMENT', label: 'Investments', description: 'Portfolio tracking', icon: TrendingUp },
  { value: 'DEBT', label: 'Debt Log', description: 'Transaction history', icon: FileText },
  { value: 'ACCOUNT_SUMMARY', label: 'Accounts', description: 'Balance & flows', icon: FileText },
  { value: 'YEARLY_SUMMARY', label: 'Yearly', description: 'Annual trends', icon: Calendar },
  { value: 'LOAN', label: 'Loans', description: 'EMI details', icon: FileText },
  { value: 'CREDIT_CARD', label: 'Credit Cards', description: 'Statements', icon: FileText },
  { value: 'BUDGET_VS_ACTUAL', label: 'Budget', description: 'Plan vs Actual', icon: FileSpreadsheet },
  { value: 'TRIP_EVENT', label: 'Trips/Events', description: 'Tag grouping', icon: Calendar },
];

const datePresets = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3_months' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Custom', value: 'custom' },
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
      const { accountService, categoryService, creditCardService, getHouseholdId } = await import('@/lib/localdb-services');
      
      const householdId = await getHouseholdId();
      if (!householdId) return;
      
      const [accountsData, categoriesData, creditCardsData] = await Promise.all([
        accountService.getAll(householdId),
        categoryService.getAll(householdId),
        creditCardService.getAll(householdId)
      ]);
      
      // Merge accounts and credit cards for the filter list
      const allAccounts = [
          ...(accountsData || []),
          ...(creditCardsData || []).map(cc => ({ ...cc, type: 'Credit Card', currency: 'INR' })) // Normalize type
      ] as any[]; // Type assertion for UI
      
      setAccounts(allAccounts);
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
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 transition-opacity"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none"
          >
            {/* Modal Content */}
            <div className="w-full max-w-2xl bg-[#1c1c1e] rounded-t-[2rem] sm:rounded-[2rem] border-t sm:border border-white/10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto sm:mb-8 max-h-[90vh] flex flex-col">
              
              {/* Header */}
              <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        Create Report
                    </h2>
                    <p className="text-sm text-gray-400">Export your data</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 space-y-8 pb-6 custom-scrollbar">
                
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                        {error}
                    </div>
                )}

                {/* Section: Report Type */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Report Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {reportTypes.map((type) => {
                            const isSelected = reportType === type.value;
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => setReportType(type.value as ReportType)}
                                    className={`relative p-3 rounded-2xl border transition-all duration-200 text-left group overflow-hidden ${
                                        isSelected 
                                            ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/20' 
                                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                                    <div className={`text-xs font-bold mb-0.5 ${isSelected ? 'text-white' : 'text-gray-300'}`}>{type.label}</div>
                                    <div className={`text-[10px] leading-tight ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{type.description}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Section: Date Range */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Period</label>
                    
                    {/* Pills */}
                    <div className="flex flex-wrap gap-2">
                        {datePresets.map((preset) => (
                            <button
                                key={preset.value}
                                onClick={() => setDatePreset(preset.value)}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                    datePreset === preset.value
                                        ? 'bg-white text-black border-white'
                                        : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom Date Inputs */}
                    <AnimatePresence>
                        {datePreset === 'custom' && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="grid grid-cols-2 gap-4 overflow-hidden"
                            >
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 pl-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-[#2c2c2e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 pl-1">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-[#2c2c2e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Section: Format */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Format</label>
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                        <button
                            onClick={() => setFormat('EXCEL')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                format === 'EXCEL' ? 'bg-[#2c2c2e] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            <FileSpreadsheet className="w-4 h-4" /> Excel
                        </button>
                        <button
                            onClick={() => setFormat('PDF')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                format === 'PDF' ? 'bg-[#2c2c2e] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            <FileText className="w-4 h-4" /> PDF
                        </button>
                    </div>
                </div>

                {/* Optional Filters */}
                <div className="space-y-4 pt-2 border-t border-white/5">
                    <div 
                        className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors"
                        onClick={() => { /* Ensure this is clearly optional */ }}
                    >
                        <Filter className="w-4 h-4" /> 
                         <span className="font-medium">Optional Filters</span>
                    </div>

                    {/* Accounts */}
                    <div>
                         <div className="text-xs text-gray-500 mb-2 pl-1">Accounts</div>
                         <div className="flex flex-wrap gap-2">
                            {accounts.map(account => {
                                const isSelected = selectedAccounts.includes(account.id);
                                return (
                                    <button
                                        key={account.id}
                                        onClick={() => toggleAccount(account.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                                            isSelected 
                                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' 
                                                : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                                        }`}
                                    >
                                        {isSelected && <Check className="w-3 h-3" />}
                                        {account.name}
                                    </button>
                                );
                            })}
                         </div>
                    </div>

                    {/* Categories */}
                    <div>
                         <div className="text-xs text-gray-500 mb-2 pl-1">Categories</div>
                         <div className="flex flex-wrap gap-2">
                            {categories.map(category => {
                                const isSelected = selectedCategories.includes(category.id);
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => toggleCategory(category.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                                            isSelected 
                                                ? 'text-white border-white/20'
                                                : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                                        }`}
                                        style={{ backgroundColor: isSelected ? category.color : undefined }}
                                    >
                                        {isSelected && <Check className="w-3 h-3" />}
                                        {category.name}
                                    </button>
                                );
                            })}
                         </div>
                    </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 pt-4 border-t border-white/10 bg-[#1c1c1e] z-10 shrink-0">
                  <button
                    onClick={handleExport}
                    disabled={isLoading}
                    className="w-full py-4 bg-white text-black rounded-2xl font-bold text-lg hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-white/5"
                  >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                            Processing...
                        </>
                    ) : (
                        <>
                            <FileDown className="w-5 h-5" />
                            Generate Report
                        </>
                    )}
                  </button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
