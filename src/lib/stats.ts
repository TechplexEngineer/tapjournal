import { addDays, dayKey, startOfDay } from './date.ts';
import type { TapRecord } from './types.ts';

export interface Stats {
  total: number;
  first: number;
  last: number;
  /** Longest run of consecutive days with at least one record. */
  longestStreak: number;
  longestStreakStart: number;
  /** Day with the most records (latest wins ties). */
  bestDayCount: number;
  bestDay: number;
}

export function computeStats(records: TapRecord[]): Stats | null {
  if (!records.length) return null;
  const times = records.map((r) => r.timestamp).sort((a, b) => a - b);

  const perDay = new Map<string, { day: number; count: number }>();
  for (const t of times) {
    const key = dayKey(t);
    const entry = perDay.get(key);
    if (entry) entry.count++;
    else perDay.set(key, { day: startOfDay(t), count: 1 });
  }
  const days = [...perDay.values()]; // already chronological

  let bestDay = days[0];
  for (const d of days) if (d.count >= bestDay.count) bestDay = d;

  let longest = 1;
  let longestStart = days[0].day;
  let run = 1;
  let runStart = days[0].day;
  for (let i = 1; i < days.length; i++) {
    if (dayKey(addDays(days[i - 1].day, 1)) === dayKey(days[i].day)) {
      run++;
    } else {
      run = 1;
      runStart = days[i].day;
    }
    if (run > longest) {
      longest = run;
      longestStart = runStart;
    }
  }

  return {
    total: times.length,
    first: times[0],
    last: times[times.length - 1],
    longestStreak: longest,
    longestStreakStart: longestStart,
    bestDayCount: bestDay.count,
    bestDay: bestDay.day,
  };
}
