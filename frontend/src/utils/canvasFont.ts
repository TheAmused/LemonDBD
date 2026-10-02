// frontend/src/utils/canvasFont.ts
//
// Canvas text cannot use Tailwind classes, so it reads the site's one font stack from the
// `--font-sans` variable defined in globals.css instead of naming a family of its own.

const FALLBACK = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function siteFontStack(): string {
  if (typeof document === 'undefined') return FALLBACK;
  const value = getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim();
  return value || FALLBACK;
}

/** e.g. canvasFont('900', 16) -> `900 16px <site stack>` */
export function canvasFont(weight: string | number, sizePx: number): string {
  return `${weight} ${sizePx}px ${siteFontStack()}`;
}
