// frontend/src/utils/themeColor.ts
//
// Canvas drawing and native colour inputs cannot use Tailwind classes, so they read their colours from the
// theme variables defined in globals.css (e.g. themeColor('--accent-amber')) instead of naming a colour.

export function themeColor(variable: `--${string}`): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

const palette = new Map<string, string>();

/** A fixed art colour from the `--palette-*` list in tokens.css (the same in every theme), by its name, e.g. 'red-600'. */
export function paletteColor(name: string): string {
  const cached = palette.get(name);
  if (cached) return cached;
  const value = themeColor(`--palette-${name}`);
  if (value) palette.set(name, value);
  return value;
}

/** `#rrggbb` as `rgba(r,g,b,alpha)`, for colours that are saved as text (rich-text highlights). */
export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** `color` at `alpha` (0 to 1), for canvas fills and gradient stops. */
export function withAlpha(color: string, alpha: number): string {
  const percent = Math.round(Math.min(1, Math.max(0, alpha)) * 1000) / 10;
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
