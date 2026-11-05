'use client';
// frontend/src/components/common/ContentCropImg.tsx
//
// An icon scaled and centred on what it actually draws. DBD icons are 256px squares with an uneven
// transparent margin, so a glyph sits small and off-centre in whatever frame holds it. This reads the
// picture's alpha once (a 64px canvas), finds the box of visible pixels and zooms the picture to it, so
// the frame hugs the icon. If the picture can't be read (another origin without CORS) it is shown whole.
//
// `tint` paints the picture's light parts in the current accent instead of showing its colours: the
// item glyphs are white with a dark outline, so a luminance mask in one colour keeps their detail.
import React, { useEffect, useState } from 'react';
import { Img } from '@/components/common/Img';

interface Box {
  cx: number;
  cy: number;
  /** Side of the square that frames the content, as a fraction of the picture. */
  fit: number;
}

const WHOLE: Box = { cx: 0.5, cy: 0.5, fit: 1 };
const SAMPLE = 64;
const ALPHA_MIN = 24;
const boxes = new Map<string, Box>();

function measure(img: HTMLImageElement, pad: number): Box {
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return WHOLE;
  ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
  const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
  let minX = SAMPLE, minY = SAMPLE, maxX = -1, maxY = -1;
  for (let y = 0; y < SAMPLE; y++) {
    for (let x = 0; x < SAMPLE; x++) {
      if (data[(y * SAMPLE + x) * 4 + 3] <= ALPHA_MIN) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return WHOLE;
  const w = (maxX - minX + 1) / SAMPLE;
  const h = (maxY - minY + 1) / SAMPLE;
  return {
    cx: (minX + (maxX - minX + 1) / 2) / SAMPLE,
    cy: (minY + (maxY - minY + 1) / 2) / SAMPLE,
    fit: Math.min(1, Math.max(w, h) + pad),
  };
}

function useContentBox(src: string, pad: number): Box {
  // Measured boxes live in `boxes`; the state only wakes the component when a new one lands.
  const [, setMeasuredSrc] = useState<string | null>(null);

  useEffect(() => {
    if (boxes.has(src)) return;
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      let next = WHOLE;
      try {
        next = measure(probe, pad);
      } catch {
        // A picture from another origin taints the canvas: keep it whole.
      }
      boxes.set(src, next);
      if (!cancelled) setMeasuredSrc(src);
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, pad]);

  return boxes.get(src) ?? WHOLE;
}

interface ContentCropImgProps {
  src: string;
  alt: string;
  /** Paint the picture in the accent colour (for white glyphs) instead of showing it as is. */
  tint?: boolean;
  /** Breathing room around the content, as a fraction of the picture. */
  pad?: number;
  className?: string;
}

export function ContentCropImg({ src, alt, tint = false, pad = 0.04, className = '' }: ContentCropImgProps) {
  const { cx, cy, fit } = useContentBox(src, pad);
  const size = 100 / fit;
  const place = { width: `${size}%`, height: `${size}%`, left: `${50 - cx * size}%`, top: `${50 - cy * size}%` };

  return (
    <span className={`relative block h-full w-full overflow-hidden ${className}`}>
      {tint ? (
        <span
          aria-hidden="true"
          className="absolute bg-accent-amber"
          style={{
            ...place,
            maskImage: `url("${src}")`,
            WebkitMaskImage: `url("${src}")`,
            maskMode: 'luminance',
            maskSize: '100% 100%',
            maskRepeat: 'no-repeat',
          }}
        />
      ) : (
        <Img src={src} alt={alt} className="absolute max-w-none object-contain" style={place} />
      )}
      {tint && <span className="sr-only">{alt}</span>}
    </span>
  );
}
