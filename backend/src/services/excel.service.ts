import ExcelJS from 'exceljs';
import { ReportData } from '../schemas/report.schema';

/**
 * Generates an Excel workbook from report data
 */
export async function generateExcelReport(reportData: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'PocketTogether';
  workbook.created = new Date();
  
  // Add Summary Sheet
  addSummarySheet(workbook, reportData);
  
  // Add Transactions Sheet (if applicable)
  if (reportData.transactions && reportData.transactions.length > 0) {
    addTransactionsSheet(workbook, reportData);
  }
  
  // Add Category Breakdown Sheet (if applicable)
  if (reportData.categoryBreakdown && reportData.categoryBreakdown.length > 0) {
    addCategoryBreakdownSheet(workbook, reportData);
  }
  
  // Add Account Breakdown Sheet (if applicable)
  if (reportData.accountBreakdown && reportData.accountBreakdown.length > 0) {
    addAccountBreakdownSheet(workbook, reportData);
  }
  
  // Add Loan Schedule Sheet (if applicable)
  if (reportData.loanSchedule) {
    addLoanScheduleSheet(workbook, reportData);
  }
  
  // Add Credit Card Statements Sheet (if applicable)
  if (reportData.creditCardStatements) {
    addCreditCardStatementsSheet(workbook, reportData);
  }
  
  // Add Budget Comparison Sheet (if applicable)
  if (reportData.budgetComparison && reportData.budgetComparison.length > 0) {
    addBudgetComparisonSheet(workbook, reportData);
  }
  
  // Add Monthly Trends Sheet (if applicable)
  if (reportData.monthlyTrends && reportData.monthlyTrends.length > 0) {
    addMonthlyTrendsSheet(workbook, reportData);
  }
  
  // @ts-ignore - ExcelJS Buffer type works fine at runtime
  return await workbook.xlsx.writeBuffer();
}

/**
 * Add Summary Sheet
 */
function addSummarySheet(workbook: ExcelJS.Workbook, reportData: ReportData) {
  const sheet = workbook.addWorksheet('Summary');
  
  // Title
  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `${reportData.reportType.replace(/_/g, ' ')} REPORT`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };
  
  // Metadata
  sheet.getCell('A3').value = 'Household:';
  sheet.getCell('B3').value = reportData.householdName;
  sheet.getCell('A4').value = 'Date Range:';
  sheet.getCell('B4').value = `${reportData.dateRange.start} to ${reportData.dateRange.end}`;
  sheet.getCell('A5').value = 'Generated:';
  sheet.getCell('B5').value = reportData.generatedAt.toLocaleString();
  
  // Summary Metrics
  sheet.getCell('A7').value = 'SUMMARY';
  sheet.getCell('A7').font = { bold: true, size: 14 };
  
  sheet.getCell('A9').value = 'Total Income:';
  sheet.getCell('B9').value = reportData.summary.totalIncome;
  sheet.getCell('B9').numFmt = '₹#,##0.00';
  sheet.getCell('B9').font = { bold: true, color: { argb: 'FF10B981' } };
  
  sheet.getCell('A10').value = 'Total Expense:';
  sheet.getCell('B10').value = reportData.summary.totalExpense;
  sheet.getCell('B10').numFmt = '₹#,##0.00';
  sheet.getCell('B10').font = { bold: true, color: { argb: 'FFEF4444' } };
  
  sheet.getCell('A11').value = 'Net Savings:';
  sheet.getCell('B11').value = reportData.summary.netSavings;
  sheet.getCell('B11').numFmt = '₹#,##0.00';
  sheet.getCell('B11').font = { bold: true };
  
  sheet.getCell('A12').value = 'Transaction Count:';
  sheet.getCell('B12').value = reportData.summary.transactionCount;
  
  // Styling
  sheet.getColumn('A').width = 20;
  sheet.getColumn('B').width = 25;
}

/**
 * Add Transactions Sheet
 */
function addTransactionsSheet(workbook: ExcelJS.Workbook, reportData: ReportData) {
  const sheet = workbook.addWorksheet('Transactions');
  
  // Headers
  const headerRow = sheet.addRow(['Date', 'Description', 'Category', 'Account', 'Amount', 'Type', 'Tags']);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };
  
  // Data rows
  reportData.transactions!.forEach((txn, index) => {
    const row = sheet.addRow([
      txn.date,
      txn.description,
      txn.category,
      txn.account,
      txn.amount,
      txn.type,
      txn.tags || ''
    ]);
    
    // Currency format for amount
    row.getCell(5).numFmt = '₹#,##0.00';
    
    // Alternating row colors
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };
    }
  });
  
  // Totals row
  const totalRow = sheet.addRow([
    '', '', '', 'TOTAL:',
    reportData.summary.totalExpense || reportData.summary.totalIncome,
    '', ''
  ]);
  totalRow.font = { bold: true };
  totalRow.getCell(5).numFmt = '₹#,##0.00';
  
  // Auto-fit columns
  sheet.columns.forEach(column => {
    column.width = 15;
  });
  sheet.getColumn(2).width = 30; // Description
}

