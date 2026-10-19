'use client';
// frontend/src/components/maps/MapCard.tsx

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { MapRealm } from '@/types/map';
import { getMapThumbSrc } from '@/utils/mapUtils';
import { TileButton } from '@/components/common/TileButton';

export interface MapCardProps {
  map: MapRealm;
  backendBase: string;
  onSelect: (map: MapRealm) => void;
}

export const MapCard: React.FC<MapCardProps> = ({ map, backendBase, onSelect }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = getMapThumbSrc(map, backendBase);

  return (
    <TileButton
      onClick={() => onSelect(map)}
      className="group flex flex-col items-center gap-2 rounded-control border-2 border-border-color bg-bg-surface p-2 min-h-11 touch-manipulation transition-all duration-200 hover:border-accent-red shadow-sm"
      data-testid={`map-card-${map.id}`}
    >
      <div className="h-24 w-24 sm:h-36 sm:w-36 md:h-40 md:w-40 overflow-hidden rounded-card bg-bg-elevated flex items-center justify-center">
        {imageSrc && !imageFailed ? (
          <img
            src={imageSrc}
            alt={map.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <ImageOff className="h-8 w-8 text-text-muted" />
        )}
      </div>
      <span className="type-strong-fluid text-text-primary text-center line-clamp-2">
        {map.name}
      </span>
    </TileButton>
  );
};
