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
    <div className="bg-[#1c1c1e] rounded-3xl border border-white/5 overflow-hidden flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 border-b border-white/5 bg-black/20">
        {daysOfWeek.map(day => (
          <div key={day} className="py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-[#18181b]">
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
                'min-h-[80px] p-2 border-b border-r border-white/5 transition-all cursor-pointer relative group flex flex-col justify-between',
                isCurrentMonth ? 'bg-transparent' : 'bg-black/40 text-gray-700',
                isToday && 'bg-purple-900/10'
              )}
            >
              <div className="flex justify-between items-start">
                <span className={clsx(
                  "text-xs font-bold rounded-lg w-7 h-7 flex items-center justify-center transition-all",
                  isToday 
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/50" 
                    : isCurrentMonth 
                        ? "text-gray-400 group-hover:bg-white/10 group-hover:text-white" 
                        : "text-gray-700"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="mt-1 space-y-1">
                {dayStats?.income > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 font-bold truncate">
                    <span>+</span>
                    <span>{Math.round(dayStats.income / 1000)}k</span>
                  </div>
                )}
                {dayStats?.expense > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 font-bold truncate">
                    <span>-</span>
                    <span>{Math.round(dayStats.expense / 1000)}k</span>
                  </div>
                )}
              </div>

               {/* Hover Effect */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none" />
              
              {/* Today Indicator Border (optional) */}
              {isToday && <div className="absolute inset-0 border-2 border-purple-500/30 pointer-events-none" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
