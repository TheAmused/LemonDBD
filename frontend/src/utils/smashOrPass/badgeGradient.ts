// frontend/src/utils/smashOrPass/badgeGradient.ts
/**
 * An archetype's badge colour is stored as text, in one of two shapes: a preset (Tailwind gradient
 * classes such as `from-accent-red to-bg-primary`) or a custom pair of hex colours,
 * `custom:#rrggbb,#rrggbb`. This turns either into what an element needs to paint it.
 */
import type { CSSProperties } from 'react';

const HEX = /^#[0-9a-f]{6}$/i;
const CUSTOM_PREFIX = 'custom:';

export interface CustomGradient {
  from: string;
  to: string;
}

export function encodeCustomGradient({ from, to }: CustomGradient): string {
  return `${CUSTOM_PREFIX}${from.toLowerCase()},${to.toLowerCase()}`;
}

/** The two colours of a `custom:` value, or null for a preset (or a malformed value). */
export function parseCustomGradient(value: string | undefined | null): CustomGradient | null {
  if (!value || !value.startsWith(CUSTOM_PREFIX)) return null;
  const [from, to] = value.slice(CUSTOM_PREFIX.length).split(',');
  return from && to && HEX.test(from) && HEX.test(to) ? { from: from.toLowerCase(), to: to.toLowerCase() } : null;
}

/** Whether a stored badge colour is something this module can paint. Preset classes are plain Tailwind tokens. */
export function isValidBadgeColor(value: string): boolean {
  return parseCustomGradient(value) !== null || /^[a-z0-9\-/\s]+$/i.test(value);
}

/** Class and inline style that paint the badge background for a stored colour. */
export function badgeGradientProps(value: string): { className: string; style?: CSSProperties } {
  const custom = parseCustomGradient(value);
  if (custom) {
    return { className: '', style: { backgroundImage: `linear-gradient(135deg, ${custom.from}, ${custom.to})` } };
  }
  return { className: `bg-gradient-to-br ${value}` };
}
