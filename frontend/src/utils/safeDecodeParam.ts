// frontend/src/utils/safeDecodeParam.ts

/** Decodes a URL path segment, or returns null when it holds a malformed percent sequence (`%E0%A4%A`),
 *  which `decodeURIComponent` throws on. Pages answer null with `notFound()` instead of a 500. */
export function safeDecodeParam(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}
