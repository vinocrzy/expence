import { fetchReportData } from './reportDataFetcher';
import { generatePDF } from './pdfGenerator';
import { generateExcel } from './excelGenerator';
import { ReportType, ReportFormat, ReportFilters } from './types';

export async function exportReport(
  type: ReportType, 
  format: ReportFormat, 
  filters: ReportFilters
): Promise<Blob> {
  // 1. Fetch Data
  const data = await fetchReportData(type, filters);

  // 2. Generate File
  if (format === 'PDF') {
    return generatePDF(data, type);
  } else {
    return generateExcel(data, type);
  }
}

export * from './types';
