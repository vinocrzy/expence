import React, { useMemo } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { Transaction } from '../lib/db-types';

interface CalendarViewProps {
  transactions: Transaction[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDaySelect: (date: Date) => void;
}

export default function CalendarView({ 
  transactions, 
  currentMonth, 
  onMonthChange, 
  onDaySelect 
}: CalendarViewProps) {
  
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    return eachDayOfInterval({
      start: startDate,
      end: endDate,
    });
  }, [currentMonth]);

  const dailyStats = useMemo(() => {
    const stats: Record<string, { income: number; expense: number; count: number }> = {};
    
    transactions.forEach(t => {
      // Assuming t.date is parsable string
      const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
      
      if (!stats[dateKey]) {
        stats[dateKey] = { income: 0, expense: 0, count: 0 };
      }
      
      stats[dateKey].count++;
      
      if (t.type === 'INCOME') {
        stats[dateKey].income += Number(t.amount);
      } else if (t.type === 'EXPENSE') {
        stats[dateKey].expense += Number(t.amount);
      }
      // Transfers might be excluded or handled differently, ignoring for stats for now or treat as neutral
    });
    
    return stats;
  }, [transactions]);

  const nextMonth = () => onMonthChange(addMonths(currentMonth, 1));
  const prevMonth = () => onMonthChange(subMonths(currentMonth, 1));

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700/50 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 border-b border-gray-700 bg-gray-800/80">
        {daysOfWeek.map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-gray-900/50">
        {calendarDays.map((day, dayIdx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayStats = dailyStats[dateKey];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toString()}
              onClick={() => onDaySelect(day)}
              className={clsx(
                'min-h-[80px] p-2 border-b border-r border-gray-800 transition-colors cursor-pointer relative group',
                isCurrentMonth ? 'bg-transparent' : 'bg-gray-900/30 text-gray-600',
                isToday && 'bg-purple-900/10'
              )}
            >
              <div className="flex justify-between items-start">
                <span className={clsx(
                  "text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center",
                  isToday 
                    ? "bg-purple-500 text-white" 
                    : isCurrentMonth ? "text-gray-400" : "text-gray-700"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="mt-1 space-y-0.5">
                {dayStats?.income > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-green-400 font-medium truncate">
                    <span>+</span>
                    <span>{Math.round(dayStats.income).toLocaleString()}</span>
                  </div>
                )}
                {dayStats?.expense > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-red-400 font-medium truncate">
                    <span>-</span>
                    <span>{Math.round(dayStats.expense).toLocaleString()}</span>
                  </div>
                )}
                 {/* Mobile Dot Indicator for very small screens if needed, mostly handled by truncate */}
              </div>

               {/* Hover Effect */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
