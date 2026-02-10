import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportData, ReportType } from './types';

export async function generatePDF(data: ReportData, type: ReportType): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // --- Header Section ---
  doc.setFillColor(30, 41, 59); // Dark slate blue
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(data.title.toUpperCase(), pageWidth / 2, 20, { align: 'center' });
  
  if (data.subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(203, 213, 225); // Light gray
    doc.text(data.subtitle, pageWidth / 2, 30, { align: 'center' });
  }

  // Meta Info
  doc.setTextColor(100);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date(data.generatedAt).toLocaleDateString()}`, pageWidth - 15, 48, { align: 'right' });

  let startY = 55;

  // --- Consolidated Summary Table ---
  if (type === 'CONSOLIDATED' && data.consolidatedSummary) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Account Balances Summary', 14, startY);
      startY += 5;

      const summaryData = data.consolidatedSummary.map(s => [
          s.accountName,
          s.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 }),
          s.income.toLocaleString(undefined, { minimumFractionDigits: 2 }),
          s.expense.toLocaleString(undefined, { minimumFractionDigits: 2 }),
          s.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })
      ]);

      autoTable(doc, {
          startY,
          head: [['Account', 'Opening', 'Income', 'Expense', 'Closing']],
          body: summaryData,
          styles: { fontSize: 10, cellPadding: 3 },
          headStyles: { fillColor: [71, 85, 105], halign: 'center' },
          columnStyles: {
              1: { halign: 'right' },
              2: { halign: 'right', textColor: [22, 163, 74] }, // Income Green
              3: { halign: 'right', textColor: [220, 38, 38] }, // Expense Red
              4: { halign: 'right', fontStyle: 'bold' }
          }
      });
      // @ts-ignore
      startY = doc.lastAutoTable.finalY + 15;
  }

  // --- Visual Charts (Pie Chart for Category Breakdown) ---
  if (data.categoryBreakdown && Object.keys(data.categoryBreakdown).length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Expense Breakdown', 14, startY);
      
      const entries = Object.entries(data.categoryBreakdown).sort((a,b) => b[1] - a[1]).slice(0, 6); // Top 6
      const total = entries.reduce((sum, item) => sum + item[1], 0);
      
      const centerX = 60;
      const centerY = startY + 40;
      const radius = 25;
      
      const colors = [
          [59, 130, 246], // Blue
          [16, 185, 129], // Green
          [245, 158, 11], // Orange
          [239, 68, 68],  // Red
          [168, 85, 247], // Purple
          [236, 72, 153], // Pink
      ]

      // Helper to draw a single sector
      const drawSector = (cx: number, cy: number, r: number, startAngle: number, endAngle: number, color: number[]) => {
          const rad = Math.PI / 180;
          const x1 = cx + r * Math.cos(startAngle * rad);
          const y1 = cy + r * Math.sin(startAngle * rad);
          const x2 = cx + r * Math.cos(endAngle * rad);
          const y2 = cy + r * Math.sin(endAngle * rad);

          doc.setFillColor(color[0], color[1], color[2]);
          
          // If angle is 360, draw circle
          if (endAngle - startAngle >= 360) {
             doc.circle(cx, cy, r, 'F');
             return;
          }

          doc.lines(
             [[x1 - cx, y1 - cy], // Line to first point
             ...approximateArc(cx, cy, r, startAngle, endAngle), // Arc points
             [cx - x2, cy - y2]], // Line back to center
             cx, cy, [1, 1], 'F', true // Scale 1,1, Fill, Closed
          );
      };

      // Helper to generate small line segments for an arc (Simple approximation)
      const approximateArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
          const points = [];
          const step = 10; // degrees per step
          const rad = Math.PI / 180;
          
          let current = startAngle;
          let lastX = cx + r * Math.cos(startAngle * rad);
          let lastY = cy + r * Math.sin(startAngle * rad);

          while (current < endAngle) {
              current += step;
              if (current > endAngle) current = endAngle;
              
              const x = cx + r * Math.cos(current * rad);
              const y = cy + r * Math.sin(current * rad);
              
              points.push([x - lastX, y - lastY]);
              lastX = x;
              lastY = y;
          }
          return points;
      };
      
      let currentAngle = 0;
      entries.forEach(([cat, val], index) => {
          const sliceAngle = (val / total) * 360;
          const color = colors[index % colors.length];
          
          if (sliceAngle > 0) {
            drawSector(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle, color);
          }

          // Legend
          const legendY = startY + 20 + (index * 8);
          doc.setFillColor(color[0], color[1], color[2]);
          doc.rect(100, legendY - 3, 6, 6, 'F');
          doc.setTextColor(50);
          doc.setFontSize(10);
          doc.text(`${cat} (${((val/total)*100).toFixed(1)}%) - ${val.toLocaleString()}`, 110, legendY + 1);
          
          currentAngle += sliceAngle;
      });

      startY += 80;
  }

  // --- Summary Text Section ---
  if (data.summary) {
    // Only show if not CONSOLIDATED (as it has its own table), or if it's general summary
    if (type !== 'CONSOLIDATED') {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Key Metrics', 14, startY);
        startY += 8;
        
        doc.setFontSize(10);
        Object.entries(data.summary).forEach(([key, value]) => {
          const displayValue = typeof value === 'number' 
            ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
            : value;
          doc.text(`${key}: ${displayValue}`, 14, startY);
          startY += 6;
        });
        startY += 10;
    } else {
        // For consolidated, just show Net Change if available
        if (data.summary['Net Change']) {
             doc.setFontSize(12);
             doc.setTextColor(80);
             doc.text(`Total Period Net Change: ${Number(data.summary['Net Change']).toLocaleString()}`, 14, startY);
             startY += 10;
        }
    }
  }

  // --- Transaction Table ---
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(type === 'CONSOLIDATED' ? 'Transaction Details' : 'Data', 14, startY);
  startY += 5;

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
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85], valign: 'middle' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: type === 'CONSOLIDATED' ? {
        5: { halign: 'right', fontStyle: 'bold' } // Amount column
    } : {}
  });

  return doc.output('blob');
}
