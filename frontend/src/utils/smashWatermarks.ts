// frontend/src/utils/smashWatermarks.ts
import { isKiller as isKillerRole, isSurvivor as isSurvivorRole } from '@/utils/characterUtils';

/**
 * Strips unwanted characters such as parentheses, brackets, and quotes from watermark text.
 */
export function cleanWatermark(str: string): string {
  return str.replace(/[()[\]"']/g, '').trim();
}

/**
 * Samples 2 to 3 flags from a flag pool.
 * If the pool length <= 3, retains all items.
 * If the pool length > 3, randomly selects 2 or 3 items.
 */
export function sampleFlags(flags: string[]): string[] {
  if (!flags || flags.length <= 3) return flags || [];
  const sampleCount = Math.random() < 0.5 ? 2 : 3;
  const copy = [...flags];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, sampleCount);
}

/**
 * Resolves left and right watermarks with explicit fields and sensible role/name fallbacks.
 * Guarantees that neither side is ever empty.
 */
export function resolveWatermarks(character: {
  watermark_left?: string;
  watermark_right?: string;
  name?: string;
  real_name?: string;
  role?: string;
}): { leftWatermark: string; rightWatermark: string } {
  const isSurvivor = isSurvivorRole(character.role);
  const isKiller = isKillerRole(character.role);

  let leftWatermark = cleanWatermark(
    character.watermark_left || (isSurvivor ? (character.name || '').split(' ')[0] : character.name || '')
  );
  let rightWatermark = cleanWatermark(
    character.watermark_right ||
      (isSurvivor
        ? (character.name || '').split(' ').slice(1).join(' ')
        : character.real_name || (isKiller ? 'KILLER' : 'SURVIVOR'))
  );

  if (!leftWatermark) {
    leftWatermark = cleanWatermark(character.name || (isSurvivor ? 'SURVIVOR' : 'KILLER'));
  }
  if (!rightWatermark) {
    rightWatermark = isKiller ? 'KILLER' : 'SURVIVOR';
  }

  return { leftWatermark, rightWatermark };
}