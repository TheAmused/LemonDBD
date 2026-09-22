// frontend/src/utils/smashWatermarks.ts

/**
 * Strips unwanted characters such as parentheses, brackets, and quotes from watermark text.
 */
export function cleanWatermark(str: string): string {
  return str.replace(/[()[\]"']/g, '').trim();
}

/**
 * Returns responsive Tailwind font-size classes for flanking watermarks.
 * Clamps to a smaller font scale for strings longer than 10 characters to prevent clipping or line wraps.
 */
export function getWatermarkFontSize(str: string): string {
  return str.length > 10
    ? 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl'
    : 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl';
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
  const isSurvivor = character.role === 'Survivor';
  const isKiller = character.role === 'Killer';

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