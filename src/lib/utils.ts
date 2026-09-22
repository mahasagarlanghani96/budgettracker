import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Pakistani notation (Rs. 1,23,456.00)
 * Uses lakh/crore grouping: last 3 digits, then groups of 2
 */
export function formatCurrency(amount: number | string | { toString(): string }, currency = 'PKR'): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount.toString());
  if (isNaN(num)) return 'Rs. 0';

  const isNegative = num < 0;
  const abs = Math.abs(num);
  const [intPart, decPart] = abs.toFixed(2).split('.');

  // Pakistani grouping: last 3 digits, then groups of 2
  let formatted = '';
  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const groups = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = groups + ',' + last3;
  }

  const prefix = currency === 'PKR' ? 'Rs. ' : currency + ' ';
  return `${isNegative ? '-' : ''}${prefix}${formatted}.${decPart}`;
}

/** Short format without decimals for dashboard cards */
export function formatCurrencyShort(amount: number | string | { toString(): string }, currency = 'PKR'): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount.toString());
  if (isNaN(num)) return 'Rs. 0';

  const isNegative = num < 0;
  const abs = Math.abs(num);

  const prefix = currency === 'PKR' ? 'Rs. ' : currency + ' ';

  if (abs >= 10000000) {
    return `${isNegative ? '-' : ''}${prefix}${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${isNegative ? '-' : ''}${prefix}${(abs / 100000).toFixed(2)} Lac`;
  }

  const [intPart] = abs.toFixed(0).split('.');
  let formatted = '';
  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const groups = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = groups + ',' + last3;
  }

  return `${isNegative ? '-' : ''}${prefix}${formatted}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd MMM yyyy');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd MMM yyyy, hh:mm a');
}

export type DateFilterType = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

export function getDateRange(
  filter: DateFilterType,
  customStart?: Date,
  customEnd?: Date
): { start: Date; end: Date } | null {
  const now = new Date();

  switch (filter) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'custom':
      if (customStart && customEnd) {
        return { start: startOfDay(customStart), end: endOfDay(customEnd) };
      }
      return null;
    case 'all':
      return null;
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

/** Generate a unique-enough ID for client-side use */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
