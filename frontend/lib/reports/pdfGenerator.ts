import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportData, ReportType } from './types';

export async function generatePDF(data: ReportData, type: ReportType): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Title
  doc.setFontSize(18);
  doc.text(data.title, pageWidth / 2, 20, { align: 'center' });

  // Subtitle
  if (data.subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(data.subtitle, pageWidth / 2, 30, { align: 'center' });
  }

  // Generated Date
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`Generated on: ${new Date(data.generatedAt).toLocaleString()}`, pageWidth - 15, 10, { align: 'right' });

  // Summary Section
  let startY = 40;
  if (data.summary) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Summary', 14, startY);
    startY += 10;
    
    doc.setFontSize(10);
    Object.entries(data.summary).forEach(([key, value]) => {
      const displayValue = typeof value === 'number' 
        ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
        : value;
      doc.text(`${key}: ${displayValue}`, 14, startY);
      startY += 7;
    });
    startY += 10; // Extra spacing before table
  }

  // Table
  autoTable(doc, {
    startY,
    head: [data.headers],
    body: data.rows.map(row => row.map(cell => {
      // Format numbers in the table if they look like currency (simple heuristic)
      if (typeof cell === 'number') {
        return cell.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return cell;
    })),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [66, 66, 66] }, // Dark grey header
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  return doc.output('blob');
}
