// frontend/src/utils/privacyLayout.ts
// Order / hidden state of the privacy-policy blocks, kept per browser.

export const PRIVACY_LAYOUT_STORAGE_KEY = 'lemondbd_privacy_layout';

export interface PrivacyLayout {
  order: string[];
  hidden: string[];
}

/** Drops unknown ids and duplicates, appends blocks the saved layout has not seen yet. */
export function normalizePrivacyLayout(raw: unknown, ids: readonly string[]): PrivacyLayout {
  const known = new Set(ids);
  const pick = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of value) {
      if (typeof item === 'string' && known.has(item) && !seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    }
    return out;
  };
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const order = pick(source.order);
  for (const id of ids) if (!order.includes(id)) order.push(id);
  return { order, hidden: pick(source.hidden) };
}
