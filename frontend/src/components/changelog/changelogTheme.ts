// frontend/src/components/changelog/changelogTheme.ts
import type { ChangelogSection } from '@/types/changelog';
import { hexToRgba, paletteColor } from '@/utils/themeColor';

export const CHANGELOG_SECTIONS: ChangelogSection[] = ['new', 'qol', 'balance', 'bugfix', 'knownIssues', 'announcement'];

/**
 * How an entry's body looks, for both the reader's modal and the admin's editor so the preview matches. Lines
 * written one under another stay tight; only a section title or a deliberate empty line opens a gap.
 */
export const CHANGELOG_BODY_CLASS = [
  'text-sm leading-relaxed text-text-secondary',
  '[&_h3]:mb-1.5 [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:tracking-wide [&_h3]:text-accent-red-text [&_h3:first-child]:mt-0',
  '[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5',
  '[&_a]:text-accent-red-text [&_a]:underline',
].join(' ');

export interface ChangelogSwatch {
  name: string;
  value: string;
}

// The swatch colours are saved into the entry's HTML as hex and rgba text, so they are read from the palette
// (tokens.css) when the editor opens and written out as plain values. `resolve` is the palette lookup.
type PaletteLookup = (name: string) => string;

const TEXT_SWATCHES: [name: string, palette: string][] = [
  ['Bone', 'slate-200'],
  ['Blood', 'red-600'],
  ['Amber', 'amber-500'],
  ['Hex', 'purple-500'],
  ['Hope', 'emerald-500'],
  ['Fog', 'sky-400'],
];

const HIGHLIGHT_SWATCHES: [name: string, palette: string, alpha: number][] = [
  ['Blood', 'red-600', 0.35],
  ['Amber', 'amber-500', 0.35],
  ['Hex', 'purple-500', 0.35],
  ['Hope', 'emerald-500', 0.35],
  ['Fog', 'sky-400', 0.3],
];

/** Swatches offered by the rich-text color picker in the admin editor. */
export function changelogTextColors(resolve: PaletteLookup = paletteColor): ChangelogSwatch[] {
  return TEXT_SWATCHES.map(([name, palette]) => ({ name, value: resolve(palette) }));
}

/** Swatches offered by the rich-text highlight (background) picker. */
export function changelogHighlightColors(resolve: PaletteLookup = paletteColor): ChangelogSwatch[] {
  return HIGHLIGHT_SWATCHES.map(([name, palette, alpha]) => ({ name, value: hexToRgba(resolve(palette), alpha) }));
}
