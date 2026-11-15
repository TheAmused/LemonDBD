'use client';
// frontend/src/components/smash-or-pass/card/CardAvatarImage.tsx
import { type CSSProperties, type SyntheticEvent, useRef, useState } from 'react';
import type { MediaDisplay } from '@/types/smashOrPass';
import { MotionImg } from '@/components/common/MotionImg';
import { useOnValueChange } from '@/hooks/useOnValueChange';

interface CardAvatarImageProps {
  src: string;
  thumbSrc?: string;
  name: string;
  slug: string;
  isSurvivor: boolean;
  backendBase: string;
  /** Per-character override of how the picture sits in its frame; absent for almost everyone. */
  display?: MediaDisplay | null;
  priority?: boolean;
  className?: string;
}

/**
 * How a character whose portrait does not suit the default crop is framed. Without an override
 * this is `undefined` and the picture keeps the card's standard `object-cover object-top`.
 */
export function mediaDisplayStyle(display: MediaDisplay | null | undefined): CSSProperties | undefined {
  if (!display) return undefined;
  const fit = display.fit ?? 'cover';
  const position = display.position ?? (fit === 'cover' ? 'center top' : 'center');
  const style: CSSProperties = { objectFit: fit, objectPosition: position };
  if (display.scale && display.scale !== 1) {
    style.transform = `scale(${display.scale})`;
    style.transformOrigin = position;
  }
  return style;
}

/** A broken avatar retries the backend's WebP for the character, then its legacy PNG. */
function retryAvatar(e: SyntheticEvent<HTMLImageElement>, backendBase: string, isSurvivor: boolean, slug: string) {
  const target = e.currentTarget;
  const base = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${slug}`;
  if (!target.dataset.fallback) {
    target.dataset.fallback = '1';
    // Backend writes avatars as WebP; retry that explicitly in case the
    // initial src (e.g. a stale DB path) pointed somewhere unexpected.
    target.src = `${base}.webp`;
  } else if (target.dataset.fallback === '1') {
    target.dataset.fallback = '2';
    // Legacy fallback: some pre-normalization assets may still only exist as .png.
    target.src = `${base}.png`;
  }
}

/** The character's portrait, with progressive high-res loading, avatar fallback chain, and optional per-character framing. */
export function CardAvatarImage({
  src,
  thumbSrc,
  name,
  slug,
  isSurvivor,
  backendBase,
  display,
  priority,
  className,
}: CardAvatarImageProps) {
  const [fullLoaded, setFullLoaded] = useState(false);
  const fullImgRef = useRef<HTMLImageElement>(null);
  const hasThumb = Boolean(thumbSrc && thumbSrc !== src);

  useOnValueChange(src, () => setFullLoaded(false));

  if (!hasThumb) {
    return (
      <MotionImg
        src={src}
        alt={name}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className={`select-none ${className ?? ''}`}
        style={mediaDisplayStyle(display)}
        onError={(e) => retryAvatar(e, backendBase, isSurvivor, slug)}
      />
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {!fullLoaded && (
        <MotionImg
          src={thumbSrc!}
          alt=""
          aria-hidden="true"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className={`absolute inset-0 select-none ${className ?? ''}`}
          style={mediaDisplayStyle(display)}
        />
      )}
      <MotionImg
        ref={fullImgRef}
        src={src}
        alt={name}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className={`select-none ${className ?? ''} transition-opacity duration-300 ${
          !fullLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        style={mediaDisplayStyle(display)}
        onLoad={() => setFullLoaded(true)}
        onError={(e) => retryAvatar(e, backendBase, isSurvivor, slug)}
      />
    </div>
  );
}
