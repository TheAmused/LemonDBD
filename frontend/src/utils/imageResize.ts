// frontend/src/utils/imageResize.ts
'use client';

/** Shared target max-dimension presets (largest -> smallest fallback tier). */
export const IMAGE_SIZE_PRESETS = {
  tile: [160, 128, 96],
  portrait: [512, 384, 256],
  banner: [800, 600, 400],
} as const;

/** Per inline `data:` image character cap (~96 KB binary), matching backend `CleanImageUrl._MAX_DATA_IMAGE_CHARS`. */
export const MAX_DATA_IMAGE_CHARS = 131_072;

const QUALITY_STEPS = [0.86, 0.72, 0.6] as const;
const RASTER_EXT_RE = /\.(png|jpe?g|webp|avif|bmp|ico)$/i;

interface EncodeCanvasOptions {
  /** Try lossless PNG before JPEG when WebP encoding is unsupported (preserves alpha for icons). */
  allowPngFallback?: boolean;
  /** Fall back to JPEG even if WebP is supported when every WebP quality step exceeds `maxChars`. */
  fallbackToJpegIfOversized?: boolean;
}

interface DecodedRaster {
  width: number;
  height: number;
  source: CanvasImageSource;
  release: () => void;
}

async function readFileAsDataUrl(file: File, fallbackMime?: string): Promise<string | null> {
  const mime = file.type || fallbackMime || 'application/octet-stream';
  try {
    if (typeof file.arrayBuffer === 'function') {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (typeof Buffer !== 'undefined') {
        return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
      }
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return `data:${mime};base64,${btoa(binary)}`;
    }
  } catch {
    // fallback to FileReader
  }
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
  return null;
}

/** Reads a file's raw bytes back out as a `data:...;base64,...` URL, unmodified. */
export async function fileToDataUrl(file: File): Promise<string | null> {
  return readFileAsDataUrl(file);
}

function buildQualitySteps(initialQuality: number): number[] {
  const steps = [initialQuality, ...QUALITY_STEPS];
  return steps.filter((q, index) => q > 0 && q <= 1 && steps.indexOf(q) === index);
}

/**
 * Encodes an HTMLCanvasElement as WebP (stepping quality down to fit `maxChars`),
 * falling back to PNG (when `allowPngFallback` is true) and/or JPEG when WebP is
 * unsupported by the browser/canvas or stays oversized.
 */
export function encodeCanvasWithinBudget(
  canvas: HTMLCanvasElement,
  maxChars: number,
  initialQuality: number = 0.86,
  options: EncodeCanvasOptions = {},
): string | null {
  const { allowPngFallback = true, fallbackToJpegIfOversized = false } = options;
  const qualities = buildQualitySteps(initialQuality);

  let webpSupported = true;
  for (const q of qualities) {
    const webp = canvas.toDataURL('image/webp', q);
    if (!webp.startsWith('data:image/webp')) {
      webpSupported = false;
      break;
    }
    if (webp.length <= maxChars) return webp;
  }

  if (!webpSupported && allowPngFallback) {
    const png = canvas.toDataURL('image/png');
    if (png.startsWith('data:image/png') && png.length <= maxChars) {
      return png;
    }
  }

  if (!webpSupported || fallbackToJpegIfOversized) {
    for (const q of qualities) {
      const jpeg = canvas.toDataURL('image/jpeg', q);
      if (jpeg.startsWith('data:image/jpeg') && jpeg.length <= maxChars) {
        return jpeg;
      }
    }
  }

  return null;
}

async function decodeRasterFile(file: File): Promise<DecodedRaster | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 0 && bitmap.height > 0) {
        return {
          width: bitmap.width,
          height: bitmap.height,
          source: bitmap,
          release: () => {
            if (typeof bitmap.close === 'function') bitmap.close();
          },
        };
      }
      if (typeof bitmap.close === 'function') bitmap.close();
    } catch {
      // Fall back to Image + createObjectURL
    }
  }

  if (typeof Image === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Failed to decode image'));
        el.src = objectUrl;
      });
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (width <= 0 || height <= 0) {
        if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(objectUrl);
        return null;
      }
      return {
        width,
        height,
        source: img,
        release: () => {
          if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(objectUrl);
        },
      };
    } catch {
      if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(objectUrl);
      return null;
    }
  }

  return null;
}

/**
 * Validates and downscales an uploaded image file to fit within `maxChars` as a `data:` URI.
 * Rejects non-images and SVGs; preserves animated GIFs untouched when under `maxChars`.
 */
export async function resizeImageToDataUrl(
  file: File,
  sizes: readonly number[],
  maxChars: number = MAX_DATA_IMAGE_CHARS,
  quality: number = 0.86,
): Promise<string | null> {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const isSvg = mime === 'image/svg+xml' || (!mime && name.endsWith('.svg'));
  if (isSvg) return null;

  const isGif = mime === 'image/gif' || (!mime && name.endsWith('.gif'));
  const isRaster = mime.startsWith('image/') || (!mime && RASTER_EXT_RE.test(name));
  if (!isGif && !isRaster) return null;

  if (isGif) {
    const url = await readFileAsDataUrl(file, 'image/gif');
    return url && url.length <= maxChars ? url : null;
  }

  if (typeof document === 'undefined' || sizes.length === 0) return null;

  const decoded = await decodeRasterFile(file);
  if (!decoded) return null;

  try {
    const maxSide = Math.max(decoded.width, decoded.height);
    for (let i = 0; i < sizes.length; i++) {
      const maxDim = sizes[i];
      const scale = Math.min(1, maxDim / maxSide);
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(decoded.source, 0, 0, width, height);

      const encoded = encodeCanvasWithinBudget(canvas, maxChars, quality, {
        allowPngFallback: true,
        fallbackToJpegIfOversized: i === sizes.length - 1,
      });
      if (encoded) return encoded;
    }
    return null;
  } finally {
    decoded.release();
  }
}
