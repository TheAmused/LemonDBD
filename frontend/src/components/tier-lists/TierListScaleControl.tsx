'use client';
// frontend/src/components/tier-lists/TierListScaleControl.tsx
//
// The tier board's zoom: the shared ZoomControl over the board's scale steps.

import React from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { ZoomControl } from '@/components/common/ZoomControl';
import { BOARD_SCALE_STEPS, isBoardScale, type BoardScale } from '@/utils/tierLists/fit';

interface TierListScaleControlProps {
  scale: BoardScale;
  onScaleChange: (scale: BoardScale) => void;
  className?: string;
  variant?: 'toolbar' | 'menu';
}

export function TierListScaleControl({ scale, onScaleChange, className, variant = 'toolbar' }: TierListScaleControlProps) {
  const t = useDictionary().tierLists;
  return (
    <ZoomControl
      value={scale}
      steps={BOARD_SCALE_STEPS}
      onChange={(next) => {
        if (isBoardScale(next)) onScaleChange(next);
      }}
      labels={{ zoomOut: t.scaleZoomOut, zoomIn: t.scaleZoomIn, reset: t.scaleReset, fit: t.scaleFit, fitHint: t.scaleFitHint }}
      variant={variant}
      className={className}
    />
  );
}
