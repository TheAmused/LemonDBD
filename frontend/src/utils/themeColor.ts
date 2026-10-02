// frontend/src/utils/themeColor.ts
//
// Canvas drawing and native colour inputs cannot use Tailwind classes, so they read their colours from the
// theme variables defined in globals.css (e.g. themeColor('--accent-amber')) instead of naming a colour.

export function themeColor(variable: `--${string}`): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}
