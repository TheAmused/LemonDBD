'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

export interface TooltipProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  className?: string;
  disabled?: boolean;
}

const VIEWPORT_MARGIN = 10;
const GAP = 9;

interface Coords {
  top: number;
  left: number;
  side: 'top' | 'bottom';
  arrowLeft: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  description,
  children,
  placement = 'top',
  className,
  disabled = false,
}) => {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    const bubble = bubbleRef.current;
    if (!trigger || !bubble) return;

    const tRect = trigger.getBoundingClientRect();
    const bRect = bubble.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    let side: 'top' | 'bottom' = placement;
    const spaceAbove = tRect.top;
    const spaceBelow = vh - tRect.bottom;
    const needed = bRect.height + GAP;
    if (side === 'top' && spaceAbove < needed && spaceBelow > spaceAbove) side = 'bottom';
    if (side === 'bottom' && spaceBelow < needed && spaceAbove > spaceBelow) side = 'top';

    let top = side === 'top' ? tRect.top - bRect.height - GAP : tRect.bottom + GAP;
    top = Math.min(Math.max(top, VIEWPORT_MARGIN), vh - bRect.height - VIEWPORT_MARGIN);

    let left = tRect.left + tRect.width / 2 - bRect.width / 2;
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), vw - bRect.width - VIEWPORT_MARGIN);

    const triggerCenter = tRect.left + tRect.width / 2;
    const arrowLeft = Math.min(Math.max(triggerCenter - left, 16), bRect.width - 16);

    setCoords({ top, left, side, arrowLeft });
  }, [placement]);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const raf = requestAnimationFrame(reposition);
    const handle = () => reposition();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [open, reposition]);

  if (disabled) return <>{children}</>;

  const show = () => setOpen(true);
  const hide = () => setOpen(false);
  const visible = open && coords;

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onTouchStart={show}
      onTouchEnd={hide}
    >
      {children}
      {mounted &&
        createPortal(
          <span
            ref={bubbleRef}
            role="tooltip"
            aria-hidden={!visible}
            style={
              coords
                ? { top: coords.top, left: coords.left }
                : { top: -9999, left: -9999, visibility: 'hidden' }
            }
            className={cn(
              'pointer-events-none fixed z-[999] w-max max-w-[17rem] text-left',
              'transition-all duration-150 ease-out',
              visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
              coords?.side === 'bottom'
                ? visible
                  ? 'translate-y-0'
                  : '-translate-y-1'
                : visible
                  ? 'translate-y-0'
                  : 'translate-y-1',
              className
            )}
          >
            <span className="relative block overflow-hidden rounded-lg border border-amber-500/40 dark:border-amber-500/25 bg-white dark:bg-slate-950/95 px-3.5 py-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.18)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.7)] backdrop-blur-sm">
              <span className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:repeating-linear-gradient(45deg,#000_0,#000_1px,transparent_1px,transparent_10px)] dark:[background-image:repeating-linear-gradient(45deg,#fff_0,#fff_1px,transparent_1px,transparent_10px)]" />
              <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-red-600/0 via-amber-500 to-red-600/0" />
              <span className="relative block whitespace-normal text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                {title}
              </span>
              {description && (
                <span className="relative mt-1 block whitespace-normal text-[11px] font-medium italic leading-snug text-slate-700 dark:text-slate-300">
                  {`“${description}”`}
                </span>
              )}
            </span>
            {coords && (
              <span
                aria-hidden="true"
                className="absolute h-2.5 w-2.5 rotate-45 bg-white dark:bg-slate-950"
                style={{
                  left: coords.arrowLeft - 5,
                  top: coords.side === 'top' ? '100%' : undefined,
                  bottom: coords.side === 'bottom' ? '100%' : undefined,
                  marginTop: coords.side === 'top' ? -5 : undefined,
                  marginBottom: coords.side === 'bottom' ? -5 : undefined,
                  borderRight: coords.side === 'top' ? '1px solid rgba(217,119,6,0.4)' : undefined,
                  borderBottom: coords.side === 'top' ? '1px solid rgba(217,119,6,0.4)' : undefined,
                  borderLeft: coords.side === 'bottom' ? '1px solid rgba(217,119,6,0.4)' : undefined,
                  borderTop: coords.side === 'bottom' ? '1px solid rgba(217,119,6,0.4)' : undefined,
                }}
              />
            )}
          </span>,
          document.body
        )}
    </span>
  );
};