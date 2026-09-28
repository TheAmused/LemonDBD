// frontend/src/components/tier-lists/tierColor.ts
import type { CSSProperties } from 'react';
import { TIER_COLOR_TOKENS, TIER_TOKEN_BG_CLASSES, type TierColorToken } from '@/utils/tierLists/constants';
import { tierInk } from '@/utils/tierLists/codec';

const isToken = (color: string): color is TierColorToken =>
  (TIER_COLOR_TOKENS as readonly string[]).includes(color);

/**
 * Class + style for a tier label cell. Token colors resolve through theme
 * classes (`bg-tier-s`...) so they follow light / dark / lemon; a user's hex
 * can only be an inline style, with the ink picked for contrast.
 */
export function tierColorProps(color: string): { className: string; style?: CSSProperties } {
  if (isToken(color)) {
    return { className: `${TIER_TOKEN_BG_CLASSES[color]} text-tier-ink` };
  }
  return {
    className: tierInk(color) === 'dark' ? 'text-tier-ink' : 'text-text-inverted',
    style: { backgroundColor: color },
  };
}
