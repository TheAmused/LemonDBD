'use client';
// frontend/src/components/tier-lists/TierListScaleControl.tsx

import React from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import { BOARD_SCALE_STEPS, type BoardScale } from '@/utils/tierLists/fit';

interface TierListScaleControlProps {
  scale: BoardScale;
  onScaleChange: (scale: BoardScale) => void;
  className?: string;
  variant?: 'toolbar' | 'menu';
}

export function TierListScaleControl({
  scale,
  onScaleChange,
  className,
  variant = 'toolbar',
}: TierListScaleControlProps) {
  const dict = useDictionary();
  const t = dict.tierLists;

  const numericScale = scale === 'fit' ? 100 : scale;
  const scaleIndex = BOARD_SCALE_STEPS.indexOf(numericScale);
  const canZoomOut = scale === 'fit' || scaleIndex > 0;
  const canZoomIn = scale === 'fit' || (scaleIndex >= 0 && scaleIndex < BOARD_SCALE_STEPS.length - 1);

  const stepScale = (dir: -1 | 1) => {
    const current = scale === 'fit' ? 100 : scale;
    const idx = BOARD_SCALE_STEPS.indexOf(current);
    const nextIdx = Math.max(0, Math.min(BOARD_SCALE_STEPS.length - 1, (idx < 0 ? 4 : idx) + dir));
    onScaleChange(BOARD_SCALE_STEPS[nextIdx]);
  };

  if (variant === 'menu') {
    return (
      <div className={cn('flex items-center justify-between gap-1 rounded-xl bg-bg-elevated/60 px-2 py-1.5 mb-1', className)}>
        <button
          type="button"
          disabled={!canZoomOut}
          onClick={() => stepScale(-1)}
          aria-label={t.scaleZoomOut}
          className="pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text-primary disabled:opacity-40 cursor-pointer"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onScaleChange(100)}
          aria-label={t.scaleReset}
          className="pointer-coarse:min-h-11 min-w-[3.25rem] px-1.5 h-8 rounded-lg type-label-xs text-text-primary hover:bg-bg-surface cursor-pointer tabular-nums"
        >
          {scale === 'fit' ? t.scaleFit : `${scale}%`}
        </button>
        <button
          type="button"
          disabled={!canZoomIn}
          onClick={() => stepScale(1)}
          aria-label={t.scaleZoomIn}
          className="pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text-primary disabled:opacity-40 cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onScaleChange(scale === 'fit' ? 100 : 'fit')}
          aria-pressed={scale === 'fit'}
          aria-label={t.scaleFitHint}
          className={cn(
            'pointer-coarse:min-h-11 inline-flex h-8 items-center gap-1 rounded-lg px-2.5 type-label-xs cursor-pointer transition-colors',
            scale === 'fit'
              ? 'bg-accent-amber/20 text-accent-amber'
              : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
          )}
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.scaleFit}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn('inline-flex items-center rounded-lg border border-border-color bg-bg-surface p-0.5 shadow-2xs', className)}>
      <button
        type="button"
        disabled={!canZoomOut}
        onClick={() => stepScale(-1)}
        aria-label={t.scaleZoomOut}
        {...tip(t.scaleZoomOut, undefined, 'action')}
        className="pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onScaleChange(100)}
        aria-label={t.scaleReset}
        {...tip(t.scaleReset, undefined, 'action')}
        className="pointer-coarse:min-h-11 min-w-[3.25rem] px-1.5 h-7 rounded-md type-label-xs text-text-primary hover:bg-bg-elevated cursor-pointer transition-colors tabular-nums"
      >
        {scale === 'fit' ? t.scaleFit : `${scale}%`}
      </button>
      <button
        type="button"
        disabled={!canZoomIn}
        onClick={() => stepScale(1)}
        aria-label={t.scaleZoomIn}
        {...tip(t.scaleZoomIn, undefined, 'action')}
        className="pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <div className="mx-0.5 h-4 w-px bg-border-color" aria-hidden="true" />
      <button
        type="button"
        onClick={() => onScaleChange(scale === 'fit' ? 100 : 'fit')}
        aria-pressed={scale === 'fit'}
        aria-label={t.scaleFitHint}
        {...tip(t.scaleFitHint, undefined, 'action')}
        className={cn(
          'pointer-coarse:min-h-11 inline-flex h-7 items-center gap-1 rounded-md px-2 type-label-xs cursor-pointer transition-colors',
          scale === 'fit'
            ? 'bg-accent-amber/20 text-accent-amber'
            : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
        )}
      >
        <Maximize2 className="h-3 w-3" aria-hidden="true" />
        <span>{t.scaleFit}</span>
      </button>
    </div>
  );
}
