'use client';
// frontend/src/components/tier-lists/TierBadge.tsx

import React from 'react';
import type { TierColor } from '@/types/tierList';
import { cn } from '@/utils/cn';
import { tierColorProps } from './tierColor';

interface TierBadgeProps {
  label: string;
  color: TierColor;
  /**
   * An https:/data: image. When set, this *replaces* the solid color and
   * letter entirely -- the picture becomes the tier's identity, the same way
   * a custom list's own card can swap its plain header for a background
   * image (`CustomTierListCard`). The label still exists for assistive tech
   * (`sr-only`) and as the fallback while the image loads or 404s.
   */
  backgroundImage?: string;
  /** Sizing, layout and rounding for the tag -- color/image/text live here. */
  className?: string;
  labelClassName?: string;
}

/**
 * The colored (or pictured) tag for one tier -- "S", "A"... One place for
 * this so the board (`TierRow`), both preview boards (`CreatorPreview`,
 * `TierEditModal`'s live preview) and the creator's inline ladder editor
 * (`LadderEditor`) always render a tier identically.
 */
export function TierBadge({ label, color, backgroundImage, className, labelClassName }: TierBadgeProps) {
  if (backgroundImage) {
    return (
      <div className={cn('bg-cover bg-center', className)} style={{ backgroundImage: `url('${backgroundImage}')` }}>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  const swatch = tierColorProps(color);
  return (
    <div className={cn(swatch.className, className)} style={swatch.style}>
      <span className={labelClassName}>{label}</span>
    </div>
  );
}
