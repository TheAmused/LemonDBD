'use client';
// frontend/src/components/tier-lists/TierListScaleControl.tsx

import React from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import { BOARD_SCALE_STEPS, type BoardScale } from '@/utils/tierLists/fit';

import { Button } from '@/components/common/Button';
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
      <div className={cn('flex items-center justify-between gap-1 rounded-card bg-bg-elevated/60 px-2 py-1.5 mb-1', className)}>
        <Button
          type="button"
          disabled={!canZoomOut}
          onClick={() => stepScale(-1)}
          aria-label={t.scaleZoomOut}
          variant="ghost" size="sm" icon
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          onClick={() => onScaleChange(100)}
          aria-label={t.scaleReset}
          variant="ghost" size="sm" className="tabular-nums"
        >
          {scale === 'fit' ? t.scaleFit : `${scale}%`}
        </Button>
        <Button
          type="button"
          disabled={!canZoomIn}
          onClick={() => stepScale(1)}
          aria-label={t.scaleZoomIn}
          variant="ghost" size="sm" icon
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
        variant={scale === 'fit' ? 'amberSoft' : 'ghost'}
        size="sm"
        onClick={() => onScaleChange(scale === 'fit' ? 100 : 'fit')}
        aria-pressed={scale === 'fit'}
        aria-label={t.scaleFitHint}
      >
        <Maximize2 aria-hidden="true" />
        <span>{t.scaleFit}</span>
      </Button>
      </div>
    );
  }

  return (
    <div className={cn('inline-flex items-center rounded-chip border border-border-color bg-bg-surface p-0.5 shadow-2xs', className)}>
      <Button
        type="button"
        disabled={!canZoomOut}
        onClick={() => stepScale(-1)}
        aria-label={t.scaleZoomOut}
        {...tip(t.scaleZoomOut, undefined, 'action')}
        variant="ghost" size="sm" icon
      >
        <Minus aria-hidden="true" />
      </Button>
      <Button
        type="button"
        onClick={() => onScaleChange(100)}
        aria-label={t.scaleReset}
        {...tip(t.scaleReset, undefined, 'action')}
        variant="ghost" size="sm" className="tabular-nums"
      >
        {scale === 'fit' ? t.scaleFit : `${scale}%`}
      </Button>
      <Button
        type="button"
        disabled={!canZoomIn}
        onClick={() => stepScale(1)}
        aria-label={t.scaleZoomIn}
        {...tip(t.scaleZoomIn, undefined, 'action')}
        variant="ghost" size="sm" icon
      >
        <Plus aria-hidden="true" />
      </Button>
      <div className="mx-0.5 h-4 w-px bg-border-color" aria-hidden="true" />
      <Button
        variant={scale === 'fit' ? 'amberSoft' : 'ghost'}
        size="xs"
        onClick={() => onScaleChange(scale === 'fit' ? 100 : 'fit')}
        aria-pressed={scale === 'fit'}
        aria-label={t.scaleFitHint}
        {...tip(t.scaleFitHint, undefined, 'action')}
      >
        <Maximize2 aria-hidden="true" />
        <span>{t.scaleFit}</span>
      </Button>
    </div>
  );
}
