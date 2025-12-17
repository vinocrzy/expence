import { format, parseISO, startOfDay, eachDayOfInterval } from 'date-fns';

export function getDaysInterval(start: Date, end: Date) {
  return eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });
}

export function formatDate(date: Date, fmt: string = 'yyyy-MM-dd') {
  return format(date, fmt);
}
