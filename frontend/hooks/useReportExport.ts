'use client';

import { useState } from 'react';
import { exportReport, ReportType, ReportFormat, ReportFilters } from '@/lib/reports';

interface UseReportExportReturn {
  exportReport: (type: ReportType, format: ReportFormat, filters: ReportFilters) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  shareReport: (blob: Blob, filename: string) => Promise<void>;
}

export function useReportExport(): UseReportExportReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (
    type: ReportType,
    format: ReportFormat,
    filters: ReportFilters
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate the report locally
      const blob = await exportReport(type, format, filters);
      
      const filename = `${type.toLowerCase()}-report.${format === 'EXCEL' ? 'xlsx' : 'pdf'}`;
      
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
    exportReport: handleExport,
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
