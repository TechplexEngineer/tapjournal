import type { ColorKey, ResetCycle } from './types.ts';

export const PALETTE: Record<ColorKey, { base: string; light: string; dark: string }> = {
	blue: { base: '#3B82F6', light: '#60A5FA', dark: '#1D4ED8' },
	teal: { base: '#14B8A6', light: '#2DD4BF', dark: '#0F766E' },
	purple: { base: '#A855F7', light: '#C084FC', dark: '#7E22CE' },
	orange: { base: '#F97316', light: '#FB923C', dark: '#C2410C' },
	red: { base: '#EF4444', light: '#F87171', dark: '#B91C1C' },
	pink: { base: '#EC4899', light: '#F472B6', dark: '#BE185D' },
	green: { base: '#22C55E', light: '#4ADE80', dark: '#15803D' },
	slate: { base: '#475569', light: '#64748B', dark: '#1E293B' }
};

export const COLOR_KEYS = Object.keys(PALETTE) as ColorKey[];

export const CYCLES: { key: ResetCycle; label: string }[] = [
	{ key: 'daily', label: 'Daily' },
	{ key: 'weekly', label: 'Weekly' },
	{ key: 'monthly', label: 'Monthly' },
	{ key: 'yearly', label: 'Yearly' }
];

export const NAME_MAX = 20;

export function gradient(color: ColorKey): string {
	const p = PALETTE[color] ?? PALETTE.blue;
	return `linear-gradient(45deg, ${p.base}, ${p.light})`;
}
