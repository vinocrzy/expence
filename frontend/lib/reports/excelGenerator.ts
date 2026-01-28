import ExcelJS from 'exceljs';
import { ReportData, ReportType } from './types';

export async function generateExcel(data: ReportData, type: ReportType): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type);

  // Title
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = data.title;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // Subtitle
  if (data.subtitle) {
    worksheet.mergeCells('A2:E2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = data.subtitle;
    subtitleCell.alignment = { horizontal: 'center' };
  }

  // Generated Date
  worksheet.mergeCells('A3:E3');
  const dateCell = worksheet.getCell('A3');
  dateCell.value = `Generated on: ${new Date(data.generatedAt).toLocaleString()}`;
  dateCell.alignment = { horizontal: 'right' };
  dateCell.font = { italic: true, size: 10 };

  // Summary Section
  let currentRow = 5;
  if (data.summary) {
    const summaryHeader = worksheet.getCell(`A${currentRow}`);
    summaryHeader.value = 'Summary';
    summaryHeader.font = { bold: true };
    currentRow++;

    Object.entries(data.summary).forEach(([key, value]) => {
      worksheet.getCell(`A${currentRow}`).value = key;
      worksheet.getCell(`B${currentRow}`).value = value;
      currentRow++;
    });
    currentRow += 1; // Spacing
  }

  // Table Header
  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = data.headers;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF424242' } // Dark gray
  };
  currentRow++;

  // Table Rows
  data.rows.forEach(row => {
    const r = worksheet.getRow(currentRow);
    r.values = row;
    currentRow++;
  });

  // Auto-fit columns (rough approximation)
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = maxLength < 10 ? 10 : maxLength > 50 ? 50 : maxLength + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
