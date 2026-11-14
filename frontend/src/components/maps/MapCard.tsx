'use client';
// frontend/src/components/maps/MapCard.tsx

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { MapRealm } from '@/types/map';
import { getMapThumbSrc, isRemovedMapVariation } from '@/utils/mapUtils';
import { TileButton } from '@/components/common/TileButton';
import { Img } from '@/components/common/Img';
import { useDictionary } from '@/context/DictionaryContext';
import { cn } from '@/utils/cn';

// A callout image is nearly square and shown whole; a photo is 3:2 and fills a wider frame.
const CALLOUT_FRAME = 'h-24 w-24 sm:h-36 sm:w-36 md:h-40 md:w-40';
const PHOTO_FRAME = 'aspect-[3/2] w-24 sm:w-44 md:w-52';

export interface MapCardProps {
  map: MapRealm;
  backendBase: string;
  onSelect: (map: MapRealm) => void;
}

export const MapCard: React.FC<MapCardProps> = ({ map, backendBase, onSelect }) => {
  const dict = useDictionary();
  const [imageFailed, setImageFailed] = useState(false);
  // A photo missing on this server (the files are not in git) falls back to the callout image.
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(map.photo_local_path) && !photoFailed;
  const imageSrc = getMapThumbSrc(showPhoto ? map : { ...map, photo_local_path: undefined }, backendBase);
  // A map taken out of the game, or a variation of one that no longer exists: both are greyed, and both open.
  const retired = Boolean(map.is_retired) || isRemovedMapVariation(map);

  return (
    <TileButton
      onClick={() => onSelect(map)}
      aria-label={retired ? `${map.name}: ${dict.maps.retiredMap}` : undefined}
      className={cn(
        'group flex flex-col items-center gap-2 rounded-control border-2 border-border-color bg-bg-surface p-2 min-h-11 touch-manipulation transition-all duration-200 shadow-sm hover:border-accent-red',
        // Greyed with a filter, not opacity: a see-through card lets the background particles show through.
        retired && 'grayscale brightness-75'
      )}
      data-testid={`map-card-${map.id}`}
    >
      <div className={cn(showPhoto ? PHOTO_FRAME : CALLOUT_FRAME, 'overflow-hidden rounded-card bg-bg-elevated flex items-center justify-center')}>
        {imageSrc && !imageFailed ? (
          <Img
            src={imageSrc}
            alt={map.name}
            loading="lazy"
            decoding="async"
            className={cn('h-full w-full', showPhoto ? 'object-cover' : 'object-contain')}
            onError={() => (showPhoto ? setPhotoFailed(true) : setImageFailed(true))}
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
