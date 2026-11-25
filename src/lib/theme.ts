import type { ButtonColor, ColorKey, ResetCycle } from './types.ts';

interface Shades {
	base: string;
	light: string;
	dark: string;
}

export const PALETTE: Record<ColorKey, Shades> = {
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

export const isCustomColor = (color: string): color is `#${string}` => /^#[0-9a-f]{6}$/i.test(color);

export function isButtonColor(color: unknown): color is ButtonColor {
	return typeof color === 'string' && (color in PALETTE || isCustomColor(color));
}

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
const mix = (hex: string, target: number, amount: number) =>
	toHex(toRgb(hex).map((c) => c + (target - c) * amount));

/** Base/light/dark shades for a preset key or a custom hex colour. */
export function shades(color: ButtonColor): Shades {
	if (isCustomColor(color)) return { base: color, light: mix(color, 255, 0.25), dark: mix(color, 0, 0.3) };
	return PALETTE[color] ?? PALETTE.blue;
}

export function gradient(color: ButtonColor): string {
	const p = shades(color);
	return `linear-gradient(45deg, ${p.base}, ${p.light})`;
}

/** Text colour that stays readable on top of `color` (dark text on very light custom colours). */
export function textOn(color: ButtonColor): string {
	if (!isCustomColor(color)) return '#FFFFFF';
	const [r, g, b] = toRgb(color).map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return luminance > 0.45 ? '#0F172A' : '#FFFFFF';
}
