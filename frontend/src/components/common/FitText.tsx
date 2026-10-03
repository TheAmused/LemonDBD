'use client';
// frontend/src/components/common/FitText.tsx
//
// THE way to put a text label in a box of unknown width. The text keeps the
// font size it inherits and only shrinks when it would not fit:
//
//   1. one line, scaled down as far as `minScale` allows;
//   2. if that is too small and `maxLines` > 1, wrapped onto up to `maxLines`
//      lines at the largest scale that still fits;
//   3. if even that does not fit, clamped with an ellipsis (the full text goes
//      into `title`).
//
// Layout rule: the element reserves its *natural* single-line width (a hidden
// ::before copy of the text), so a parent can cap it (`max-w-full`, a fixed
// width, a flex cell) without the shrunken text making the box shrink and the
// measurement feed back on itself. The visible text is laid over that box.
// The scale is `em`-based, so it follows whatever font size the caller sets.

import React from 'react';
import { cn } from '@/utils/cn';
import { tip } from '@/components/common/Tooltip';

const useIsoLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export type FitMode = 'single' | 'wrap' | 'clamp';

export interface FitState {
  scale: number;
  mode: FitMode;
  /** Which of [text, ...alternatives] is shown. */
  index: number;
}

const FITS: FitState = { scale: 1, mode: 'single', index: 0 };

/** Largest scale in [lo, 1] for which wrapped text fits `maxLines` (bisection). */
function fitWrapped(
  inner: HTMLElement,
  available: number,
  maxLines: number,
  lo: number,
  breakWords = true
): number | null {
  const fits = (scale: number) => {
    inner.style.fontSize = `${scale}em`;
    const cs = getComputedStyle(inner);
    const fontPx = parseFloat(cs.fontSize) || 16;
    const lh = parseFloat(cs.lineHeight);
    const linePx = Number.isFinite(lh) ? lh : fontPx * 1.2;
    return inner.scrollHeight <= linePx * maxLines + 1 && inner.scrollWidth <= available + 1;
  };
  inner.style.position = 'static';
  inner.style.transform = 'none';
  inner.style.whiteSpace = 'normal';
  inner.style.overflowWrap = breakWords ? 'break-word' : 'normal';
  if (fits(1)) return 1;
  if (!fits(lo)) return null;
  let good = lo;
  let low = lo;
  let hi = 1;
  for (let i = 0; i < 8; i++) {
    const mid = (low + hi) / 2;
    if (fits(mid)) {
      good = mid;
      low = mid;
    } else {
      hi = mid;
    }
  }
  return Math.floor(good * 100) / 100;
}

/**
 * Pure measurement; leaves inline styles (and the text node) for the caller to restore.
 *
 * `variants` are the same label from most to least important wording. The first
 * one that fits on one line at `minScale` or larger wins, so a long label gives
 * way to a short one before it is shrunk past readability. Only the last
 * variant is allowed the wrap / clamp fallbacks.
 */
export function measureFit(
  wrapper: HTMLElement,
  inner: HTMLElement,
  variants: string[],
  minScale: number,
  maxLines: number,
  wrapFirst = false
): FitState {
  // Measure from a clean slate: drop any clamp styling left by the last render.
  inner.style.overflow = 'visible';
  inner.style.textOverflow = 'clip';
  inner.style.display = 'block';
  inner.style.setProperty('-webkit-line-clamp', 'unset');
  inner.style.fontSize = '1em';
  inner.style.whiteSpace = 'nowrap';
  inner.style.overflowWrap = 'normal';
  const available = wrapper.clientWidth;
  if (available <= 0) return FITS;

  const textNode = inner.firstChild;
  const original = textNode?.nodeValue ?? '';
  const last = variants.length - 1;
  try {
    for (let index = 0; index <= last; index++) {
      if (textNode) textNode.nodeValue = variants[index];
      // Range, not scrollWidth: right-aligned text overflows to the left, which scrollWidth ignores.
      const range = document.createRange();
      range.selectNodeContents(inner);
      const natural = range.getBoundingClientRect().width;
      if (natural <= available + 0.5) return { scale: 1, mode: 'single', index };

      const scale = Math.floor((available / natural) * 98) / 100; // 2% slack: glyph widths are not perfectly linear
      // Multi-word text that does not fit at full size is stacked on centred
      // lines before it is shrunk ("THE / SINGULARITY" beats a tiny one-liner).
      if (wrapFirst && maxLines > 1 && /\s/.test(variants[index].trim())) {
        const wrapped = fitWrapped(inner, available, maxLines, minScale * 0.6, false); // never split a word; shrink to the longest word
        if (wrapped !== null) return { scale: wrapped, mode: 'wrap', index };
      }
      if (scale >= minScale) return { scale, mode: 'single', index };
      if (index < last) continue;

      if (maxLines > 1) {
        // Wrapped text may go below the single-line floor: losing a word to a clamp is worse than small type.
        const wrapped = fitWrapped(inner, available, maxLines, minScale * 0.6, !wrapFirst);
        if (wrapped !== null) return { scale: wrapped, mode: 'wrap', index };
      }
      return { scale: maxLines > 1 ? minScale * 0.6 : minScale, mode: 'clamp', index };
    }
    return FITS;
  } finally {
    if (textNode) textNode.nodeValue = original;
  }
}

