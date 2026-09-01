'use client';
// frontend/src/components/maps/MapCard.tsx

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { MapRealm } from '@/types/map';
import { getMapImageSrc } from '@/utils/mapUtils';

export interface MapCardProps {
  map: MapRealm;
  backendBase: string;
  onSelect: (map: MapRealm) => void;
}

export const MapCard: React.FC<MapCardProps> = ({ map, backendBase, onSelect }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = getMapImageSrc(map, backendBase);

  return (
    <button
      type="button"
      onClick={() => onSelect(map)}
      className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 min-h-[44px] touch-manipulation cursor-pointer transition-all duration-200 hover:scale-105 hover:border-amber-400 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
      data-testid={`map-card-${map.id}`}
    >
      <div className="h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
        {imageSrc && !imageFailed ? (
          <img
            src={imageSrc}
            alt={map.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <ImageOff className="h-8 w-8 text-slate-400 dark:text-slate-600" />
        )}
      </div>
      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 text-center line-clamp-2">
        {map.name}
      </span>
    </button>
  );
};
