// frontend/src/utils/tierLists/imageFiles.ts
'use client';

import { TIER_LIST_LIMITS } from './constants';

/** Reads a file's raw bytes back out as a `data:...;base64,...` URL, unmodified. */
function fileToDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Turns an uploaded image into a small inline `data:` URL.
 *
 * Custom lists live in localStorage (about 5 MB per site), so a phone photo
 * cannot be stored as-is. Every upload is decoded, scaled to fit a
 * tile-sized square and re-encoded -- WebP where the browser can write it,
 * PNG otherwise (keeps transparency, e.g. perk-style icons). A result still
 * over the per-image cap is retried smaller. Returns null for anything that
 * is not a decodable raster image.
 *
 * GIFs are the one exception: `drawImage` (below) only ever captures a
 * canvas's first frame, so running an animated GIF through this pipeline
 * would silently flatten it to a still. Its original bytes are kept as-is
 * instead -- still subject to the same size cap, just not re-encoded.
 */
export async function fileToTileImage(file: File, sizes: readonly number[] = [160, 128, 96]): Promise<string | null> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return null;

  if (file.type === 'image/gif') {
    const url = await fileToDataUrl(file);
    return url && url.length <= TIER_LIST_LIMITS.maxDataImageChars ? url : null;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    for (const size of sizes) {
      const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, width, height);

      let url = canvas.toDataURL('image/webp', 0.86);
      if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/png');
      if (url.length <= TIER_LIST_LIMITS.maxDataImageChars) return url;
    }
    return null;
  } finally {
    bitmap.close();
  }
}
