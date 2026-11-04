// frontend/src/utils/smashOrPass/badgeGradient.ts
/**
 * An archetype's badge colour is stored as text, in one of two shapes: a preset (Tailwind gradient
 * classes such as `from-accent-red to-bg-primary`) or a custom pair of hex colours,
 * `custom:#rrggbb,#rrggbb`. This turns either into what an element needs to paint it.
 */
import type { CSSProperties } from 'react';
import { defaultRosterThemeColor } from './constants';

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

/**
 * A roster's `theme_color` is either one `#rrggbb` or a custom gradient; the editor always works on a
 * pair, so a single colour becomes a pair with equal ends.
 */
export function themeGradientOf(theme: string | undefined | null): CustomGradient {
  const custom = parseCustomGradient(theme);
  if (custom) return custom;
  const solid = theme && HEX.test(theme) ? theme.toLowerCase() : defaultRosterThemeColor();
  return { from: solid, to: solid };
}

/** The `theme_color` text for a gradient: equal ends are just one colour. */
export function encodeThemeColor(gradient: CustomGradient): string {
  return gradient.from.toLowerCase() === gradient.to.toLowerCase() ? gradient.from.toLowerCase() : encodeCustomGradient(gradient);
}

/**
 * Inline style that repaints the edge of a `card-ash-border` / `lore-ash-*` element with a roster's theme
 * gradient (inline, so it beats the class). Only a gradient theme does this; a single colour leaves the edge as it is.
 */
export function themedEdgeStyle(theme: string | undefined | null, fill: string): CSSProperties | undefined {
  const gradient = parseCustomGradient(theme);
  if (!gradient) return undefined;
  return { backgroundImage: `linear-gradient(${fill}, ${fill}), linear-gradient(155deg, ${gradient.from}, ${gradient.to})` };
}
