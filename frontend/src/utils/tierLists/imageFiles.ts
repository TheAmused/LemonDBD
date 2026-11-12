// frontend/src/utils/tierLists/imageFiles.ts
'use client';

import { TIER_LIST_LIMITS } from './constants';
import { IMAGE_SIZE_PRESETS, fileToDataUrl, resizeImageToDataUrl } from '@/utils/imageResize';

export { fileToDataUrl };

/**
 * Turns an uploaded image into a small inline `data:` URL for tier-list tiles.
 *
 * Delegates to the shared `resizeImageToDataUrl` utility using the `tile` size
 * preset (`[160, 128, 96]`) and `TIER_LIST_LIMITS.maxDataImageChars` cap.
 */
export async function fileToTileImage(
  file: File,
  sizes: readonly number[] = IMAGE_SIZE_PRESETS.tile,
  maxChars: number = TIER_LIST_LIMITS.maxDataImageChars,
): Promise<string | null> {
  return resizeImageToDataUrl(file, sizes, maxChars);
}