/**
 * Add Category Breakdown Sheet
 */
function addCategoryBreakdownSheet(workbook: ExcelJS.Workbook, reportData: ReportData) {
  const sheet = workbook.addWorksheet('Category Breakdown');
  
  // Headers
  const headerRow = sheet.addRow(['Category', 'Amount', 'Count', 'Percentage']);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };
  
  // Data rows
  reportData.categoryBreakdown!.forEach((cat, index) => {
    const row = sheet.addRow([
      cat.categoryName,
      cat.amount,
      cat.count,
      cat.percentage / 100
    ]);
    
    row.getCell(2).numFmt = '₹#,##0.00';
    row.getCell(4).numFmt = '0%';
    
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };
    }
  });
  
  // Totals
  const total = reportData.categoryBreakdown!.reduce((sum, cat) => sum + cat.amount, 0);
  const totalRow = sheet.addRow(['TOTAL', total, '', '']);
  totalRow.font = { bold: true };
  totalRow.getCell(2).numFmt = '₹#,##0.00';
  
  sheet.columns.forEach(column => {
    column.width = 20;
  });
}

/**
 * Add Account Breakdown Sheet
 */
function addAccountBreakdownSheet(workbook: ExcelJS.Workbook, reportData: ReportData) {
  const sheet = workbook.addWorksheet('Account Breakdown');
  
  const headerRow = sheet.addRow(['Account', 'Income', 'Expense', 'Balance']);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };
  
  reportData.accountBreakdown!.forEach((acc, index) => {
    const row = sheet.addRow([
      acc.accountName,
      acc.income,
      acc.expense,
      acc.balance
    ]);
    
    row.getCell(2).numFmt = '₹#,##0.00';
    row.getCell(3).numFmt = '₹#,##0.00';
    row.getCell(4).numFmt = '₹#,##0.00';
    
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };
    }
  });
  
  sheet.columns.forEach(column => {
    column.width = 20;
  });
}

/**
 * Add Loan Schedule Sheet
 */
function addLoanScheduleSheet(workbook: ExcelJS.Workbook, reportData: ReportData) {
  const sheet = workbook.addWorksheet('Loan Schedule');
  
  const loan = reportData.loanSchedule!;
  
  // Loan Info
  sheet.getCell('A1').value = 'Loan Name:';
  sheet.getCell('B1').value = loan.loanName;
  sheet.getCell('A2').value = 'Lender:';
  sheet.getCell('B2').value = loan.lender || 'N/A';
  sheet.getCell('A3').value = 'Principal:';
  sheet.getCell('B3').value = loan.principal;
  sheet.getCell('B3').numFmt = '₹#,##0.00';
  sheet.getCell('A4').value = 'Interest Rate:';
  sheet.getCell('B4').value = loan.interestRate / 100;
  sheet.getCell('B4').numFmt = '0.00%';
  sheet.getCell('A5').value = 'Outstanding:';
  sheet.getCell('B5').value = loan.outstandingPrincipal;
  sheet.getCell('B5').numFmt = '₹#,##0.00';
  
  // EMI Schedule
  sheet.getCell('A7').value = 'EMI SCHEDULE';
  sheet.getCell('A7').font = { bold: true };
  
  const headerRow = sheet.addRow(['EMI #', 'Due Date', 'Principal', 'Interest', 'Total', 'Status', 'Paid Date']);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };
  
  loan.emis.forEach((emi, index) => {
    const row = sheet.addRow([
      emi.emiNumber,
      emi.dueDate,
      emi.principalComponent,
      emi.interestComponent,
      emi.totalAmount,
      emi.status,
      emi.paidDate || ''
    ]);
    
    row.getCell(3).numFmt = '₹#,##0.00';
    row.getCell(4).numFmt = '₹#,##0.00';
    row.getCell(5).numFmt = '₹#,##0.00';
    
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };
    }
  });
  
  sheet.columns.forEach(column => {
    column.width = 15;
  });
}

/**
 * Add Credit Card Statements Sheet
 */
