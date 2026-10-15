// frontend/src/utils/contentPreview.ts
/**
 * Turns a reported document (the canonical JSON kept as moderation evidence) into something an admin
 * can read without rendering it. The document is untrusted: only plain strings are extracted, they are
 * rendered as text, and an image is reported as a URL that is shown only after the admin asks for it.
 */
const MAX_DEPTH = 8;
const MAX_TEXTS = 150;
const MAX_IMAGES = 60;
const MAX_TEXT_LENGTH = 400;
/** Keys that hold structural identifiers or item-id placements, not content worth reading. */
const SKIPPED_KEYS = new Set(['id', 'format', 'version', 'slug', 'color', 'theme_color', 'target_type', 'placements', '_manifest']);

export interface EvidencePreview {
  title: string;
  description: string;
  texts: string[];
  images: string[];
  /** True when the document held more text or images than the preview lists. */
  truncated: boolean;
}

/** An image the preview may fetch: https, or an inline raster data URI. SVG is never loaded. */
export function isSafePreviewImage(value: string): boolean {
  if (/^https:\/\//i.test(value)) return true;
  return /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(value);
}

const looksLikeImage = (value: string): boolean =>
  /^data:image\//i.test(value) || /^https?:\/\/\S+\.(png|jpe?g|webp|gif|svg|avif)(\?\S*)?$/i.test(value);

export function parseEvidence(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function buildEvidencePreview(raw: string | null | undefined): EvidencePreview | null {
  const doc = parseEvidence(raw);
  if (!doc) return null;

  const texts: string[] = [];
  const images: string[] = [];
  const seen = new Set<string>();
  let truncated = false;

  const visit = (value: unknown, key: string, depth: number) => {
    if (SKIPPED_KEYS.has(key)) return;
    if (depth > MAX_DEPTH) {
      truncated = true;
      return;
    }
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text || seen.has(text)) return;
      seen.add(text);
      if (looksLikeImage(text) || /(image|media_url|cover|background|icon)/i.test(key)) {
        if (/^(https?:\/\/|data:image\/|\/static\/)/i.test(text)) {
          if (images.length < MAX_IMAGES) images.push(text);
          else truncated = true;
          return;
        }
      }
      if (texts.length < MAX_TEXTS) texts.push(text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text);
      else truncated = true;
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, key, depth + 1));
      return;
    }
    if (value && typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([childKey, child]) => visit(child, childKey, depth + 1));
    }
  };

  const title = typeof doc.title === 'string' ? doc.title.trim() : typeof doc.name === 'string' ? doc.name.trim() : '';
  const description = typeof doc.description === 'string' ? doc.description.trim() : '';
  if (title) seen.add(title);
  if (description) seen.add(description);
  Object.entries(doc).forEach(([key, value]) => visit(value, key, 0));

  return { title, description, texts, images, truncated };
}
