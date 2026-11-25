import type { ResetCycle } from './types.ts';

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Calendar-aware (DST-safe) day arithmetic. */
export function addDays(t: number, n: number): number {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function startOfWeek(t: number, weekStartsOn: 0 | 1): number {
  const d = new Date(startOfDay(t));
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

export function startOfMonth(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function startOfYear(t: number): number {
  return new Date(new Date(t).getFullYear(), 0, 1).getTime();
}

export function cycleStart(cycle: ResetCycle, t: number, weekStartsOn: 0 | 1): number {
  switch (cycle) {
    case 'daily':
      return startOfDay(t);
    case 'weekly':
      return startOfWeek(t, weekStartsOn);
    case 'monthly':
      return startOfMonth(t);
    case 'yearly':
      return startOfYear(t);
  }
}

export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function daysBetween(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}

export function formatTime(t: number): string {
  const d = new Date(t);
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatDate(t: number): string {
  const d = new Date(t);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatHeaderDate(t: number): string {
  const d = new Date(t);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function formatMonthYear(t: number): string {
  const d = new Date(t);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "now", "5m ago", "3h ago", "2d ago" */
export function relativeShort(t: number, now: number): string {
  const mins = Math.floor((now - t) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = daysBetween(t, now);
  if (days < 7) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** "Today", "Yesterday", "5 days ago" */
export function relativeDay(t: number, now: number): string {
  const days = daysBetween(t, now);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 0) return `In ${-days} days`;
  return `${days} days ago`;
}
