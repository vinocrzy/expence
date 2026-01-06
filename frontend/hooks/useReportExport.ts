'use client';

import { useState } from 'react';

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
  accountIds?: string[];
  categoryIds?: string[];
  tags?: string[];
}

interface UseReportExportReturn {
  exportReport: (type: ReportType, format: ReportFormat, filters: ReportFilters) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  shareReport: (blob: Blob, filename: string) => Promise<void>;
}

export function useReportExport(): UseReportExportReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportReport = async (
    type: ReportType,
    format: ReportFormat,
    filters: ReportFilters
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          type,
          format,
          filters
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed: ${response.statusText}`);
      }

      // Get the blob
      const blob = await response.blob();
      
      // Generate filename from response header or default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${type.toLowerCase()}-report.${format === 'EXCEL' ? 'xlsx' : 'pdf'}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download the file
      downloadBlob(blob, filename);
      
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export report');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const shareReport = async (blob: Blob, filename: string): Promise<void> => {
    try {
      // Convert blob to File
      const file = new File([blob], filename, { type: blob.type });

      // Check if Web Share API is supported and can share files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Financial Report',
          text: 'Here is your financial report'
        });
      } else {
        // Fallback to download
        downloadBlob(blob, filename);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
        // Fallback to download
        downloadBlob(blob, filename);
      }
    }
  };

  return {
    exportReport,
    isLoading,
    error,
    shareReport
  };
}

/**
 * Helper function to download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 100);
}
