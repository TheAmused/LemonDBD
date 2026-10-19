// frontend/src/components/common/Thumb.tsx
// A small square picture in a list row (character, perk, target): rounded frame, image cropped or
// contained, a fallback when there is no image.
import React from 'react';
import Image from 'next/image';
import { cn } from '@/utils/cn';

export type ThumbSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<ThumbSize, { box: string; px: number }> = {
  sm: { box: 'h-8 w-8', px: 32 },
  md: { box: 'h-11 w-11', px: 44 },
  lg: { box: 'h-14 w-14', px: 56 },
  xl: { box: 'h-16 w-16', px: 64 },
};

export interface ThumbProps {
  src?: string | null;
  alt: string;
  size?: ThumbSize;
  /** cover crops to the frame (portraits); contain keeps the whole icon (perks). */
  fit?: 'cover' | 'contain';
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
          loading="lazy"
          decoding="async"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className={cn('h-full w-full select-none', fit === 'cover' ? 'object-cover' : 'object-contain p-0.5')}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