function addCreditCardStatementsSheet(workbook: ExcelJS.Workbook, reportData: ReportData) {
  const sheet = workbook.addWorksheet('Credit Card Statements');
  
  const card = reportData.creditCardStatements!;
  
  // Card Info
  sheet.getCell('A1').value = 'Card Name:';
  sheet.getCell('B1').value = card.cardName;
  sheet.getCell('A2').value = 'Issuer:';
  sheet.getCell('B2').value = card.issuer || 'N/A';
  sheet.getCell('A3').value = 'Credit Limit:';
  sheet.getCell('B3').value = card.creditLimit;
  sheet.getCell('B3').numFmt = '₹#,##0.00';
  sheet.getCell('A4').value = 'Outstanding:';
  sheet.getCell('B4').value = card.outstandingAmount;
  sheet.getCell('B4').numFmt = '₹#,##0.00';
  
  // Statements
  sheet.getCell('A6').value = 'STATEMENTS';
  sheet.getCell('A6').font = { bold: true };
  
  const headerRow = sheet.addRow(['Statement Date', 'Cycle Start', 'Cycle End', 'Spends', 'Payments', 'Closing Balance', 'Min Due', 'Due Date', 'Status']);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };
  
  card.statements.forEach((stmt, index) => {
    const row = sheet.addRow([
      stmt.statementDate,
      stmt.cycleStart,
      stmt.cycleEnd,
      stmt.totalSpends,
      stmt.totalPayments,
      stmt.closingBalance,
      stmt.minimumDue,
      stmt.dueDate,
      stmt.status
    ]);
    
    row.getCell(4).numFmt = '₹#,##0.00';
    row.getCell(5).numFmt = '₹#,##0.00';
    row.getCell(6).numFmt = '₹#,##0.00';
    row.getCell(7).numFmt = '₹#,##0.00';
    
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };
    }
  });
  
  sheet.columns.forEach(column => {
    column.width = 15;
  });
}

/**
 * Add Budget Comparison Sheet
 */
function addBudgetComparisonSheet(workbook: ExcelJS.Workbook, reportData: ReportData) {
  const sheet = workbook.addWorksheet('Budget vs Actual');
  
  const headerRow = sheet.addRow(['Category', 'Budgeted', 'Actual', 'Difference', '% Used']);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };
  
  reportData.budgetComparison!.forEach((item, index) => {
    const row = sheet.addRow([
      item.categoryName,
      item.budgeted,
      item.actual,
      item.difference,
      item.percentageUsed / 100
    ]);
    
    row.getCell(2).numFmt = '₹#,##0.00';
    row.getCell(3).numFmt = '₹#,##0.00';
    row.getCell(4).numFmt = '₹#,##0.00';
    row.getCell(5).numFmt = '0%';
    
    // Color code based on over/under budget
    if (item.difference < 0) {
      row.getCell(4).font = { color: { argb: 'FFEF4444' } }; // Over budget - red
    } else {
      row.getCell(4).font = { color: { argb: 'FF10B981' } }; // Under budget - green
    }
    
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };
    }
  });
  
  sheet.columns.forEach(column => {
    column.width = 20;
  });
}

/**
 * Add Monthly Trends Sheet
 */
function addMonthlyTrendsSheet(workbook: ExcelJS.Workbook, reportData: ReportData) {
  const sheet = workbook.addWorksheet('Monthly Trends');
  
  const headerRow = sheet.addRow(['Month', 'Income', 'Expense', 'Net Savings']);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };
  
  reportData.monthlyTrends!.forEach((trend, index) => {
    const row = sheet.addRow([
      trend.month,
      trend.income,
      trend.expense,
      trend.netSavings
    ]);
    
    row.getCell(2).numFmt = '₹#,##0.00';
    row.getCell(3).numFmt = '₹#,##0.00';
    row.getCell(4).numFmt = '₹#,##0.00';
    
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };
    }
  });
  
  // Totals
  const totalIncome = reportData.monthlyTrends!.reduce((sum, t) => sum + t.income, 0);
  const totalExpense = reportData.monthlyTrends!.reduce((sum, t) => sum + t.expense, 0);
  const netSavings = totalIncome - totalExpense;
  
  const totalRow = sheet.addRow(['TOTAL', totalIncome, totalExpense, netSavings]);
  totalRow.font = { bold: true };
  totalRow.getCell(2).numFmt = '₹#,##0.00';
  totalRow.getCell(3).numFmt = '₹#,##0.00';
  totalRow.getCell(4).numFmt = '₹#,##0.00';
  
  sheet.columns.forEach(column => {
    column.width = 20;
  });
}
