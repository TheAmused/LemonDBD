'use client';

import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import type { Perk } from '@/types/perks';
import { getPerkIconUrl } from '@/utils/perkUtils';

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
  fallbackClassName = 'flex h-3/4 w-3/4 rotate-45 items-center justify-center rounded-xl bg-bg-elevated border border-border-color',
  loading = 'lazy',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [perk?.id, perk?.icon_local_path, perk?.icon_url, src]);

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
      <img
        src={iconSrc}
        alt={altText}
        onError={() => setFailed(true)}
        className={imageClassName}
        loading={loading}
        decoding="async"
      />
    </div>
  );
};
