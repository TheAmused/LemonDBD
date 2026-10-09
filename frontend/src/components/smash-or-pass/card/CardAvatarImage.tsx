'use client';
// frontend/src/components/smash-or-pass/card/CardAvatarImage.tsx
import type { CSSProperties, SyntheticEvent } from 'react';
import type { MediaDisplay } from '@/types/smashOrPass';

interface CardAvatarImageProps {
  src: string;
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

/** The character's portrait, with the avatar fallback chain and the optional per-character framing. */
export function CardAvatarImage({
  src,
  name,
  slug,
  isSurvivor,
  backendBase,
  display,
  priority,
  className,
}: CardAvatarImageProps) {
  return (
    <img
      src={src}
      alt={name}
      loading={priority === undefined ? undefined : priority ? 'eager' : 'lazy'}
      fetchPriority={priority === undefined ? undefined : priority ? 'high' : 'auto'}
      decoding={priority === undefined ? undefined : 'async'}
      className={className}
      style={mediaDisplayStyle(display)}
      onError={(e) => retryAvatar(e, backendBase, isSurvivor, slug)}
    />
  );
}
