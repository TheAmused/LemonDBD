'use client';
// frontend/src/components/maps/MapCard.tsx

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { MapRealm } from '@/types/map';
import { getMapThumbSrc } from '@/utils/mapUtils';
import { TileButton } from '@/components/common/TileButton';
import { Img } from '@/components/common/Img';
import { useDictionary } from '@/context/DictionaryContext';
import { cn } from '@/utils/cn';

export interface MapCardProps {
  map: MapRealm;
  backendBase: string;
  onSelect: (map: MapRealm) => void;
}

export const MapCard: React.FC<MapCardProps> = ({ map, backendBase, onSelect }) => {
  const dict = useDictionary();
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = getMapThumbSrc(map, backendBase);
  const retired = Boolean(map.is_retired);

  return (
    <TileButton
      onClick={() => onSelect(map)}
      disabled={retired}
      press={!retired}
      aria-label={retired ? `${map.name}: ${dict.maps.retiredMap}` : undefined}
      className={cn(
        'group flex flex-col items-center gap-2 rounded-control border-2 border-border-color bg-bg-surface p-2 min-h-11 touch-manipulation transition-all duration-200 shadow-sm',
        retired ? 'opacity-50 grayscale' : 'hover:border-accent-red'
      )}
      data-testid={`map-card-${map.id}`}
    >
      <div className="h-24 w-24 sm:h-36 sm:w-36 md:h-40 md:w-40 overflow-hidden rounded-card bg-bg-elevated flex items-center justify-center">
        {imageSrc && !imageFailed ? (
          <Img
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
      {retired && <span className="type-caption text-text-muted text-center">{dict.maps.retiredMap}</span>}
    </TileButton>
  );
};
