'use client';

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { Perk } from '@/types/perks';
import { getPerkIconUrl } from '@/utils/perkUtils';
import { Img } from '@/components/common/Img';

export interface PerkIconProps {
  perk?: (Pick<Perk, 'name'> & Partial<Pick<Perk, 'icon_local_path' | 'icon_url' | 'id'>>) | null;
  src?: string | null;
  alt?: string;
  size?: number | string;
  className?: string;
  imageClassName?: string;
  fallbackIcon?: React.ReactNode;
  fallbackClassName?: string;
  loading?: 'lazy' | 'eager';
}

export const PerkIcon: React.FC<PerkIconProps> = ({
  perk,
  src,
  alt,
  size,
  className = 'h-full w-full',
  imageClassName = 'h-full w-full object-contain pointer-events-none',
  fallbackIcon,
  fallbackClassName = 'flex h-3/4 w-3/4 rotate-45 items-center justify-center rounded-card bg-bg-elevated border border-border-color',
  loading = 'lazy',
}) => {
  // The picture that failed to load; a different perk or source gets its own try.
  const pictureKey = `${perk?.id}|${perk?.icon_local_path}|${perk?.icon_url}|${src}`;
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const failed = failedKey === pictureKey;

  const iconSrc = src ?? (perk ? getPerkIconUrl(perk) : null);
  const altText = alt ?? perk?.name ?? '';

  if (failed || !iconSrc) {
    if (fallbackIcon) {
      return <>{fallbackIcon}</>;
    }
    return (
      <div className={fallbackClassName}>
        <ImageOff className="-rotate-45 h-8 w-8 text-text-muted" />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={size !== undefined ? { width: size, height: size } : undefined}
    >
      <Img
        src={iconSrc}
        alt={altText}
        onError={() => setFailedKey(pictureKey)}
        className={imageClassName}
        loading={loading}
        decoding="async"
      />
    </div>
  );
};
