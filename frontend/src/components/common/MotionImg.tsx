'use client';
// frontend/src/components/common/MotionImg.tsx
// An Img that holds still on animated GIFs when the viewer switched "GIFs" off in Settings: the
// GIF's first frame is painted on a canvas instead of letting the browser play it. Any other
// picture, and every picture while GIFs are on, is the plain Img.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Img, type ImgProps } from '@/components/common/Img';
import { usePreferences } from '@/hooks/usePreferences';

/** Whether a picture URL is a GIF: a data URL of that type, or a path ending in .gif (query and hash ignored). */
export function isGifSource(src: string | undefined): boolean {
  if (!src) return false;
  if (src.startsWith('data:')) return /^data:image\/gif[;,]/i.test(src);
  return /\.gif(?:$|[?#])/i.test(src);
}

/** A picture is frozen to its first frame only when GIFs are off and it is a GIF. */
export function shouldHoldStill(gifsOn: boolean, src: string | undefined): boolean {
  return !gifsOn && isGifSource(src);
}

interface StillFrameProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  draggable?: boolean | 'true' | 'false';
  onClick?: React.MouseEventHandler<HTMLElement>;
  onContextMenu?: React.MouseEventHandler<HTMLElement>;
  onFail: () => void;
}

/** Paints the picture's first frame; a canvas keeps the object-fit classes of the Img it stands in for. */
function StillFrame({ src, alt, className, style, referrerPolicy, draggable, onClick, onContextMenu, onFail }: StillFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const image = new Image();
    if (referrerPolicy) image.referrerPolicy = referrerPolicy;
    image.onload = () => {
      if (cancelled) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onFail();
        return;
      }
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      ctx.drawImage(image, 0, 0);
    };
    image.onerror = () => {
      if (!cancelled) onFail();
    };
    image.src = src;
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [src, referrerPolicy, onFail]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden={alt ? undefined : true}
      className={className}
      style={style}
      draggable={draggable}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {alt}
    </canvas>
  );
}

export function MotionImg(props: ImgProps) {
  const { preferences } = usePreferences();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const { alt, className, style, referrerPolicy } = props;
  const src = typeof props.src === 'string' ? props.src : undefined;
  const markFailed = useCallback(() => setFailedSrc(src ?? null), [src]);

  if (src && failedSrc !== src && shouldHoldStill(preferences.gifs, src)) {
    return (
      <StillFrame
        src={src}
        alt={alt}
        className={className}
        style={style}
        referrerPolicy={referrerPolicy}
        draggable={props.draggable}
        onClick={props.onClick}
        onContextMenu={props.onContextMenu}
        onFail={markFailed}
      />
    );
  }
  return <Img {...props} />;
}