export interface FitTextProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  children: string | number;
  /** Smallest single-line scale (1 = never shrink). Default 0.5. */
  minScale?: number;
  /** Lines allowed once the single-line scale would drop below `minScale`. Default 1. */
  maxLines?: number;
  /**
   * Shorter wordings of the same label, longest first ("Light mode (Lemon)" ->
   * ["Lemon"]). Used instead of shrinking below `minScale`.
   */
  alternatives?: readonly string[];
  /**
   * Break multi-word text onto separate lines (up to `maxLines`) as soon as it
   * does not fit at full size, instead of shrinking a single line first.
   */
  wrapFirst?: boolean;
}

export const FitText: React.FC<FitTextProps> = ({
  children,
  minScale = 0.5,
  maxLines = 1,
  alternatives,
  wrapFirst = false,
  className,
  style,
  title,
  ...rest
}) => {
  const text = String(children);
  const variantsKey = [text, ...(alternatives ?? [])].join('\u0001');
  const wrapperRef = React.useRef<HTMLSpanElement>(null);
  const innerRef = React.useRef<HTMLSpanElement>(null);
  const [fit, setFit] = React.useState<FitState>(FITS);

  const run = React.useCallback(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;
    // measureFit edits inline styles to measure; put them back so they never
    // diverge from what React last rendered (React only diffs its own props).
    const saved = inner.style.cssText;
    let next: FitState;
    try {
      next = measureFit(wrapper, inner, variantsKey.split('\u0001'), minScale, maxLines, wrapFirst);
    } finally {
      inner.style.cssText = saved;
    }
    setFit((prev) =>
      prev.scale === next.scale && prev.mode === next.mode && prev.index === next.index ? prev : next
    );
  }, [minScale, maxLines, variantsKey, wrapFirst]);

  useIsoLayoutEffect(() => {
    run();
  }, [run]);

  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    };
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    ro?.observe(wrapper);
    // A web font swapping in changes the natural width.
    void document.fonts?.ready?.then(schedule);
    document.fonts?.addEventListener?.('loadingdone', schedule);
    return () => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
      document.fonts?.removeEventListener?.('loadingdone', schedule);
    };
  }, [run]);

  const clamped = fit.mode === 'clamp';
  // Multi-line text flows in the document so the box grows to hold it; a single
  // line is laid over the box that reserves its natural width.
  const flowing = fit.mode === 'wrap' || (clamped && maxLines > 1);
  const innerStyle: React.CSSProperties = {
    fontSize: `${fit.scale}em`,
    whiteSpace: fit.mode === 'wrap' ? 'normal' : 'nowrap',
    overflowWrap: fit.mode === 'single' || (wrapFirst && fit.mode === 'wrap') ? 'normal' : 'break-word',
    ...(clamped && maxLines <= 1
      ? { overflow: 'hidden', textOverflow: 'ellipsis' }
      : clamped
        ? {
            whiteSpace: 'normal',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: maxLines,
          }
        : null),
  };

  return (
    <span
      ref={wrapperRef}
      data-text={text}
      data-flow={flowing ? 'static' : 'overlay'}
      {...tip(title ?? (clamped || fit.index > 0 ? text : undefined), undefined, 'action')}
      className={cn(
        'relative inline-block min-w-0 max-w-full align-bottom',
        // Reserves the natural one-line size; see the header comment.
        'before:invisible before:block before:whitespace-nowrap before:content-[attr(data-text)]',
        'data-[flow=static]:before:h-0 data-[flow=static]:before:overflow-hidden',
        className
      )}
      style={style}
      {...rest}
    >
      <span
        ref={innerRef}
        className={flowing ? 'block' : 'absolute inset-x-0 top-1/2 block -translate-y-1/2'}
        style={innerStyle}
      >
        {(alternatives?.[fit.index - 1] && fit.index > 0 ? alternatives[fit.index - 1] : text)}
      </span>
    </span>
  );
};
