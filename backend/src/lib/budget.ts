import { startOfMonth, endOfMonth, addMonths, subMonths, setDate, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export interface BudgetContext {
    mode: 'CALENDAR' | 'SALARY' | 'CASHFLOW';
    startDate: Date;
    endDate: Date;
    description: string;
}

export function getBudgetContext(
    date: Date = new Date(),
    mode: string = 'CALENDAR',
    configStr: string | null = null
): BudgetContext {
    let startDate = startOfMonth(date);
    let endDate = endOfMonth(date);
    let description = 'Calendar Month';

    const config = configStr ? JSON.parse(configStr) : {};

    if (mode === 'SALARY') {
        const salaryDay = config.salaryDay || 1;
        const currentDay = date.getDate();
        
        // If today is 20th and salary is 25th:
        // Window = 25th Prev Month to 24th This Month
        
        // If today is 26th and salary is 25th:
        // Window = 25th This Month to 24th Next Month
        
        let startCycle: Date;
        
        if (currentDay >= salaryDay) {
            startCycle = setDate(date, salaryDay);
        } else {
            startCycle = setDate(subMonths(date, 1), salaryDay);
        }
        
        startDate = startOfDay(startCycle);
        endDate = endOfDay(setDate(addMonths(startCycle, 1), salaryDay - 1)); // Actually day before salary day? Or same day? Usually T-1.
        // But if salaryDay is 1, T-1 is 0 (last day of prev month). setDate correct handles this!
        
        description = `Salary Cycle (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;
    } 
    else if (mode === 'CASHFLOW') {
        // "Today -> Next Income Date"
        // This requires accessing Recurring Rules or Transactions which implies DB access.
        // This utility function is currently pure.
        // We might need to pass "nextIncomeDate" as an arg or handle this in the service layer.
        
        // As a fallback / pure implementation:
        // Use today as start.
        startDate = startOfDay(date);
        
        // If we have a 'nextIncomeDate' in config (updated by a background job?), use it.
        // Otherwise, default to +30 days?
        // Let's assume the Caller/Service resolves nextIncomeDate if mode is CASHFLOW.
        // For now, let's just default to end of month as pure fallback, but logic belongs in Service.
        
        // Let's rely on config.nextIncomeDate if present.
        if (config.nextIncomeDate) {
             endDate = endOfDay(new Date(config.nextIncomeDate));
        } else {
             // Fallback: 30 days lookahead
             const d = new Date(date);
             d.setDate(d.getDate() + 30);
             endDate = endOfDay(d);
        }
        
        description = `Cashflow Window (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;
    }

    return {
        mode: mode as any,
        startDate,
        endDate,
        description
    };
}
