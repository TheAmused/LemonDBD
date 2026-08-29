'use client';
// frontend/src/components/maps/MapCanvas.tsx

import React, { useState, useEffect } from 'react';
import { Compass, ImageOff, Move } from 'lucide-react';
import type { Dictionary } from '@/locales/types';

export interface MapCanvasProps {
  imageUrl?: string;
  mapName?: string;
  realmName?: string;
  transformStyle?: {
    transform: string;
    transition?: string;
    cursor?: string;
  } | React.CSSProperties;
  isDragging?: boolean;
  imageAlignment?: 'left' | 'center' | 'right';
  showPanHint?: boolean;
  className?: string;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onWheel?: (e: React.WheelEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchCancel?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  children?: React.ReactNode;
  dict?: Dictionary;
  panHint?: string;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  imageUrl,
  mapName = 'Map',
  realmName,
  transformStyle,
  isDragging = false,
  imageAlignment = 'center',
  showPanHint = true,
  className = '',
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onWheel,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  onError,
  children,
  dict,
  panHint,
}) => {
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageError(true);
    onError?.(e);
  };

  const alignmentClass =
    imageAlignment === 'left'
      ? 'justify-start'
      : imageAlignment === 'right'
      ? 'justify-end'
      : 'justify-center';

  const altText = dict?.maps?.diagramAlt
    ? dict.maps.diagramAlt.replace('{mapName}', `${mapName}${realmName ? ` - ${realmName}` : ''}`)
    : `${mapName}${realmName ? ` - ${realmName}` : ''} Diagram`;

  const fallbackTitle = imageError
    ? dict?.maps?.unableToLoadDiagram || 'Unable to load diagram'
    : dict?.maps?.noDiagramAvailable || 'No diagram available';

  const fallbackDescription = imageError
    ? dict?.maps?.failedToLoadDiagram
      ? dict.maps.failedToLoadDiagram.replace('{mapName}', mapName)
      : `Failed to load diagram for ${mapName}. Please check network connection.`
    : dict?.maps?.diagramNotAvailable
      ? dict.maps.diagramNotAvailable.replace('{mapName}', mapName)
      : `Diagram for ${mapName} is not yet available.`;

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      style={{ touchAction: 'none' }}
      className={`relative min-h-[440px] md:min-h-[520px] max-h-[85vh] h-[55vh] md:h-[65vh] w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950 p-4 border border-slate-200/90 dark:border-slate-800/80 flex items-center justify-center select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${className}`}
      data-testid="map-canvas-container"
    >
      <div
        style={{
          willChange: 'transform',
          ...(transformStyle || {}),
        }}
        className={`w-full h-full flex items-center transition-all ${alignmentClass}`}
        data-testid="map-canvas-viewport"
      >
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={altText}
            draggable={false}
            onError={handleImageError}
            style={{
              imageRendering: '-webkit-optimize-contrast' as React.CSSProperties['imageRendering'],
            }}
            className="max-h-full max-w-full object-contain rounded-xl shadow-2xl pointer-events-none"
            data-testid="map-canvas-image"
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-3 p-8 text-center text-slate-500 select-none"
            data-testid="map-canvas-fallback"
          >
            {imageError ? (
              <ImageOff className="h-14 w-14 text-rose-500/80 animate-pulse" />
            ) : (
              <Compass className="h-14 w-14 text-slate-600 animate-spin" style={{ animationDuration: '20s' }} />
            )}
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {fallbackTitle}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                {fallbackDescription}
              </p>
            </div>
          </div>
        )}
      </div>

      {showPanHint && (
        <div
          className="absolute top-3 left-3 hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/75 dark:bg-slate-950/70 px-2.5 py-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 backdrop-blur-md pointer-events-none z-10"
          data-testid="map-canvas-pan-hint"
        >
          <Move className="h-3 w-3 text-amber-500" />
          <span>{panHint || dict?.maps?.dragPanScrollZoom || 'Drag to pan • Scroll to zoom'}</span>
        </div>
      )}

      {children}
    </div>
  );
};
