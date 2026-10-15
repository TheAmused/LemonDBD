// frontend/src/components/common/Thumb.tsx
// A small square picture in a list row (character, perk, target): rounded frame, image cropped or
// contained, a fallback when there is no image.
import React from 'react';
import Image from 'next/image';
import { cn } from '@/utils/cn';

export type ThumbSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ThumbSize, { box: string; px: number }> = {
  sm: { box: 'h-8 w-8', px: 32 },
  md: { box: 'h-10 w-10', px: 40 },
  lg: { box: 'h-11 w-11', px: 44 },
};

export interface ThumbProps {
  src?: string | null;
  alt: string;
  size?: ThumbSize;
  /** cover crops to the frame (portraits); contain keeps the whole icon (perks). */
  fit?: 'cover' | 'contain';
  /** Shown when there is no image. */
  fallback?: React.ReactNode;
  className?: string;
}

export function Thumb({ src, alt, size = 'md', fit = 'cover', fallback, className }: ThumbProps) {
  const { box, px } = SIZES[size];
  return (
    <div className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-chip border border-border-color bg-bg-elevated', box, className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={px}
          height={px}
          unoptimized
          className={cn('h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain p-0.5')}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
