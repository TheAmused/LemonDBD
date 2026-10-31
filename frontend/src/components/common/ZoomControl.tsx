'use client';
// frontend/src/components/common/ZoomControl.tsx
//
// The zoom control of a board or a picture: [-] [percent] [+] | [Fit]. The percent button returns to the
// reset size, Fit toggles a "whole thing on screen" mode. Stepping moves to the next of `steps` above or
// below the current value, so a free value (a wheel or pinch zoom) steps cleanly too. Tier lists and the
// fullscreen map share it.

import React from 'react';
import { FitIcon, MinusIcon, PlusIcon } from '@/components/icons/DbdIcons';
import { cn } from '@/utils/cn';
import { tip } from '@/components/common/Tooltip';
import { Button } from '@/components/common/Button';

export type ZoomValue = number | 'fit';

export interface ZoomControlLabels {
  zoomOut: string;
  zoomIn: string;
  /** The percent button: back to `resetValue`. */
  reset: string;
  fit: string;
  fitHint: string;
}

interface ZoomControlProps {
  /** Percent, or 'fit'. */
  value: ZoomValue;
  /** The percents the -/+ buttons step through, smallest first. */
  steps: readonly number[];
  onChange: (value: ZoomValue) => void;
  /** The percent button, and Fit switched off: back to `resetValue`. Defaults to onChange(resetValue); pass it
   * when a reset does more than a step that happens to land on the same value (the map also recentres). */
  onReset?: () => void;
  labels: ZoomControlLabels;
  /** What the percent button returns to, and what Fit toggles back to (default 100). */
  resetValue?: number;
  /** The percent 'fit' currently stands for, so stepping from Fit starts there (default resetValue). */
  fitValue?: number;
  /** Show the percent while in Fit mode instead of the word Fit. */
  showFitPercent?: boolean;
  variant?: 'toolbar' | 'menu';
  className?: string;
}

/** The next step above (dir 1) or below (dir -1) `current`; the same value when there is none. */
export function nextZoomStep(steps: readonly number[], current: number, dir: -1 | 1): number {
  if (dir > 0) return steps.find((s) => s > current + 0.5) ?? current;
  return [...steps].reverse().find((s) => s < current - 0.5) ?? current;
}

export function ZoomControl({
  value,
  steps,
  onChange,
  onReset,
  labels,
  resetValue = 100,
  fitValue = resetValue,
  showFitPercent = false,
  variant = 'toolbar',
  className,
}: ZoomControlProps) {
  const current = value === 'fit' ? fitValue : value;
  const canZoomOut = nextZoomStep(steps, current, -1) !== current;
  const canZoomIn = nextZoomStep(steps, current, 1) !== current;
  const percentText = value === 'fit' && !showFitPercent ? labels.fit : `${Math.round(current)}%`;
  const isMenu = variant === 'menu';
  const withTip = (text: string) => (isMenu ? {} : tip(text, undefined, 'action'));
  const reset = onReset ?? (() => onChange(resetValue));

  return (
    <div
      className={cn(
        isMenu
          ? 'flex items-center justify-between gap-1 rounded-card bg-bg-elevated/60 px-2 py-1.5 mb-1'
          : 'inline-flex items-center rounded-chip border border-border-color bg-bg-surface p-0.5 shadow-2xs',
        className
      )}
    >
      <Button
        type="button"
        disabled={!canZoomOut}
        onClick={() => onChange(nextZoomStep(steps, current, -1))}
        aria-label={labels.zoomOut}
        {...withTip(labels.zoomOut)}
        variant="ghost" size="sm" icon
      >
        <MinusIcon />
      </Button>
      <Button
        type="button"
        onClick={reset}
        aria-label={labels.reset}
        {...withTip(labels.reset)}
        variant="ghost" size="sm" className="tabular-nums"
      >
        {percentText}
      </Button>
      <Button
        type="button"
        disabled={!canZoomIn}
        onClick={() => onChange(nextZoomStep(steps, current, 1))}
        aria-label={labels.zoomIn}
        {...withTip(labels.zoomIn)}
        variant="ghost" size="sm" icon
      >
        <PlusIcon />
      </Button>
      {!isMenu && <div className="mx-0.5 h-4 w-px bg-border-color" aria-hidden="true" />}
      <Button
        variant={value === 'fit' ? 'amberSoft' : 'ghost'}
        size={isMenu ? 'sm' : 'xs'}
        onClick={() => (value === 'fit' ? reset() : onChange('fit'))}
        aria-pressed={value === 'fit'}
        aria-label={labels.fitHint}
        {...withTip(labels.fitHint)}
      >
        <FitIcon />
        <span>{labels.fit}</span>
      </Button>
    </div>
  );
}
