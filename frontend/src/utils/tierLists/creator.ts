// frontend/src/utils/tierLists/creator.ts
/**
 * Pure helpers behind the "Create a tier list" page: ladder presets, turning
 * pasted lines and file names into items, and keeping item ids unique.
 * Browser-only work (decoding and shrinking uploaded images) lives in
 * imageFiles.ts so this file stays testable under node.
 */
import type { TierDefinition, TierListDocumentItem } from '@/types/tierList';
import { sanitizeImageUrl, slugifyItemId, uniqueId } from './codec';
import { TIER_COLOR_TOKENS, TIER_LIST_LIMITS } from './constants';

export type LadderPresetId = 'classic' | 'short' | 'numbers' | 'feelings';

/** Label keys the page resolves through the dictionary (`creator.feelings.*`). */
export type FeelingLabelKey = 'love' | 'like' | 'meh' | 'hate';

interface LadderPresetSpec {
  id: LadderPresetId;
  /** Literal labels, or dictionary keys when `translated`. */
  labels: readonly string[];
  colors: readonly string[];
  translated?: boolean;
}

export const LADDER_PRESETS: readonly LadderPresetSpec[] = [
  { id: 'classic', labels: ['S', 'A', 'B', 'C', 'D', 'F'], colors: ['s', 'a', 'b', 'c', 'd', 'f'] },
  { id: 'short', labels: ['S', 'A', 'B', 'C'], colors: ['s', 'a', 'b', 'c'] },
  { id: 'numbers', labels: ['1', '2', '3', '4', '5'], colors: ['s', 'a', 'b', 'd', 'f'] },
  { id: 'feelings', labels: ['love', 'like', 'meh', 'hate'], colors: ['s', 'b', 'neutral', 'f'], translated: true },
];

/** Builds a preset's tiers. `translate` maps a translated preset's keys to display labels. */
export function buildLadder(id: LadderPresetId, translate: (key: FeelingLabelKey) => string): TierDefinition[] {
  const preset = LADDER_PRESETS.find((p) => p.id === id) ?? LADDER_PRESETS[0];
  const taken = new Set<string>();
  return preset.labels.map((raw, i) => {
    const label = preset.translated ? translate(raw as FeelingLabelKey) : raw;
    const tierId = uniqueId(preset.translated ? raw : slugifyItemId(raw), taken);
    taken.add(tierId);
    return { id: tierId, label, color: preset.colors[i] ?? TIER_COLOR_TOKENS[i] ?? 'neutral' };
  });
}

/** `survivor_meg-thomas.final.webp` -> `survivor meg thomas.final`. */
export function nameFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]{2,5}$/i, '');
  const name = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (name || fileName).slice(0, TIER_LIST_LIMITS.maxItemName);
}

/** The last path segment of a URL, as a readable name. */
export function nameFromUrl(url: string): string {
  try {
    const segment = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? '');
    return nameFromFileName(segment);
  } catch {
    return '';
  }
}

export interface ParsedLinkLines {
  items: { name: string; image?: string }[];
  /** 1-based line numbers that could not be used. */
  invalidLines: number[];
}

/**
 * One item per line, in any of these shapes:
 *
 *   Meg Thomas | https://cdn.example/meg.png
 *   https://cdn.example/meg-thomas.png        (name taken from the file name)
 *   Meg Thomas                                (a text tile, no picture)
 *
 * `|`, a tab or ` - ` separate the name from the link. A line whose link is
 * not an allowed image source (plain http:, javascript:, ...) is reported
 * rather than silently turned into a text tile.
 */
export function parseLinkLines(text: string): ParsedLinkLines {
  const items: ParsedLinkLines['items'] = [];
  const invalidLines: number[] = [];

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;

    const split = line.split(/\s*\|\s*|\t+|\s+-\s+(?=\S+:)/);
    const looksLikeLink = (s: string) => /^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith('/static/');

    let name = '';
    let link = '';
    if (split.length >= 2) {
      name = split[0].trim();
      link = split.slice(1).join('|').trim();
    } else if (looksLikeLink(line)) {
      link = line;
    } else {
      name = line;
    }

    if (link) {
      const image = sanitizeImageUrl(link);
      if (!image) {
        invalidLines.push(index + 1);
        return;
      }
      const finalName = (name || nameFromUrl(image)).slice(0, TIER_LIST_LIMITS.maxItemName);
      if (!finalName) {
        invalidLines.push(index + 1);
        return;
      }
      items.push({ name: finalName, image });
      return;
    }
    items.push({ name: name.slice(0, TIER_LIST_LIMITS.maxItemName) });
  });

  return { items, invalidLines };
}

/** Appends new items with ids unique against what is already in the list, up to the item cap. */
export function appendItems(
  existing: readonly TierListDocumentItem[],
  incoming: readonly { name: string; image?: string; id?: string }[]
): { items: TierListDocumentItem[]; skipped: number } {
  const taken = new Set(existing.map((i) => i.id));
  const items = [...existing];
  let skipped = 0;
  for (const entry of incoming) {
    if (items.length >= TIER_LIST_LIMITS.maxItems) {
      skipped += 1;
      continue;
    }
    const name = entry.name.trim().slice(0, TIER_LIST_LIMITS.maxItemName);
    if (!name) {
      skipped += 1;
      continue;
    }
    const id = uniqueId(entry.id && !taken.has(entry.id) ? entry.id : slugifyItemId(name), taken);
    taken.add(id);
    items.push(entry.image ? { id, name, image: entry.image } : { id, name });
  }
  return { items, skipped };
}

/** Approximate bytes a list costs in localStorage -- dominated by inline images. */
export function estimateStoredBytes(items: readonly TierListDocumentItem[]): number {
  return items.reduce((sum, item) => sum + item.name.length + (item.image?.length ?? 0) + 24, 0) * 2;
}
