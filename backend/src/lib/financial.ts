export class FinancialCalculator {
  
  /**
   * Calculate EMI for Reducing Balance Method
   * P = Principal
   * r = Monthly Interest Rate (Annual Rate / 12 / 100)
   * n = Tenure in Months
   */
  static pmts(principal: number, annualRate: number, months: number): number {
    if (annualRate === 0) return principal / months;
    
    const r = annualRate / 12 / 100;
    const numerator = principal * r * Math.pow(1 + r, months);
    const denominator = Math.pow(1 + r, months) - 1;
    return numerator / denominator;
  }

  /**
   * Generate Amortization Schedule
   */
  static generateSchedule(principal: number, annualRate: number, tenureMonths: number, startDate: Date) {
    const emi = this.pmts(principal, annualRate, tenureMonths);
    const monthlyRate = annualRate / 12 / 100;
    
    let balance = principal;
    const schedule: {
        emiNumber: number;
        dueDate: Date;
        principalComponent: number;
        interestComponent: number;
        totalAmount: number;
        balance: number;
    }[] = [];
    let currentDate = new Date(startDate);

    for (let i = 1; i <= tenureMonths; i++) {
        const interest = balance * monthlyRate;
        const principalComponent = emi - interest;
        balance -= principalComponent;
        
        // Handle last month precision
        if (balance < 0) balance = 0;

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);

        schedule.push({
            emiNumber: i,
            dueDate: new Date(currentDate), // Clone date
            principalComponent,
            interestComponent: interest,
            totalAmount: emi,
            balance: balance > 0.01 ? balance : 0
        });
        
        if (balance <= 0) break;
    }
    
    return schedule;
  }
}
