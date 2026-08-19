### frontend/src/components/maps/layouts/index.ts

```typescript
export * from './DesktopMapLayout';
export * from './MobileMapLayout';
```

### frontend/src/components/maps/MapCanvas.tsx

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Compass, ImageOff, Move } from 'lucide-react';

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
            alt={`${mapName}${realmName ? ` - ${realmName}` : ''} Diagram`}
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
                {imageError ? 'Unable to load diagram' : 'No diagram available'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                {imageError
                  ? `Failed to load diagram for ${mapName}. Please check network connection.`
                  : `Diagram for ${mapName} is not yet available.`}
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
          <span>Drag to pan • Scroll to zoom</span>
        </div>
      )}

      {children}
    </div>
  );
};
```

### frontend/src/components/maps/MapControls.tsx

```typescript
'use client';

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, ExternalLink } from 'lucide-react';

export interface MapControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (level: number) => void;
  onReset: () => void;
  onFullscreen?: () => void;
  onPopout?: () => void;
  layoutMode?: 'horizontal' | 'compact' | 'vertical';
  className?: string;
  showPresets?: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onReset,
  onFullscreen,
  onPopout,
  layoutMode = 'horizontal',
  className = '',
  showPresets = true,
}) => {
  const isVertical = layoutMode === 'vertical';
  const isCompact = layoutMode === 'compact';

  return (
    <div
      role="toolbar"
      aria-label="Map view zoom and navigation controls"
      className={`flex items-center gap-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-2 backdrop-blur-md shadow-lg dark:shadow-2xl z-30 select-none ${
        isVertical ? 'flex-col' : 'flex-wrap'
      } ${className}`}
      data-testid="map-controls-hud"
    >
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Zoom In"
        title="Zoom In (+25%)"
        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        data-testid="map-controls-zoom-in"
      >
        <ZoomIn className="h-4 w-4" />
      </button>

      <span
        aria-live="polite"
        className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 px-2 min-w-[48px] text-center"
        data-testid="map-controls-zoom-level"
      >
        {Math.round(zoomLevel * 100)}%
      </span>

      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Zoom Out"
        title="Zoom Out (-25%)"
        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        data-testid="map-controls-zoom-out"
      >
        <ZoomOut className="h-4 w-4" />
      </button>

      {(!isCompact || showPresets) && (
        <div
          className={
            isVertical
              ? 'w-5 h-px bg-slate-200 dark:bg-slate-800 my-1'
              : 'w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block'
          }
        />
      )}

      {showPresets && !isCompact && (
        <div
          className={`flex items-center gap-1 ${
            isVertical ? 'flex-col w-full' : 'hidden sm:flex'
          }`}
          data-testid="map-controls-presets"
        >
          <button
            type="button"
            onClick={onReset}
            title="Fit to Screen"
            aria-pressed={false}
            className="px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
            data-testid="map-controls-preset-fit"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={() => onSetZoom(1.0)}
            title="Set 100% Zoom"
            aria-pressed={Math.abs(zoomLevel - 1.0) < 0.01}
            className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 ${
              Math.abs(zoomLevel - 1.0) < 0.01
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800'
            }`}
            data-testid="map-controls-preset-100"
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => onSetZoom(1.5)}
            title="Set 150% Zoom"
            aria-pressed={Math.abs(zoomLevel - 1.5) < 0.01}
            className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 ${
              Math.abs(zoomLevel - 1.5) < 0.01
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800'
            }`}
            data-testid="map-controls-preset-150"
          >
            150%
          </button>
          <button
            type="button"
            onClick={() => onSetZoom(2.0)}
            title="Set 200% Zoom"
            aria-pressed={Math.abs(zoomLevel - 2.0) < 0.01}
            className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 ${
              Math.abs(zoomLevel - 2.0) < 0.01
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800'
            }`}
            data-testid="map-controls-preset-200"
          >
            200%
          </button>
        </div>
      )}

      <div className={isVertical ? 'w-5 h-px bg-slate-200 dark:bg-slate-800 my-1' : 'w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1'} />

      <button
        type="button"
        onClick={onReset}
        aria-label="Reset View"
        title="Reset Zoom & Pan"
        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        data-testid="map-controls-reset"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {onFullscreen && (
        <button
          type="button"
          onClick={onFullscreen}
          aria-label="Fullscreen Interactive Mode"
          title="Fullscreen Interactive Mode"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          data-testid="map-controls-fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}

      {onPopout && (
        <button
          type="button"
          onClick={onPopout}
          aria-label="Popout Map in Window"
          title="Popout Map in Window"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          data-testid="map-controls-popout"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
```

### frontend/src/components/maps/VariantSwitcherBar.tsx

```typescript
'use client';

import React from 'react';
import { Layers, Check } from 'lucide-react';

export interface VariantSwitcherBarProps {
  variants: string[];
  activeMapName: string;
  onSelectVariant: (variantName: string) => void;
  className?: string;
}

export const VariantSwitcherBar: React.FC<VariantSwitcherBarProps> = ({
  variants,
  activeMapName,
  onSelectVariant,
  className = '',
}) => {
  if (!variants || variants.length <= 1) {
    return null;
  }

  const isVariantActive = (variant: string): boolean => {
    if (!activeMapName) return false;
    const normActive = activeMapName.toLowerCase().trim();
    const normVariant = variant.toLowerCase().trim();
    return normActive === normVariant;
  };

  return (
    <div
      role="group"
      aria-label="Map Realm Variants"
      className={`flex flex-wrap items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 p-2.5 backdrop-blur-sm shadow-sm ${className}`}
      data-testid="variant-switcher-bar"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 pl-1 pr-2 select-none">
        <Layers className="h-3.5 w-3.5" />
        <span>Map Variants:</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {variants.map((v) => {
          const isActive = isVariantActive(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => onSelectVariant(v)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-extrabold scale-105 ring-2 ring-amber-400'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400 hover:text-slate-900 dark:hover:text-white shadow-sm'
              }`}
              data-testid={`variant-pill-${v.toLowerCase().replace(/\s+/g, '-')}`}
              aria-pressed={isActive}
            >
              <span>{v}</span>
              {isActive && (
                <Check className="h-3.5 w-3.5 text-slate-950" data-testid="variant-active-check" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

### frontend/src/components/maps/MapLegendDrawer.tsx

```typescript
'use client';

import React, { useState } from 'react';
import { Clock, Layers, ChevronDown, ChevronUp, Info, Compass } from 'lucide-react';
import { getMapLandmarks, MapLandmarks } from '@/utils/mapLandmarks';

export interface ClockSystemData {
  description?: string;
  twelve_o_clock?: string;
  three_o_clock?: string;
  six_o_clock?: string;
  nine_o_clock?: string;
  center?: string;
}

export interface MapLegendDrawerProps {
  clockSystem?: ClockSystemData;
  source?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  collapsible?: boolean;
  className?: string;
  title?: string;
  mapName?: string;
  realmName?: string;
}

const GENERIC_PLACEHOLDERS: ReadonlySet<string> = new Set([
  'north sector',
  'east sector',
  'south sector',
  'west sector',
  'main building / top spawn',
  'right tile / generator cluster',
  'killer shack / bottom spawn',
  'left tile / jungle gym',
  'main building',
  'top spawn',
  'bottom spawn',
  'left tile',
  'right tile',
]);

const isGenericOrMissing = (val?: string): boolean => {
  if (!val || typeof val !== 'string' || !val.trim()) return true;
  return GENERIC_PLACEHOLDERS.has(val.trim().toLowerCase());
};

export const MapLegendDrawer: React.FC<MapLegendDrawerProps> = ({
  clockSystem,
  source = 'hens333',
  isOpen: controlledIsOpen,
  onToggle,
  collapsible = false,
  className = '',
  title,
  mapName,
  realmName,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(true);

  const isControlled = controlledIsOpen !== undefined;
  const isExpanded = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    }
    if (!isControlled) {
      setInternalIsOpen((prev) => !prev);
    }
  };

  const isSamoel = source === 'samoelcolt';

  const defaultTitle = isSamoel
    ? '4-Quadrant Sector System (Isometric Scheme)'
    : '12-Clock Callout System (Hens333 Navigation)';

  const displayTitle = title || defaultTitle;

  const fallbackLandmarks: MapLandmarks = getMapLandmarks(mapName, realmName, source);

  const twelveVal = isGenericOrMissing(clockSystem?.twelve_o_clock)
    ? fallbackLandmarks.twelve_o_clock
    : clockSystem?.twelve_o_clock ?? fallbackLandmarks.twelve_o_clock;

  const threeVal = isGenericOrMissing(clockSystem?.three_o_clock)
    ? fallbackLandmarks.three_o_clock
    : clockSystem?.three_o_clock ?? fallbackLandmarks.three_o_clock;

  const sixVal = isGenericOrMissing(clockSystem?.six_o_clock)
    ? fallbackLandmarks.six_o_clock
    : clockSystem?.six_o_clock ?? fallbackLandmarks.six_o_clock;

  const nineVal = isGenericOrMissing(clockSystem?.nine_o_clock)
    ? fallbackLandmarks.nine_o_clock
    : clockSystem?.nine_o_clock ?? fallbackLandmarks.nine_o_clock;

  const centerVal = !isGenericOrMissing(clockSystem?.center)
    ? clockSystem?.center ?? fallbackLandmarks.center
    : fallbackLandmarks.center;

  const descriptionVal = clockSystem?.description || fallbackLandmarks.description;

  const sectors = [
    {
      label: isSamoel ? 'North Sector' : "12 O'Clock (Top)",
      value: twelveVal,
      badge: isSamoel ? 'N' : '12',
    },
    {
      label: isSamoel ? 'East Sector' : "3 O'Clock (Right)",
      value: threeVal,
      badge: isSamoel ? 'E' : '3',
    },
    {
      label: isSamoel ? 'South Sector' : "6 O'Clock (Bottom)",
      value: sixVal,
      badge: isSamoel ? 'S' : '6',
    },
    {
      label: isSamoel ? 'West Sector' : "9 O'Clock (Left)",
      value: nineVal,
      badge: isSamoel ? 'W' : '9',
    },
  ];

  return (
    <section
      aria-label="Map Sector Legend"
      className={`rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm dark:shadow-xl backdrop-blur-md overflow-hidden transition-all duration-300 ${className}`}
      data-testid="map-legend-drawer"
    >
      <div
        onClick={collapsible ? handleToggle : undefined}
        className={`flex items-center justify-between p-3.5 md:p-4 border-b border-slate-200 dark:border-slate-800/80 ${
          collapsible ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 select-none' : ''
        }`}
        data-testid="map-legend-header"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
              isSamoel
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isSamoel ? <Layers className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div>
            <h4 className="text-xs md:text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {displayTitle}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isSamoel
                ? 'Steam Workshop 3D Isometric Map Reference'
                : 'Clockwise navigation callouts for team callouts'}
            </p>
          </div>
        </div>

        {collapsible && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse Legend' : 'Expand Legend'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800/50 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors min-h-[36px] min-w-[36px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            data-testid="map-legend-toggle-btn"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="p-3.5 md:p-4 space-y-3" data-testid="map-legend-body">
          {descriptionVal && (
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-3 text-xs text-slate-700 dark:text-slate-300 shadow-inner">
              <Info className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>{descriptionVal}</span>
            </div>
          )}

          {centerVal && (
            <div
              className={`rounded-xl border p-3 md:p-3.5 flex items-center justify-between gap-3 shadow-inner ${
                isSamoel
                  ? 'border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
              }`}
              data-testid="map-legend-sector-center"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-lg border text-[11px] font-black font-mono shrink-0 ${
                    isSamoel
                      ? 'border-emerald-500/50 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                      : 'border-amber-500/50 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  <Compass className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <span
                    className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wider block ${
                      isSamoel ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-500'
                    }`}
                  >
                    Center Landmark / Objective
                  </span>
                  <div className="text-xs md:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    {centerVal}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {sectors.map((sector) => (
              <div
                key={sector.label}
                className="group relative rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50 dark:bg-slate-950 p-3 md:p-3.5 hover:border-amber-500/40 transition-colors shadow-inner flex flex-col justify-between"
                data-testid={`map-legend-sector-${sector.badge.toLowerCase()}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wider ${
                      isSamoel ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-500'
                    }`}
                  >
                    {sector.label}
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-black text-slate-600 dark:text-slate-400 font-mono shadow-sm">
                    {sector.badge}
                  </span>
                </div>
                <div className="text-xs md:text-sm font-extrabold text-slate-900 dark:text-slate-100 line-clamp-2">
                  {sector.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
```

### frontend/src/components/maps/MapDirectoryList.tsx

```typescript
'use client';

import React, { useMemo } from 'react';
import { Compass, Clock, Layers, ExternalLink, Search } from 'lucide-react';
import type { MapRealm } from '@/types/map';
import { getMapImageSrc } from '@/utils/mapUtils';
import { getBackendBaseUrl } from '@/utils/perkUtils';

export interface MapDirectoryListProps {
  groupedMaps: Record<string, MapRealm[]>;
  selectedMapId: string;
  onSelectMapId: (id: string) => void;
  onPopoutImage?: (url: string, name: string) => void;
  loading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedRealm?: string;
  onSelectRealm?: (realm: string) => void;
  backendBase?: string;
  className?: string;
  showFilters?: boolean;
}

export const MapDirectoryList: React.FC<MapDirectoryListProps> = ({
  groupedMaps,
  selectedMapId,
  onSelectMapId,
  onPopoutImage,
  loading = false,
  searchQuery,
  onSearchChange,
  selectedRealm = 'all',
  onSelectRealm,
  backendBase = getBackendBaseUrl(),
  className = '',
  showFilters = false,
}) => {
  const flatMaps = useMemo(() => {
    const realms = Object.keys(groupedMaps || {});
    if (selectedRealm && selectedRealm !== 'all') {
      return groupedMaps[selectedRealm] || [];
    }
    return realms.flatMap((realm) => groupedMaps[realm] || []);
  }, [groupedMaps, selectedRealm]);

  const filteredMaps = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return flatMaps;
    const query = searchQuery.toLowerCase().trim();
    return flatMaps.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        (m.realm && m.realm.toLowerCase().includes(query))
    );
  }, [flatMaps, searchQuery]);

  const uniqueRealms = useMemo(() => Object.keys(groupedMaps || {}).sort(), [groupedMaps]);

  return (
    <div className={`space-y-6 ${className}`} data-testid="map-directory-list">
      {showFilters && (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-4 backdrop-blur-md shadow-sm">
          {onSearchChange && (
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search map or realm..."
                aria-label="Search map or realm"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none min-h-[40px] shadow-inner"
                data-testid="map-directory-search-input"
              />
            </div>
          )}

          {onSelectRealm && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                type="button"
                onClick={() => onSelectRealm('all')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer border min-h-[38px] ${
                  selectedRealm === 'all'
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-700'
                }`}
                data-testid="realm-pill-all"
              >
                All Realms ({Object.values(groupedMaps || {}).reduce((acc, curr) => acc + curr.length, 0)})
              </button>
              {uniqueRealms.map((r) => {
                const count = groupedMaps[r]?.length || 0;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onSelectRealm(r)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border min-h-[38px] ${
                      selectedRealm === r
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-700'
                    }`}
                    data-testid={`realm-pill-${r.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {r} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div
          aria-busy="true"
          aria-label="Loading map directory"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          data-testid="map-directory-loading"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      ) : filteredMaps.length === 0 ? (
        <div
          className="my-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center select-none"
          data-testid="map-directory-empty"
        >
          <Compass
            className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600 mb-3 animate-spin"
            style={{ animationDuration: '20s' }}
          />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Maps Found</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search query or selected realm filter.
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          data-testid="map-directory-grid"
        >
          {filteredMaps.map((m) => {
            const imgSrc = getMapImageSrc(m, backendBase);
            const isSelected = selectedMapId === m.id;
            const isSamoel = m.source === 'samoelcolt';

            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectMapId(m.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMapId(m.id);
                  }
                }}
                className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border bg-white dark:bg-slate-900/90 shadow-sm dark:shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-md dark:shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/50'
                }`}
                data-testid={`map-card-${m.id}`}
              >
                <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={m.name}
                      style={{
                        imageRendering: '-webkit-optimize-contrast' as React.CSSProperties['imageRendering'],
                      }}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95 group-hover:opacity-100"
                      loading="lazy"
                      data-testid={`map-thumbnail-${m.id}`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-600">
                      <Compass className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                  <div
                    className="absolute top-3 left-3 rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1 text-[11px] font-extrabold text-amber-400 backdrop-blur-md shadow-sm"
                    data-testid={`map-realm-tag-${m.id}`}
                  >
                    {m.realm}
                  </div>

                  <div
                    className={`absolute bottom-3 left-3 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase backdrop-blur-md ${
                      isSamoel
                        ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-300'
                        : 'border-amber-500/50 bg-amber-950/90 text-amber-300'
                    }`}
                  >
                    {isSamoel ? 'SamoelColt Isometric' : 'Hens333 12-Clock'}
                  </div>

                  {onPopoutImage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPopoutImage(imgSrc, m.name);
                      }}
                      className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/80 text-slate-300 hover:text-amber-400 backdrop-blur-md transition-colors cursor-pointer min-h-[36px] min-w-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      title="Popout Map Image in New Window"
                      aria-label={`Popout ${m.name} map in a new window`}
                      data-testid={`map-popout-btn-${m.id}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="p-5 flex flex-col gap-3">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {m.name}
                  </h3>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {isSamoel ? (
                      <>
                        <Layers className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                        <span>Isometric Scheme (Steam Guide)</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span>12-Clock Callout Map System</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

### frontend/src/components/maps/TileInspectorDrawer.tsx

```typescript
'use client';

import React from 'react';
import { X, Compass, Footprints, Flame, Shield } from 'lucide-react';
import { MapTile, MapObjective, TotemSpawn, KeyTile, PalletSafetyRating } from '@/types/map';

export type InspectorSelectedItem = MapTile | MapObjective | TotemSpawn | KeyTile | null;

interface TileInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: InspectorSelectedItem;
}

export const TileInspectorDrawer: React.FC<TileInspectorDrawerProps> = ({
  isOpen,
  onClose,
  selectedItem,
}) => {
  if (!isOpen || !selectedItem) return null;

  const name =
    'name' in selectedItem && selectedItem.name
      ? selectedItem.name
      : 'location' in selectedItem && selectedItem.location
      ? selectedItem.location
      : 'location_description' in selectedItem && selectedItem.location_description
      ? selectedItem.location_description
      : 'Map Feature';

  const itemType =
    'type' in selectedItem && selectedItem.type
      ? selectedItem.type
      : 'Totem Spawn Point';

  const palletSafety: PalletSafetyRating | null =
    'pallet_safety_rating' in selectedItem && selectedItem.pallet_safety_rating
      ? (selectedItem.pallet_safety_rating as PalletSafetyRating)
      : null;

  const hasPallet =
    'has_pallet' in selectedItem ? selectedItem.has_pallet : itemType === 'pallet';

  const hasWindow =
    'has_window' in selectedItem ? selectedItem.has_window : itemType === 'window';

  const vaultDirections =
    'vault_directions' in selectedItem && selectedItem.vault_directions
      ? Array.isArray(selectedItem.vault_directions)
        ? selectedItem.vault_directions.join(', ')
        : selectedItem.vault_directions
      : 'vault_direction' in selectedItem && selectedItem.vault_direction
      ? selectedItem.vault_direction
      : null;

  const loopingTips =
    'looping_tips' in selectedItem && selectedItem.looping_tips
      ? selectedItem.looping_tips
      : null;

  const mindgameCounter =
    'mindgame_counter' in selectedItem && selectedItem.mindgame_counter
      ? selectedItem.mindgame_counter
      : null;

  const locationDesc =
    'location_description' in selectedItem
      ? selectedItem.location_description
      : 'location' in selectedItem
      ? selectedItem.location
      : null;

  const renderPalletSafetyBadge = (rating: PalletSafetyRating | null) => {
    if (!rating) {
      if (hasPallet) {
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-950/40 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold">
            <span>🪵 Standard Pallet Present</span>
          </div>
        );
      }
      return null;
    }

    switch (rating) {
      case 'god':
        return (
          <div className="flex items-center justify-between p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-300 shadow-lg shadow-emerald-950/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 text-lg">
                🟩
              </div>
              <div>
                <div className="font-extrabold text-sm text-emerald-200">God Pallet</div>
                <div className="text-[11px] text-emerald-400/80">Forces killer to break pallet. Safe 100% loop reset.</div>
              </div>
            </div>
          </div>
        );
      case 'safe':
        return (
          <div className="flex items-center justify-between p-3 bg-blue-950/80 border border-blue-500/60 rounded-xl text-blue-300 shadow-lg shadow-blue-950/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400 flex items-center justify-center text-blue-400 text-lg">
                🟦
              </div>
              <div>
                <div className="font-extrabold text-sm text-blue-200">Safe Pallet</div>
                <div className="text-[11px] text-blue-400/80">High safety margin. Difficult for killer to mindgame without breaking.</div>
              </div>
            </div>
          </div>
        );
      case 'mindgameable':
        return (
          <div className="flex items-center justify-between p-3 bg-amber-950/80 border border-amber-500/60 rounded-xl text-amber-300 shadow-lg shadow-amber-950/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 text-lg">
                🟨
              </div>
              <div>
                <div className="font-extrabold text-sm text-amber-200">Mindgameable Pallet</div>
                <div className="text-[11px] text-amber-400/80">Medium safety. Watch out for red stain hiding and double-backs.</div>
              </div>
            </div>
          </div>
        );
      case 'unsafe':
        return (
          <div className="flex items-center justify-between p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-rose-300 shadow-lg shadow-rose-950/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-400 text-lg">
                🟥
              </div>
              <div>
                <div className="font-extrabold text-sm text-rose-200">Death Trap / Unsafe Pallet</div>
                <div className="text-[11px] text-rose-400/80">Low wall / short loop. Pre-drop &amp; stun, or abandon immediately!</div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspector-title"
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl z-[60] flex flex-col justify-between transition-transform duration-300 ease-in-out"
    >
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xl font-bold">
            {itemType === 'shack'
              ? '🛖'
              : itemType === 'main'
              ? '🏛️'
              : itemType === 'totem'
              ? '💀'
              : itemType === 'generator'
              ? '⚡'
              : itemType === 'exit_gate'
              ? '🚪'
              : itemType === 'hatch'
              ? '🕳️'
              : '🧱'}
          </div>
          <div>
            <h3 id="inspector-title" className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {name}
            </h3>
            <span className="text-xs font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400/90">
              {itemType}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-5 overflow-y-auto flex-1 scrollbar-thin">
        {(hasPallet || palletSafety) && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Pallet Safety Assessment
            </h4>
            {renderPalletSafetyBadge(palletSafety)}
          </div>
        )}

        {(hasWindow || vaultDirections) && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-indigo-500/30 rounded-2xl space-y-2.5 shadow-sm">
            <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              Vault Direction &amp; Speed Angle Tips
            </h4>
            {vaultDirections && (
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span className="text-slate-500">Allowed Directions:</span>
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 border border-indigo-500/40 text-indigo-800 dark:text-indigo-300 rounded font-mono text-[11px]">
                  {vaultDirections}
                </span>
              </div>
            )}
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              ⚡ <strong className="text-indigo-800 dark:text-indigo-200">Fast Vault (0.5s):</strong> Requires running straight at window with at least 2.5m momentum.
              <br />
              🏃 <strong className="text-slate-500 dark:text-slate-400">Medium Vault (0.9s):</strong> Triggers on angled approach. High risk of killer hit!
            </p>
          </div>
        )}

        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-emerald-500/30 rounded-2xl space-y-2 shadow-sm">
          <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <Footprints className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            Survivor Looping Pathing Tips
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {loopingTips || (
              <>
                Hug high walls tightly to minimize loop distance. Watch killer red stain over low obstacles and keep camera focused behind you while pathing.
              </>
            )}
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-red-500/30 rounded-2xl space-y-2 shadow-sm">
          <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-red-500 animate-pulse" />
            Killer Mindgame Counterplay
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {mindgameCounter || (
              <>
                Killers will attempt to hide red stain by moonwalking backward around high walls or faking window vault angles to force premature pallet drops.
              </>
            )}
          </p>
        </div>

        {locationDesc && (
          <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between shadow-sm">
            <span className="text-slate-500">Location Note:</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium text-right">{locationDesc}</span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center">
        <span className="text-[11px] text-slate-500 font-mono">LemonDBD Interactive Realm Inspector</span>
      </div>
    </aside>
  );
};
```

### frontend/src/components/maps/FullscreenMapEngine.tsx

```typescript
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Skull,
  Shield,
  Layers,
  Zap,
  DoorOpen,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { MapRealm, PalletSafetyRating } from '@/types/map';
import { fetchMapDetail } from '@/services/mapApi';
import { TileInspectorDrawer, InspectorSelectedItem } from './TileInspectorDrawer';

interface FullscreenMapEngineProps {
  mapId: string;
  onClose: () => void;
  availableMaps?: MapRealm[];
  onSelectMapId?: (id: string) => void;
}

export const FullscreenMapEngine: React.FC<FullscreenMapEngineProps> = ({
  mapId,
  onClose,
  availableMaps = [],
  onSelectMapId,
}) => {
  const [currentMapId, setCurrentMapId] = useState<string>(mapId);
  const [activeMap, setActiveMap] = useState<MapRealm | null>(null);
  const [currentSeed, setCurrentSeed] = useState<string>('seed_a');
  const [currentFloor, setCurrentFloor] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setCurrentMapId(mapId);
  }, [mapId]);

  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState<number>(1.0);

  const [showPallets, setShowPallets] = useState<boolean>(true);
  const [showWindows, setShowWindows] = useState<boolean>(true);
  const [showTotems, setShowTotems] = useState<boolean>(true);
  const [showGenerators, setShowGenerators] = useState<boolean>(true);
  const [showExitHatch, setShowExitHatch] = useState<boolean>(true);
  const [showTiles, setShowTiles] = useState<boolean>(true);
  const [showCallouts, setShowCallouts] = useState<boolean>(true);

  const [selectedInspectorItem, setSelectedInspectorItem] = useState<InspectorSelectedItem>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      try {
        const data = await fetchMapDetail(currentMapId, currentSeed, currentFloor);
        setActiveMap(data.map);
      } catch (err: unknown) {
        console.error('Failed to load fullscreen map data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [currentMapId, currentSeed, currentFloor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, onClose]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.1), 5.0));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialPinchDistance(dist);
      setInitialZoom(zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && initialPinchDistance !== null && initialPinchDistance > 0) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / initialPinchDistance;
      setZoom(Math.min(Math.max(initialZoom * factor, 0.1), 5.0));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialPinchDistance(null);
  };

  const handleResetView = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleItemClick = (item: InspectorSelectedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInspectorItem(item);
    setIsDrawerOpen(true);
  };

  const handleSelectMap = (id: string) => {
    setCurrentMapId(id);
    onSelectMapId?.(id);
    handleResetView();
  };

  const getPalletRingClass = (rating?: PalletSafetyRating | null) => {
    switch (rating) {
      case 'god':
        return 'ring-4 ring-emerald-500 bg-emerald-950/90 text-emerald-300 shadow-emerald-500/40';
      case 'safe':
        return 'ring-4 ring-blue-500 bg-blue-950/90 text-blue-300 shadow-blue-500/40';
      case 'mindgameable':
        return 'ring-4 ring-amber-500 bg-amber-950/90 text-amber-300 shadow-amber-500/40';
      case 'unsafe':
        return 'ring-4 ring-rose-500 bg-rose-950/90 text-rose-300 shadow-rose-500/40';
      default:
        return 'ring-2 ring-amber-400/60 bg-slate-900 text-amber-300';
    }
  };

  const renderVaultArrows = (vaultDirs?: string[] | string) => {
    const dirsStr = Array.isArray(vaultDirs) ? vaultDirs.join(' ') : vaultDirs || '';
    const lower = dirsStr.toLowerCase();

    return (
      <div className="flex items-center gap-0.5 text-[9px] text-indigo-300 font-bold">
        {lower.includes('north') && <ArrowUp className="w-3 h-3 text-indigo-400" />}
        {lower.includes('south') && <ArrowDown className="w-3 h-3 text-indigo-400" />}
        {lower.includes('west') && <ArrowLeft className="w-3 h-3 text-indigo-400" />}
        {lower.includes('east') && <ArrowRight className="w-3 h-3 text-indigo-400" />}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="2D Fullscreen Map Engine"
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden select-none text-slate-100"
    >
      <header className="absolute top-0 inset-x-0 z-40 p-4 bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-transparent backdrop-blur-md flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="w-4 h-4 text-amber-500" />
            <span>Close Engine</span>
          </button>

          {activeMap && (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-wide">{activeMap.name}</h1>
                {availableMaps.length > 0 && (
                  <select
                    value={activeMap.id}
                    onChange={(e) => handleSelectMap(e.target.value)}
                    aria-label="Select Realm Map"
                    className="bg-slate-900 border border-slate-800 text-amber-400 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {availableMaps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <span className="text-xs text-amber-400/90 font-medium">
                {activeMap.realm} • {activeMap.layout_type}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label="Map Variant Selector"
            className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-inner"
          >
            <span className="text-[10px] font-mono uppercase text-slate-500 px-2 font-bold">Variant:</span>
            {['seed_a', 'seed_b', 'seed_c'].map((seedKey, idx) => {
              const label = `Seed ${String.fromCharCode(65 + idx)}`;
              const isActive = currentSeed === seedKey;
              return (
                <button
                  key={seedKey}
                  type="button"
                  onClick={() => setCurrentSeed(seedKey)}
                  aria-pressed={isActive}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Floor Selector"
            className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-inner"
          >
            <span className="text-[10px] font-mono uppercase text-slate-500 px-2 font-bold">Floor:</span>
            {[1, 2].map((fl) => {
              const isActive = currentFloor === fl;
              return (
                <button
                  key={fl}
                  type="button"
                  onClick={() => setCurrentFloor(fl)}
                  aria-pressed={isActive}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md scale-105'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Floor {fl}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ touchAction: 'none' }}
        className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center bg-slate-950"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

        {loading && (
          <div
            aria-live="polite"
            className="absolute z-30 inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3">
              <Compass className="w-10 h-10 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-xs font-bold text-slate-300">Rendering Tactical Map Layout...</span>
            </div>
          </div>
        )}

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 75ms ease-out',
          }}
          className="relative w-[900px] h-[700px] bg-slate-900/80 border-2 border-slate-800 rounded-3xl shadow-2xl select-none"
        >
          <div className="absolute inset-0 rounded-3xl border border-slate-700/40 p-4 pointer-events-none">
            <div className="absolute top-3 left-4 text-[10px] font-mono text-slate-600 uppercase tracking-wider">
              [ {activeMap?.realm || 'REALM'} • FLOOR {currentFloor} • VARIANT {currentSeed.toUpperCase()} ]
            </div>
            <div className="absolute bottom-3 right-4 text-[10px] font-mono text-amber-500/60 uppercase">
              LemonDBD Tactical Engine v2.0
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-slate-800/40 rounded-full flex items-center justify-center opacity-30">
              <Compass className="w-16 h-16 text-slate-700" />
            </div>
          </div>

          {showTiles &&
            activeMap?.tiles?.map((tile, idx) => {
              const isPalletTile = tile.has_pallet;
              const isWindowTile = tile.has_window;

              return (
                <div
                  key={tile.id || `tile-${idx}`}
                  style={{ left: `${tile.x}%`, top: `${tile.y}%` }}
                  onClick={(e) => handleItemClick(tile, e)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                >
                  <div className="bg-slate-950/90 border border-emerald-500/80 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl hover:scale-125 hover:border-amber-400 hover:text-amber-300 transition-all flex items-center gap-2">
                    <span className="text-sm">
                      {tile.type === 'shack'
                        ? '🛖'
                        : tile.type === 'main'
                        ? '🏛️'
                        : tile.type === 'gym'
                        ? '🧱'
                        : '🧩'}
                    </span>
                    <span>{tile.name}</span>

                    {isPalletTile && showPallets && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${getPalletRingClass(tile.pallet_safety_rating)}`}>
                        🪵
                      </span>
                    )}

                    {isWindowTile && showWindows && renderVaultArrows(tile.vault_directions || tile.vault_direction)}
                  </div>

                  {showCallouts && (
                    <div className="mt-1 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 text-center shadow whitespace-nowrap">
                      📢 {tile.callout_label || tile.name}
                    </div>
                  )}
                </div>
              );
            })}

          {activeMap?.objectives?.map((obj, idx) => {
            const isTotem = obj.type === 'totem';
            const isGen = obj.type === 'generator';
            const isExit = obj.type === 'exit_gate';
            const isHatch = obj.type === 'hatch';
            const isPallet = obj.type === 'pallet' || obj.pallet_safety_rating;
            const isWindow = obj.type === 'window' || obj.vault_direction;

            if (isTotem && !showTotems) return null;
            if (isGen && !showGenerators) return null;
            if ((isExit || isHatch) && !showExitHatch) return null;
            if (isPallet && !showPallets && !isGen && !isTotem && !isExit && !isHatch) return null;
            if (isWindow && !showWindows && !isGen && !isTotem && !isExit && !isHatch) return null;

            return (
              <div
                key={obj.id || `obj-${idx}`}
                style={{ left: `${obj.x}%`, top: `${obj.y}%` }}
                onClick={(e) => handleItemClick(obj, e)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-25 hover:z-40"
              >
                <div
                  className={`p-2 rounded-2xl shadow-xl border flex items-center justify-center transition-all duration-200 group-hover:scale-130 ${
                    isTotem
                      ? 'bg-red-950/90 border-red-500 text-red-400 ring-2 ring-red-500/40'
                      : isGen
                      ? 'bg-amber-950/90 border-amber-500 text-amber-400 ring-2 ring-amber-500/40'
                      : isExit
                      ? 'bg-emerald-950/90 border-emerald-500 text-emerald-400'
                      : isHatch
                      ? 'bg-purple-950/90 border-purple-500 text-purple-300'
                      : isPallet
                      ? getPalletRingClass(obj.pallet_safety_rating)
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                >
                  {isTotem && <Skull className="w-4 h-4" />}
                  {isGen && <Zap className="w-4 h-4" />}
                  {isExit && <DoorOpen className="w-4 h-4" />}
                  {isHatch && <span className="text-sm">🕳️</span>}
                  {isPallet && !isTotem && !isGen && <span className="text-sm">🪵</span>}
                  {isWindow && !isPallet && !isTotem && !isGen && <span className="text-sm">🪟</span>}
                </div>

                {showCallouts && obj.location_description && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover:block whitespace-nowrap bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-md border border-slate-700 shadow-2xl z-50">
                    📢 {obj.location_description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <footer className="absolute bottom-6 inset-x-6 z-40 flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-none">
        <div
          role="group"
          aria-label="Map Layer Toggles"
          className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl backdrop-blur-xl shadow-2xl overflow-x-auto max-w-full"
        >
          <div className="px-2 text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            Layers:
          </div>

          <button
            type="button"
            onClick={() => setShowPallets(!showPallets)}
            aria-pressed={showPallets}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showPallets
                ? 'bg-amber-950 border border-amber-500/60 text-amber-300 shadow-md'
                : 'bg-slate-950 text-slate-500 border border-slate-800'
            }`}
          >
            <span>🪵 Pallets</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWindows(!showWindows)}
            aria-pressed={showWindows}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showWindows
                ? 'bg-indigo-950 border border-indigo-500/60 text-indigo-300 shadow-md'
                : 'bg-slate-950 text-slate-500 border border-slate-800'
            }`}
          >
            <span>🪟 Windows</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTotems(!showTotems)}
            aria-pressed={showTotems}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showTotems
                ? 'bg-red-950 border border-red-500/60 text-red-400 shadow-md'
                : 'bg-slate-950 text-slate-500 border border-slate-800'
            }`}
          >
            <Skull className="w-3.5 h-3.5" />
            <span>Totems</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGenerators(!showGenerators)}
            aria-pressed={showGenerators}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showGenerators
                ? 'bg-amber-950 border border-amber-400/60 text-amber-400 shadow-md'
                : 'bg-slate-950 text-slate-500 border border-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Gens</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExitHatch(!showExitHatch)}
            aria-pressed={showExitHatch}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showExitHatch
                ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300 shadow-md'
                : 'bg-slate-950 text-slate-500 border border-slate-800'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>Gates &amp; Hatch</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTiles(!showTiles)}
            aria-pressed={showTiles}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showTiles
                ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-400 shadow-md'
                : 'bg-slate-950 text-slate-500 border border-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Tiles</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCallouts(!showCallouts)}
            aria-pressed={showCallouts}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showCallouts
                ? 'bg-blue-950 border border-blue-500/60 text-blue-300 shadow-md'
                : 'bg-slate-950 text-slate-500 border border-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Callouts</span>
          </button>
        </div>

        <div
          role="toolbar"
          aria-label="Engine Zoom and Reset Controls"
          className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl backdrop-blur-xl shadow-2xl"
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.1))}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold text-amber-400 px-2 min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.2, 5.0))}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-800 my-auto" />

          <button
            type="button"
            onClick={handleResetView}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset Pan & Zoom"
            aria-label="Reset Pan and Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </footer>

      <TileInspectorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedItem={selectedInspectorItem}
      />
    </div>
  );
};
```

### frontend/src/components/maps/layouts/DesktopMapLayout.tsx

```typescript
'use client';

import React, { useState } from 'react';
import {
  Search,
  Clock,
  Layers,
  Sparkles,
  Maximize2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Compass,
  X,
} from 'lucide-react';
import type { MapRealm } from '@/types/map';
import { MapCanvas } from '../MapCanvas';
import { MapControls } from '../MapControls';
import { VariantSwitcherBar } from '../VariantSwitcherBar';
import { MapLegendDrawer } from '../MapLegendDrawer';
import { MapDirectoryList } from '../MapDirectoryList';
import { getMapImageSrc } from '@/utils/mapUtils';

export interface DesktopMapLayoutProps {
  maps: MapRealm[];
  groupedMaps: Record<string, MapRealm[]>;
  activeMap: MapRealm | null;
  selectedMapId: string;
  onSelectMapId: (id: string) => void;
  uniqueRealms: string[];
  selectedRealm: string;
  onSelectRealm: (realm: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  activeSource: 'all' | 'hens333' | 'samoelcolt';
  onSourceChange: (source: 'all' | 'hens333' | 'samoelcolt') => void;
  variants: string[];
  onSelectVariant: (variantName: string) => void;
  loading?: boolean;

  transformStyle: { transform: string; transition: string; cursor: string };
  isDragging: boolean;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (level: number) => void;
  onResetZoomPan: () => void;
  canvasHandlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onWheel: (e: React.WheelEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
  };

  onLaunchFullscreen?: () => void;
  onPopoutImage?: (url: string, title: string) => void;
}

export const DesktopMapLayout: React.FC<DesktopMapLayoutProps> = ({
  maps,
  groupedMaps,
  activeMap,
  selectedMapId,
  onSelectMapId,
  uniqueRealms,
  selectedRealm,
  onSelectRealm,
  search,
  onSearchChange,
  activeSource,
  onSourceChange,
  variants,
  onSelectVariant,
  loading = false,
  transformStyle,
  isDragging,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onResetZoomPan,
  canvasHandlers,
  onLaunchFullscreen,
  onPopoutImage,
}) => {
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  return (
    <div
      className="flex flex-col lg:flex-row gap-4 w-full h-[calc(100vh-13.5rem)] min-h-[580px] items-stretch relative"
      data-testid="desktop-map-layout"
    >
      <aside
        className={`shrink-0 flex flex-col rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 shadow-lg dark:shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 ${
          isSidebarCollapsed ? 'w-14' : 'w-full lg:w-80 xl:w-[22rem]'
        }`}
        data-testid="desktop-map-sidebar"
      >
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                <Compass className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 font-mono truncate">
                Map Directory
              </h3>
              <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 font-mono">
                {maps.length}
              </span>
            </div>
          ) : (
            <div className="mx-auto">
              <Compass className="h-4 w-4 text-cyan-500" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label={isSidebarCollapsed ? 'Expand Map Sidebar' : 'Collapse Map Sidebar'}
            title={isSidebarCollapsed ? 'Expand Map Directory' : 'Collapse Map Directory'}
            className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all cursor-pointer shadow-sm shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {!isSidebarCollapsed && (
          <>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 space-y-2.5 shrink-0">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search map or realm..."
                  aria-label="Search map or realm"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 pl-9 pr-8 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none min-h-[36px] shadow-inner"
                  data-testid="desktop-map-search-input"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="Clear search input"
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div
                role="group"
                aria-label="Map Provider Source"
                className="flex w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-950/80 p-1"
              >
                <button
                  type="button"
                  onClick={() => onSourceChange('hens333')}
                  aria-pressed={activeSource === 'hens333'}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1 text-[11px] font-extrabold transition-all cursor-pointer min-h-[30px] ${
                    activeSource === 'hens333'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/20'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  data-testid="desktop-map-source-hens333"
                >
                  <Clock className="h-3 w-3" />
                  <span>Hens333</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSourceChange('samoelcolt')}
                  aria-pressed={activeSource === 'samoelcolt'}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1 text-[11px] font-extrabold transition-all cursor-pointer min-h-[30px] ${
                    activeSource === 'samoelcolt'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/20'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  data-testid="desktop-map-source-samoelcolt"
                >
                  <Layers className="h-3 w-3" />
                  <span>SamoelColt</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSourceChange('all')}
                  aria-pressed={activeSource === 'all'}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1 text-[11px] font-extrabold transition-all cursor-pointer min-h-[30px] ${
                    activeSource === 'all'
                      ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  data-testid="desktop-map-source-all"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>All</span>
                </button>
              </div>
            </div>

            <div
              role="group"
              aria-label="Realm Filters"
              className="flex items-center gap-1.5 overflow-x-auto p-2.5 border-b border-slate-200 dark:border-slate-800/80 scrollbar-thin shrink-0 bg-slate-50/40 dark:bg-slate-950/20"
            >
              <button
                type="button"
                onClick={() => onSelectRealm('all')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black whitespace-nowrap transition-all cursor-pointer border min-h-[28px] ${
                  selectedRealm === 'all'
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-700'
                }`}
                data-testid="desktop-map-realm-pill-all"
              >
                All ({maps.length})
              </button>
              {uniqueRealms.map((r) => {
                const count = groupedMaps[r]?.length || 0;
                const slug = r.toLowerCase().replace(/\s+/g, '-');
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onSelectRealm(r)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border min-h-[28px] ${
                      selectedRealm === r
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-700'
                    }`}
                    data-testid={`desktop-map-realm-pill-${slug}`}
                  >
                    {r} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 min-h-0 scrollbar-thin [&_[data-testid=map-directory-grid]]:!grid-cols-1 [&_[data-testid=map-directory-grid]]:!gap-2">
              <MapDirectoryList
                groupedMaps={groupedMaps}
                selectedMapId={selectedMapId}
                onSelectMapId={onSelectMapId}
                onPopoutImage={onPopoutImage}
                loading={loading}
                searchQuery={search}
                selectedRealm={selectedRealm}
                showFilters={false}
              />
            </div>
          </>
        )}
      </aside>

      <main
        className="flex-1 flex flex-col min-w-0 h-full rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-950/95 shadow-xl dark:shadow-2xl overflow-hidden relative backdrop-blur-xl"
        data-testid="desktop-map-viewport"
      >
        <header
          className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shrink-0 z-10"
          data-testid="desktop-map-header"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-black text-cyan-700 dark:text-cyan-400 whitespace-nowrap font-mono">
              {activeMap?.realm || 'Select a Map'}
            </span>
            <span
              className={`hidden sm:inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase whitespace-nowrap font-mono ${
                activeMap?.source === 'samoelcolt'
                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                  : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
              }`}
            >
              {activeMap?.source === 'samoelcolt' ? 'SamoelColt 3D' : 'Hens333 12-Clock'}
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate font-mono tracking-tight">
              {activeMap ? activeMap.name : 'No Map Selected'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onLaunchFullscreen && (
              <button
                type="button"
                onClick={onLaunchFullscreen}
                aria-label="Launch 2D Interactive Engine"
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer min-h-[34px] shadow-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                data-testid="desktop-map-fullscreen-btn"
                title="Launch 2D Interactive Engine"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">2D Engine</span>
              </button>
            )}
            {onPopoutImage && activeMap && (
              <button
                type="button"
                onClick={() => onPopoutImage(getMapImageSrc(activeMap), activeMap.name)}
                aria-label="Popout Map Image in New Window"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all cursor-pointer min-h-[34px] shadow-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                data-testid="desktop-map-popout-btn"
                title="Popout Map Image in New Window"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Popout</span>
              </button>
            )}
          </div>
        </header>

        <VariantSwitcherBar
          variants={variants}
          activeMapName={activeMap?.name || ''}
          onSelectVariant={onSelectVariant}
          className="m-3 mb-0 shrink-0"
        />

        <div className="relative flex-1 w-full min-h-0 overflow-hidden flex items-center justify-center bg-slate-900/10 dark:bg-slate-950/80">
          <MapCanvas
            imageUrl={getMapImageSrc(activeMap)}
            mapName={activeMap?.name}
            realmName={activeMap?.realm}
            transformStyle={transformStyle}
            isDragging={isDragging}
            className="h-full w-full rounded-none border-0 max-h-none"
            {...canvasHandlers}
          />

          <div className="absolute top-4 right-4 z-20" data-testid="desktop-map-controls">
            <MapControls
              zoomLevel={zoomLevel}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onSetZoom={onSetZoom}
              onReset={onResetZoomPan}
              onFullscreen={onLaunchFullscreen}
              onPopout={
                onPopoutImage && activeMap
                  ? () => onPopoutImage(getMapImageSrc(activeMap), activeMap.name)
                  : undefined
              }
              showPresets={true}
              layoutMode="horizontal"
            />
          </div>
        </div>

        <MapLegendDrawer
          clockSystem={activeMap?.clock_system}
          source={activeMap?.source}
          mapName={activeMap?.name}
          realmName={activeMap?.realm}
          isOpen={isLegendOpen}
          onToggle={() => setIsLegendOpen((prev) => !prev)}
          collapsible={true}
          className="border-t border-slate-200/90 dark:border-slate-800/80 rounded-none rounded-b-3xl shrink-0"
        />
      </main>
    </div>
  );
};
```

### frontend/src/components/maps/layouts/MobileMapLayout.tsx

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  Search,
  Clock,
  Layers,
  Sparkles,
  Maximize2,
  ChevronUp,
  X,
} from 'lucide-react';
import { MapCanvas } from '../MapCanvas';
import { MapControls } from '../MapControls';
import { VariantSwitcherBar } from '../VariantSwitcherBar';
import { MapLegendDrawer } from '../MapLegendDrawer';
import { MapDirectoryList } from '../MapDirectoryList';
import { getMapImageSrc } from '@/utils/mapUtils';
import type { DesktopMapLayoutProps } from './DesktopMapLayout';

export type MobileMapLayoutProps = DesktopMapLayoutProps;

export const MobileMapLayout: React.FC<MobileMapLayoutProps> = ({
  maps,
  groupedMaps,
  activeMap,
  selectedMapId,
  onSelectMapId,
  uniqueRealms,
  selectedRealm,
  onSelectRealm,
  search,
  onSearchChange,
  activeSource,
  onSourceChange,
  variants,
  onSelectVariant,
  loading = false,
  transformStyle,
  isDragging,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onResetZoomPan,
  canvasHandlers,
  onLaunchFullscreen,
  onPopoutImage,
}) => {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!isBottomSheetOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBottomSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBottomSheetOpen]);

  return (
    <div
      className="flex flex-col w-full h-[calc(100vh-14rem)] min-h-[480px] rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-950/95 shadow-xl dark:shadow-2xl overflow-hidden relative backdrop-blur-xl"
      data-testid="mobile-map-layout"
    >
      <header
        className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shrink-0 z-10"
        data-testid="mobile-map-topbar"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-[11px] font-black text-cyan-700 dark:text-cyan-400 whitespace-nowrap font-mono">
            {activeMap?.realm || 'Select a Map'}
          </span>
          <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate font-mono">
            {activeMap ? activeMap.name : 'Select a Map'}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div
            role="group"
            aria-label="Map Provider Toggle"
            className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-0.5"
            data-testid="mobile-map-source-toggle"
          >
            <button
              type="button"
              onClick={() => onSourceChange('hens333')}
              aria-pressed={activeSource === 'hens333'}
              title="Hens333 (12-Clock)"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 ${
                activeSource === 'hens333'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              data-testid="mobile-map-source-hens333"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSourceChange('samoelcolt')}
              aria-pressed={activeSource === 'samoelcolt'}
              title="SamoelColt (Isometric)"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 ${
                activeSource === 'samoelcolt'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              data-testid="mobile-map-source-samoelcolt"
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSourceChange('all')}
              aria-pressed={activeSource === 'all'}
              title="All Sources"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-500 ${
                activeSource === 'all'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              data-testid="mobile-map-source-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </div>

          {onLaunchFullscreen && (
            <button
              type="button"
              onClick={onLaunchFullscreen}
              aria-label="Launch Fullscreen Engine"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer min-h-[30px] min-w-[30px] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              data-testid="mobile-map-fullscreen-btn"
              title="Launch Fullscreen Engine"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      <VariantSwitcherBar
        variants={variants}
        activeMapName={activeMap?.name || ''}
        onSelectVariant={onSelectVariant}
        className="m-2 mb-0 shrink-0"
      />

      <div className="relative flex-1 w-full min-h-0 overflow-hidden flex items-center justify-center bg-slate-900/10 dark:bg-slate-950/80">
        <MapCanvas
          imageUrl={getMapImageSrc(activeMap)}
          mapName={activeMap?.name}
          realmName={activeMap?.realm}
          transformStyle={transformStyle}
          isDragging={isDragging}
          className="h-full w-full rounded-none border-0 max-h-none"
          {...canvasHandlers}
        />

        <div
          className="absolute bottom-20 right-3 z-20"
          data-testid="mobile-map-controls"
        >
          <MapControls
            zoomLevel={zoomLevel}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onSetZoom={onSetZoom}
            onReset={onResetZoomPan}
            onFullscreen={onLaunchFullscreen}
            onPopout={
              onPopoutImage && activeMap
                ? () => onPopoutImage(getMapImageSrc(activeMap), activeMap.name)
                : undefined
            }
            showPresets={false}
            layoutMode="compact"
          />
        </div>
      </div>

      {!isBottomSheetOpen && (
        <div
          className="absolute bottom-0 inset-x-0 z-30 flex items-center justify-between p-3 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-xl shadow-2xl rounded-t-3xl"
          data-testid="mobile-bottom-sheet"
        >
          <button
            type="button"
            onClick={() => setIsBottomSheetOpen(true)}
            className="flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-black transition-all cursor-pointer min-h-[44px] shadow-sm font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            data-testid="mobile-bottom-sheet-toggle"
          >
            <div className="flex items-center gap-2 truncate">
              <Compass className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="truncate">
                {activeMap ? activeMap.name : 'Browse All Maps & Realms'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-slate-400 dark:text-slate-400">
              <Search className="h-3.5 w-3.5" />
              <ChevronUp className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}

      {isBottomSheetOpen && (
        <>
          <div
            onClick={() => setIsBottomSheetOpen(false)}
            className="absolute inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm z-40 cursor-pointer"
            data-testid="mobile-bottom-sheet-backdrop"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Map Directory and Legends"
            className="absolute bottom-0 inset-x-0 z-50 h-[80vh] max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700/80 rounded-t-3xl shadow-2xl backdrop-blur-2xl"
            data-testid="mobile-bottom-sheet-content"
          >
            <div
              onClick={() => setIsBottomSheetOpen(false)}
              className="w-full py-2.5 flex justify-center cursor-pointer select-none shrink-0"
              data-testid="mobile-bottom-sheet-handle"
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors" />
            </div>

            <div className="px-4 pb-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search map or realm..."
                  aria-label="Search map or realm"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none min-h-[38px] shadow-inner"
                  data-testid="mobile-map-search-input"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsBottomSheetOpen(false)}
                aria-label="Close Bottom Sheet"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                data-testid="mobile-bottom-sheet-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              role="group"
              aria-label="Realm Pills"
              className="flex items-center gap-1.5 overflow-x-auto p-3 border-b border-slate-200 dark:border-slate-800 scrollbar-thin shrink-0"
            >
              <button
                type="button"
                onClick={() => onSelectRealm('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer border min-h-[32px] ${
                  selectedRealm === 'all'
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-700'
                }`}
                data-testid="mobile-map-realm-pill-all"
              >
                All ({maps.length})
              </button>
              {uniqueRealms.map((r) => {
                const count = groupedMaps[r]?.length || 0;
                const slug = r.toLowerCase().replace(/\s+/g, '-');
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onSelectRealm(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border min-h-[32px] ${
                      selectedRealm === r
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-md'
                        : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-700'
                    }`}
                    data-testid={`mobile-map-realm-pill-${slug}`}
                  >
                    {r} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 font-mono">
                  Map Directory
                </h3>
                <MapDirectoryList
                  groupedMaps={groupedMaps}
                  selectedMapId={selectedMapId}
                  onSelectMapId={(id) => {
                    onSelectMapId(id);
                    setIsBottomSheetOpen(false);
                  }}
                  onPopoutImage={onPopoutImage}
                  loading={loading}
                  searchQuery={search}
                  selectedRealm={selectedRealm}
                  showFilters={false}
                />
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 font-mono">
                  Sector Callouts &amp; Clock System
                </h3>
                <MapLegendDrawer
                  clockSystem={activeMap?.clock_system}
                  source={activeMap?.source}
                  mapName={activeMap?.name}
                  realmName={activeMap?.realm}
                  isOpen={true}
                  collapsible={false}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
```

### frontend/src/components/maps/MapExplorer.tsx

```typescript
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { MapRealm } from '@/types/map';
import { useMapExplorerData, type MapSource } from '@/hooks/useMapExplorerData';
import { useMapGestures } from '@/hooks/useMapGestures';
import { handlePopoutImageWindow } from '@/utils/mapUtils';
import { DesktopMapLayout } from './layouts/DesktopMapLayout';
import { MobileMapLayout } from './layouts/MobileMapLayout';
import { FullscreenMapEngine } from './FullscreenMapEngine';

export interface MapExplorerProps {
  initialMapName?: string;
  selectedMap?: { mapName: string; timestamp: number } | string;
  selectedSource?: MapSource;
  onSourceChange?: (source: MapSource) => void;
  onActionTriggered?: (action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => void;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
  triggerAction?:
    | { action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close'; timestamp: number }
    | 'zoom_in'
    | 'zoom_out'
    | 'fullscreen'
    | 'close'
    | null;
}

export const MapExplorer: React.FC<MapExplorerProps> = ({
  initialMapName = '',
  selectedMap,
  selectedSource,
  onSourceChange,
  onActionTriggered,
  onAvailableMapsLoaded,
  triggerAction,
}) => {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);

  const {
    maps,
    loading,
    activeMap,
    selectedMapId,
    selectedRealm,
    setSelectedRealm,
    search,
    setSearch,
    activeSource,
    setActiveSource,
    uniqueRealms,
    groupedMaps,
    variants,
    selectMapById,
    selectVariantByName,
  } = useMapExplorerData({
    initialMapName,
    selectedMap,
    selectedSource,
    onSourceChange,
    onAvailableMapsLoaded,
  });

  const {
    zoomLevel,
    isDragging,
    handleZoomIn,
    handleZoomOut,
    handleSetZoom,
    handleResetZoomPan,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    transformStyle,
  } = useMapGestures({
    onActionTriggered,
  });

  const canvasHandlers = useMemo(
    () => ({
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onWheel: handleWheel,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    }),
    [
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleMouseLeave,
      handleWheel,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleTouchCancel,
    ]
  );

  useEffect(() => {
    handleResetZoomPan();
  }, [selectedMapId, handleResetZoomPan]);

  useEffect(() => {
    if (!triggerAction) return;
    const action = typeof triggerAction === 'object' ? triggerAction.action : triggerAction;
    if (action === 'zoom_in') {
      handleZoomIn();
    } else if (action === 'zoom_out') {
      handleZoomOut();
    } else if (action === 'fullscreen') {
      setIsFullscreenOpen(true);
    } else if (action === 'close') {
      setIsFullscreenOpen(false);
    }
  }, [triggerAction, handleZoomIn, handleZoomOut]);

  useEffect(() => {
    if (!isFullscreenOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreenOpen(false);
        onActionTriggered?.('close');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenOpen, onActionTriggered]);

  const handlePopoutImage = useCallback((url: string, title: string) => {
    handlePopoutImageWindow(url, title);
  }, []);

  return (
    <div className="w-full space-y-6" data-testid="map-explorer-root">
      <div className="hidden lg:block">
        <DesktopMapLayout
          maps={maps}
          groupedMaps={groupedMaps}
          activeMap={activeMap}
          selectedMapId={selectedMapId}
          onSelectMapId={selectMapById}
          uniqueRealms={uniqueRealms}
          selectedRealm={selectedRealm}
          onSelectRealm={setSelectedRealm}
          search={search}
          onSearchChange={setSearch}
          activeSource={activeSource}
          onSourceChange={setActiveSource}
          variants={variants}
          onSelectVariant={selectVariantByName}
          loading={loading}
          transformStyle={transformStyle}
          isDragging={isDragging}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onSetZoom={handleSetZoom}
          onResetZoomPan={handleResetZoomPan}
          canvasHandlers={canvasHandlers}
          onLaunchFullscreen={() => {
            setIsFullscreenOpen(true);
            onActionTriggered?.('fullscreen');
          }}
          onPopoutImage={handlePopoutImage}
        />
      </div>

      <div className="block lg:hidden">
        <MobileMapLayout
          maps={maps}
          groupedMaps={groupedMaps}
          activeMap={activeMap}
          selectedMapId={selectedMapId}
          onSelectMapId={selectMapById}
          uniqueRealms={uniqueRealms}
          selectedRealm={selectedRealm}
          onSelectRealm={setSelectedRealm}
          search={search}
          onSearchChange={setSearch}
          activeSource={activeSource}
          onSourceChange={setActiveSource}
          variants={variants}
          onSelectVariant={selectVariantByName}
          loading={loading}
          transformStyle={transformStyle}
          isDragging={isDragging}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onSetZoom={handleSetZoom}
          onResetZoomPan={handleResetZoomPan}
          canvasHandlers={canvasHandlers}
          onLaunchFullscreen={() => {
            setIsFullscreenOpen(true);
            onActionTriggered?.('fullscreen');
          }}
          onPopoutImage={handlePopoutImage}
        />
      </div>

      {isFullscreenOpen && activeMap && (
        <FullscreenMapEngine
          mapId={activeMap.id}
          availableMaps={maps}
          onSelectMapId={(id) => {
            selectMapById(id);
          }}
          onClose={() => {
            setIsFullscreenOpen(false);
            onActionTriggered?.('close');
          }}
        />
      )}
    </div>
  );
};
```

### frontend/src/components/maps/VoiceCommandBanner.tsx

```typescript
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
  CheckCircle2,
  VolumeX,
  RefreshCw,
  Cpu,
  Globe,
  Info,
  ArrowRight,
} from 'lucide-react';
import {
  matchVoiceQuery,
  getVariantsForMap,
  MapSource,
  MatchResult,
} from '@/utils/mapVoiceMatcher';
import {
  getBrowserCompatibility,
  AudioCaptureSession,
  initClientSpeechModel,
  transcribeClientAudio,
  subscribeModelProgress,
  VoiceEngineType,
  ModelProgressInfo,
  BrowserCompatibilityInfo,
} from '@/services/clientSpeechModel';
import { VoiceEngineInfoModal } from './VoiceEngineInfoModal';
import { PerkDictionary } from '@/types/perks';

export interface VoiceCommandBannerProps {
  locale?: string;
  currentSource: 'all' | 'hens333' | 'samoelcolt';
  onSourceChange: (source: 'all' | 'hens333' | 'samoelcolt') => void;
  onSelectMap: (mapName: string, mapId?: string, source?: string) => void;
  onAction?: (action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => void;
  availableMaps?: Array<{ id: string; name: string; realm?: string; source?: string }>;
  className?: string;
  dict?: PerkDictionary;
}

export type VoiceStatusState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'matched'
  | 'nomatch'
  | 'error';

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

type WindowWithSpeech = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitAudioContext?: typeof AudioContext;
  };

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const win = window as WindowWithSpeech;
    const AudioCtx = win.AudioContext || win.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

function playMicStartSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(540, now);
    osc1.frequency.exponentialRampToValueAtTime(760, now + 0.1);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.05);
    gain2.gain.setValueAtTime(0.1, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.16);
  } catch {
    // Audio feedback is non-critical
  }
}

function playMatchSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.055;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  } catch {
    // Audio feedback is non-critical
  }
}

const QUICK_COMMAND_PROMPTS = [
  { label: "Azarov's", query: "Azarov's Resting Place" },
  { label: 'RPD East', query: 'RPD East Wing' },
  { label: 'Badham 2', query: 'Preschool II' },
  { label: 'Dead Dawg', query: 'Dead Dawg Saloon' },
  { label: 'The Game', query: 'The Game' },
  { label: 'Switch to Samoel', query: 'Switch to Samoel' },
  { label: 'Switch to Hens', query: 'Switch to Hens' },
  { label: 'Zoom In', query: 'Zoom In' },
  { label: 'Fullscreen', query: 'Fullscreen' },
];

export function VoiceCommandBanner({
  locale = 'en',
  currentSource,
  onSourceChange,
  onSelectMap,
  onAction,
  availableMaps,
  className = '',
  dict,
}: VoiceCommandBannerProps) {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatusState>('idle');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [matchedResult, setMatchedResult] = useState<MatchResult | null>(null);
  const [disambiguationVariants, setDisambiguationVariants] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const [browserInfo, setBrowserInfo] = useState<BrowserCompatibilityInfo>(() =>
    getBrowserCompatibility()
  );
  const [activeEngine, setActiveEngine] = useState<VoiceEngineType>('web-speech');
  const [modelProgress, setModelProgress] = useState<ModelProgressInfo>({
    status: 'unloaded',
    progress: 0,
  });
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioSessionRef = useRef<AudioCaptureSession | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const liveTranscriptRef = useRef<string>('');
  const pendingMatchRef = useRef<MatchResult | null>(null);
  const isHoldingRef = useRef<boolean>(false);
  const holdStartTimeRef = useRef<number>(0);
  const mouseDownListeningStateRef = useRef<boolean>(false);

  const propsRef = useRef({
    currentSource,
    onSourceChange,
    onSelectMap,
    onAction,
    availableMaps,
    soundEnabled,
  });

  useEffect(() => {
    propsRef.current = {
      currentSource,
      onSourceChange,
      onSelectMap,
      onAction,
      availableMaps,
      soundEnabled,
    };
  }, [currentSource, onSourceChange, onSelectMap, onAction, availableMaps, soundEnabled]);

  useEffect(() => {
    const compat = getBrowserCompatibility();
    setBrowserInfo(compat);
    setActiveEngine(compat.recommendedEngine);

    const unsubscribe = subscribeModelProgress((info) => {
      setModelProgress(info);
    });

    if (compat.recommendedEngine === 'client-model') {
      initClientSpeechModel(locale);
    }

    return () => {
      unsubscribe();
    };
  }, [locale]);

  useEffect(() => {
    return () => {
      isHoldingRef.current = false;
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {}
      }
      if (audioSessionRef.current) {
        try {
          audioSessionRef.current.stop();
        } catch {}
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const executeMatch = useCallback((result: MatchResult) => {
    setMatchedResult(result);
    pendingMatchRef.current = null;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    const { onSourceChange: triggerSourceChange, onAction: triggerAction, onSelectMap: triggerSelectMap, soundEnabled: isSoundOn } = propsRef.current;

    if (result.action === 'switch_source' && result.actionPayload) {
      setVoiceStatus('matched');
      if (isSoundOn) playMatchSuccessSound();
      triggerSourceChange(result.actionPayload as MapSource);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setVoiceStatus('idle');
      }, 2200);
      return;
    }

    if (result.action && ['zoom_in', 'zoom_out', 'fullscreen', 'close'].includes(result.action)) {
      setVoiceStatus('matched');
      if (isSoundOn) playMatchSuccessSound();
      if (triggerAction) {
        triggerAction(result.action as 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close');
      }
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setVoiceStatus('idle');
      }, 2200);
      return;
    }

    if (result.matchedMapName) {
      setVoiceStatus('matched');
      if (isSoundOn) playMatchSuccessSound();
      triggerSelectMap(result.matchedMapName, result.matchedMapId, result.source);

      const variants =
        result.availableVariants ||
        getVariantsForMap(result.matchedMapName);
      if (variants && variants.length > 1) {
        setDisambiguationVariants(variants);
      } else {
        setDisambiguationVariants([]);
      }

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setVoiceStatus('idle');
      }, 2400);
      return;
    }

    setVoiceStatus('nomatch');
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setVoiceStatus('idle');
    }, 2200);
  }, []);

  const handleExecuteCommand = useCallback(
    (queryText: string) => {
      liveTranscriptRef.current = queryText;
      setLiveTranscript(queryText);

      const result = matchVoiceQuery(
        queryText,
        propsRef.current.currentSource,
        propsRef.current.availableMaps
      );

      if (result) {
        executeMatch(result);
      } else {
        setVoiceStatus('nomatch');
        resetTimerRef.current = setTimeout(() => {
          setVoiceStatus('idle');
        }, 2000);
      }
    },
    [executeMatch]
  );

  const stopListeningAndProcess = useCallback(async () => {
    isListeningRef.current = false;
    isHoldingRef.current = false;
    setAudioLevel(0);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    if (activeEngine === 'client-model') {
      if (audioSessionRef.current) {
        setVoiceStatus('processing');
        const audioBuffer = audioSessionRef.current.stop();
        audioSessionRef.current = null;

        if (audioBuffer && audioBuffer.length > 1600) {
          try {
            const transcript = await transcribeClientAudio(audioBuffer, locale);
            const cleanText = (transcript || '').trim();
            liveTranscriptRef.current = cleanText;
            setLiveTranscript(cleanText);

            if (cleanText) {
              const match = matchVoiceQuery(
                cleanText,
                propsRef.current.currentSource,
                propsRef.current.availableMaps
              );
              if (match) {
                executeMatch(match);
                return;
              }
            }
          } catch (err: unknown) {
            console.error('[VoiceNav] Client-side transcription error:', err);
          }
        }

        setVoiceStatus('nomatch');
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setVoiceStatus('idle');
        }, 2200);
      }
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e: unknown) {
        console.warn('[VoiceNav] Error stopping recognition in stopListeningAndProcess:', e);
      }
    }

    const currentText = liveTranscriptRef.current.trim();
    if (currentText) {
      const match =
        pendingMatchRef.current ||
        matchVoiceQuery(
          currentText,
          propsRef.current.currentSource,
          propsRef.current.availableMaps
        );

      if (match) {
        executeMatch(match);
        return;
      } else {
        setVoiceStatus('nomatch');
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setVoiceStatus('idle');
        }, 2200);
        return;
      }
    }

    setVoiceStatus('idle');
  }, [activeEngine, locale, executeMatch]);

  const startListening = useCallback(
    async (isHold = false) => {
      if (isListeningRef.current) {
        return;
      }

      if (typeof window === 'undefined') return;

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      pendingMatchRef.current = null;
      isHoldingRef.current = isHold;
      if (isHold) {
        holdStartTimeRef.current = Date.now();
      }

      if (activeEngine === 'client-model') {
        try {
          isListeningRef.current = true;
          setVoiceStatus('listening');
          liveTranscriptRef.current = '';
          setLiveTranscript('');
          setMatchedResult(null);
          setErrorMessage('');
          pendingMatchRef.current = null;

          if (propsRef.current.soundEnabled) {
            playMicStartSound();
          }

          let speechDetected = false;
          audioSessionRef.current = new AudioCaptureSession();
          audioSessionRef.current.setLevelCallback((lvl) => {
            setAudioLevel(lvl);
            if (!isHoldingRef.current && isListeningRef.current) {
              if (lvl > 15) {
                speechDetected = true;
                if (silenceTimerRef.current) {
                  clearTimeout(silenceTimerRef.current);
                  silenceTimerRef.current = null;
                }
              } else if (speechDetected && lvl < 8) {
                if (!silenceTimerRef.current) {
                  silenceTimerRef.current = setTimeout(() => {
                    if (isListeningRef.current) {
                      stopListeningAndProcess();
                    }
                  }, 1200);
                }
              }
            }
          });
          await audioSessionRef.current.start();
        } catch (err: unknown) {
          isListeningRef.current = false;
          isHoldingRef.current = false;
          setVoiceStatus('error');
          const isPermissionErr =
            err instanceof DOMException && err.name === 'NotAllowedError';
          setErrorMessage(
            isPermissionErr
              ? 'Microphone access blocked. Please allow microphone permissions in your browser address bar.'
              : 'Failed to access microphone for local speech model.'
          );
        }
        return;
      }

      const win = window as WindowWithSpeech;
      const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRec) {
        setActiveEngine('client-model');
        initClientSpeechModel(locale);
        return;
      }

      isListeningRef.current = true;

      try {
        const recognition = new SpeechRec();
        recognitionRef.current = recognition;

        recognition.lang =
          locale === 'pl'
            ? 'pl-PL'
            : locale === 'es'
            ? 'es-ES'
            : locale === 'tr'
            ? 'tr-TR'
            : locale === 'de'
            ? 'de-DE'
            : locale === 'fr'
            ? 'fr-FR'
            : 'en-US';
        recognition.interimResults = true;
        recognition.maxAlternatives = 5;
        recognition.continuous = true;

        recognition.onstart = () => {
          isListeningRef.current = true;
          setVoiceStatus('listening');
          liveTranscriptRef.current = '';
          setLiveTranscript('');
          setMatchedResult(null);
          setErrorMessage('');
          pendingMatchRef.current = null;
          if (propsRef.current.soundEnabled) {
            playMicStartSound();
          }
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimText = '';
          let finalText = '';
          const alternatives: string[] = [];

          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              finalText += res[0].transcript + ' ';
            } else {
              interimText += res[0].transcript + ' ';
            }
            for (let j = 0; j < res.length; j++) {
              alternatives.push(res[j].transcript);
            }
          }

          const combinedTranscript = (finalText + interimText).trim();
          liveTranscriptRef.current = combinedTranscript;
          setLiveTranscript(combinedTranscript);

          let bestMatch = matchVoiceQuery(
            combinedTranscript,
            propsRef.current.currentSource,
            propsRef.current.availableMaps
          );

          if (!bestMatch) {
            for (const alt of alternatives) {
              const altMatch = matchVoiceQuery(
                alt,
                propsRef.current.currentSource,
                propsRef.current.availableMaps
              );
              if (altMatch) {
                bestMatch = altMatch;
                break;
              }
            }
          }

          pendingMatchRef.current = bestMatch;
          setMatchedResult(bestMatch);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          isListeningRef.current = false;
          isHoldingRef.current = false;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          if (event.error === 'network' || event.error === 'service-not-allowed') {
            setActiveEngine('client-model');
            initClientSpeechModel(locale);
            setVoiceStatus('nomatch');
            setErrorMessage('Switched to Local In-Browser Speech AI');
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
            resetTimerRef.current = setTimeout(() => {
              setVoiceStatus('idle');
            }, 3000);
          } else if (event.error === 'not-allowed') {
            setVoiceStatus('error');
            setErrorMessage(
              'Microphone access blocked. Please allow microphone permissions in your browser address bar.'
            );
          } else if (event.error === 'no-speech') {
            setVoiceStatus('nomatch');
            resetTimerRef.current = setTimeout(() => {
              setVoiceStatus('idle');
            }, 2400);
          } else {
            setVoiceStatus('error');
            setErrorMessage(`Speech recognition error: ${event.error || 'Unknown error'}`);
          }
        };

        recognition.onend = () => {
          if (isHoldingRef.current) {
            try {
              recognition.start();
              return;
            } catch (e: unknown) {
              console.warn('[VoiceNav] Auto-restart failed:', e);
              isHoldingRef.current = false;
              isListeningRef.current = false;
            }
          }

          isListeningRef.current = false;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          const currentText = liveTranscriptRef.current.trim();
          if (currentText) {
            const matchToExecute =
              pendingMatchRef.current ||
              matchVoiceQuery(
                currentText,
                propsRef.current.currentSource,
                propsRef.current.availableMaps
              );

            if (matchToExecute) {
              executeMatch(matchToExecute);
              return;
            }
          }

          setVoiceStatus((prev) => {
            if (prev === 'listening') {
              return liveTranscriptRef.current ? 'nomatch' : 'idle';
            }
            return prev;
          });
          if (liveTranscriptRef.current) {
            resetTimerRef.current = setTimeout(() => {
              setVoiceStatus('idle');
            }, 2400);
          }
        };

        recognition.start();
      } catch (err: unknown) {
        isListeningRef.current = false;
        isHoldingRef.current = false;
        setVoiceStatus('error');
        const message = err instanceof Error ? err.message : 'Failed to initialize voice recognition.';
        setErrorMessage(message);
      }
    },
    [activeEngine, locale, executeMatch, stopListeningAndProcess]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox');

      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
        if (e.repeat) return;
        e.preventDefault();
        if (!isListeningRef.current) {
          isHoldingRef.current = true;
          holdStartTimeRef.current = Date.now();
          startListening(true);
        } else {
          stopListeningAndProcess();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox');

      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        isHoldingRef.current = false;
        if (isListeningRef.current) {
          stopListeningAndProcess();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startListening, stopListeningAndProcess]);

  const statusConfig = {
    idle: {
      badge: 'IDLE • READY',
      badgeClass:
        'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
      dotClass: 'bg-cyan-500 dark:bg-cyan-400',
      icon: Mic,
      buttonColor:
        'bg-gradient-to-br from-cyan-600 via-cyan-700 to-blue-800 text-white shadow-cyan-900/30 ring-cyan-500/30 hover:from-cyan-500 hover:to-blue-700',
    },
    listening: {
      badge: 'LISTENING • SPEAK NOW',
      badgeClass:
        'bg-rose-500/20 border-rose-500/50 text-rose-700 dark:text-rose-300 animate-pulse',
      dotClass: 'bg-rose-500 animate-ping',
      icon: Volume2,
      buttonColor:
        'bg-gradient-to-br from-rose-500 via-red-600 to-rose-800 text-white shadow-red-900/50 ring-red-500/60 hover:from-rose-400 hover:to-red-700',
    },
    processing: {
      badge: 'PROCESSING AUDIO...',
      badgeClass:
        'bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300',
      dotClass: 'bg-amber-500 animate-pulse',
      icon: RefreshCw,
      buttonColor:
        'bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 text-white shadow-amber-900/40 ring-amber-500/40',
    },
    matched: {
      badge: 'MATCHED • EXECUTING',
      badgeClass:
        'bg-emerald-500/20 border-emerald-500/50 text-emerald-800 dark:text-emerald-300',
      dotClass: 'bg-emerald-500',
      icon: CheckCircle2,
      buttonColor:
        'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 text-white shadow-emerald-900/40 ring-emerald-500/50',
    },
    nomatch: {
      badge: 'NO MATCH • TRY AGAIN',
      badgeClass:
        'bg-amber-500/20 border-amber-500/40 text-amber-800 dark:text-amber-300',
      dotClass: 'bg-amber-500',
      icon: MicOff,
      buttonColor:
        'bg-gradient-to-br from-amber-600 via-stone-700 to-slate-800 text-white shadow-amber-900/30 ring-amber-500/30',
    },
    error: {
      badge: 'MIC ERROR • CHECK PERMISSION',
      badgeClass:
        'bg-red-500/20 border-red-500/50 text-red-800 dark:text-red-300',
      dotClass: 'bg-red-500',
      icon: AlertCircle,
      buttonColor:
        'bg-gradient-to-br from-red-700 via-red-800 to-slate-900 text-white shadow-red-900/30 ring-red-500/40',
    },
  };

  const currentCfg = statusConfig[voiceStatus];
  const StatusIcon = currentCfg.icon;
  const t = (dict?.voice || {}) as Record<string, string>;

  return (
    <section
      aria-label="Voice Map Navigation Engine"
      className={`relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-white/95 dark:bg-slate-900/90 p-4 sm:p-5 backdrop-blur-xl shadow-xl dark:shadow-2xl shadow-cyan-950/20 dark:shadow-cyan-950/40 transition-all duration-300 ${className}`}
    >
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-black tracking-wide font-mono transition-all ${currentCfg.badgeClass}`}
          >
            <span className={`h-2 w-2 rounded-full ${currentCfg.dotClass}`} />
            <span>{currentCfg.badge}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsInfoModalOpen(true)}
            title={
              activeEngine === 'web-speech'
                ? 'Web Speech API (Chrome/Edge/Safari). Click to view compatibility info.'
                : 'In-Browser Speech Model (Local Fallback). Click to view compatibility info.'
            }
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold font-mono transition-all cursor-pointer shadow-sm hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              activeEngine === 'web-speech'
                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/20'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {activeEngine === 'web-speech' ? (
              <Globe className="h-3 w-3 text-cyan-500" />
            ) : (
              <Cpu className="h-3 w-3 text-emerald-500" />
            )}
            <span>
              {activeEngine === 'web-speech'
                ? t.engineNativeBadge || 'Web Speech API'
                : t.engineClientBadge || 'Local AI Model'}
            </span>
            <Info className="h-3 w-3 opacity-70 hover:opacity-100" />
          </button>

          {modelProgress.status === 'downloading' && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 animate-pulse font-mono">
              <RefreshCw className="h-2.5 w-2.5 animate-spin" />
              <span>{modelProgress.progress}%</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? 'Mute voice feedback sound' : 'Enable voice feedback sound'}
            aria-label={soundEnabled ? 'Mute voice sound' : 'Enable voice sound'}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 transition hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500"
          >
            {soundEnabled ? (
              <Volume2 className="h-3 w-3" />
            ) : (
              <VolumeX className="h-3 w-3 text-slate-400 dark:text-slate-500" />
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Map Provider Source"
            className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-950/80 p-0.5"
          >
            <span className="px-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Source:
            </span>
            <button
              type="button"
              onClick={() => onSourceChange('hens333')}
              aria-pressed={currentSource === 'hens333'}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-extrabold transition-all cursor-pointer font-mono ${
                currentSource === 'hens333'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Hens333 (12-Clock)
            </button>

            <button
              type="button"
              onClick={() => onSourceChange('samoelcolt')}
              aria-pressed={currentSource === 'samoelcolt'}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-extrabold transition-all cursor-pointer font-mono ${
                currentSource === 'samoelcolt'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              SamoelColt (Isometric)
            </button>

            <button
              type="button"
              onClick={() => onSourceChange('all')}
              aria-pressed={currentSource === 'all'}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-extrabold transition-all cursor-pointer font-mono ${
                currentSource === 'all'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {QUICK_COMMAND_PROMPTS.slice(0, 3).map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                onClick={() => handleExecuteCommand(prompt.query)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 hover:border-cyan-500/50 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300 transition active:scale-95 cursor-pointer shadow-xs"
              >
                &ldquo;{prompt.label}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 my-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="hidden sm:flex items-center gap-1 h-9 px-1" aria-hidden="true">
          {[12, 22, 16, 28, 18, 32, 24, 14].map((h, i) => {
            const dynamicHeight =
              voiceStatus === 'listening'
                ? Math.max(8, Math.min(36, Math.round(h * (0.6 + (audioLevel / 100) * 1.2))))
                : voiceStatus === 'matched'
                ? 24
                : 4;
            return (
              <span
                key={`left-wave-${i}`}
                style={{
                  height: `${dynamicHeight}px`,
                  animation:
                    voiceStatus === 'listening'
                      ? `pulse ${(0.4 + (i % 4) * 0.12).toFixed(2)}s ease-in-out infinite alternate`
                      : 'none',
                }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  voiceStatus === 'listening'
                    ? 'bg-gradient-to-t from-cyan-500 to-emerald-400'
                    : voiceStatus === 'matched'
                    ? 'bg-emerald-400'
                    : 'bg-slate-300 dark:bg-slate-700/60'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            {voiceStatus === 'listening' && (
              <>
                <span className="absolute h-16 w-16 animate-ping rounded-full bg-rose-500/20 pointer-events-none" />
                <span className="absolute h-20 w-20 animate-ping rounded-full bg-rose-500/10 [animation-delay:200ms] pointer-events-none" />
              </>
            )}

            <button
              id="voice-command-mic-btn"
              type="button"
              onMouseDown={() => {
                mouseDownListeningStateRef.current =
                  isListeningRef.current || voiceStatus === 'listening';
                isHoldingRef.current = true;
                holdStartTimeRef.current = Date.now();
                if (!isListeningRef.current) {
                  startListening(true);
                }
              }}
              onMouseUp={() => {
                const duration =
                  holdStartTimeRef.current > 0 ? Date.now() - holdStartTimeRef.current : 0;
                isHoldingRef.current = false;
                if (duration > 250 && isListeningRef.current) {
                  stopListeningAndProcess();
                }
              }}
              onMouseLeave={() => {
                if (isHoldingRef.current) {
                  const duration =
                    holdStartTimeRef.current > 0 ? Date.now() - holdStartTimeRef.current : 0;
                  isHoldingRef.current = false;
                  if (duration > 250 && isListeningRef.current) {
                    stopListeningAndProcess();
                  }
                }
              }}
              onClick={() => {
                const isClickFromMouse = holdStartTimeRef.current > 0;
                const duration = isClickFromMouse ? Date.now() - holdStartTimeRef.current : 0;
                holdStartTimeRef.current = 0;

                if (duration > 250) return;

                if (isListeningRef.current || voiceStatus === 'listening') {
                  if (!isClickFromMouse || mouseDownListeningStateRef.current) {
                    stopListeningAndProcess();
                  }
                } else {
                  startListening(false);
                }
              }}
              aria-label={currentCfg.badge}
              aria-pressed={voiceStatus === 'listening'}
              className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl shadow-xl transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/50 cursor-pointer active:scale-95 hover:scale-105 select-none ${currentCfg.buttonColor}`}
            >
              <StatusIcon
                className={`h-5 w-5 ${voiceStatus === 'listening' ? 'animate-bounce' : ''}`}
              />
            </button>
          </div>

          <div className="flex flex-col min-w-[200px] sm:min-w-[340px]" aria-live="polite">
            {voiceStatus === 'listening' && (
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono truncate">
                    {liveTranscript
                      ? `“${liveTranscript}”`
                      : audioLevel > 8
                      ? (locale === 'pl' ? 'Słucham głosu... Puść [V] lub kliknij' : 'Listening to voice... Release [V] or click')
                      : (locale === 'pl' ? 'Mów teraz (np. Dead Dawg, RPD)' : 'Speak DBD map name (e.g. Dead Dawg)')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono truncate">
                  {activeEngine === 'client-model'
                    ? (locale === 'pl' ? 'Lokalny model AI • Puść [V] lub kliknij aby rozpoznać' : 'Local AI Model • Release [V] or click to transcribe')
                    : (locale === 'pl' ? 'Rozpoznawanie mowy w toku...' : 'Speech recognition active...')}
                </span>
              </div>
            )}

            {voiceStatus === 'processing' && (
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-500 animate-spin shrink-0" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">
                    {liveTranscript && liveTranscript !== 'Analyzing speech audio...'
                      ? `Transcribing: “${liveTranscript}”`
                      : (locale === 'pl' ? 'Przetwarzanie głosu przez model AI...' : 'Transcribing voice with local Whisper AI...')}
                  </span>
                </div>
                <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-mono">
                  {locale === 'pl' ? 'Lokalne przetwarzanie ONNX WebAssembly' : 'In-browser ONNX WebAssembly inference'}
                </span>
              </div>
            )}

            {voiceStatus === 'matched' && matchedResult && (
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 font-mono truncate">
                    {matchedResult.matchedMapName
                      ? `Matched: ${matchedResult.matchedMapName}`
                      : matchedResult.action === 'switch_source'
                      ? `Switched: ${matchedResult.actionPayload}`
                      : `Action: ${matchedResult.action}`}
                  </span>
                </div>
                {liveTranscript && (
                  <span className="text-[10px] text-emerald-600/90 dark:text-emerald-400/90 font-mono truncate">
                    Heard: &ldquo;{liveTranscript}&rdquo; {matchedResult.confidence ? `(${Math.round(matchedResult.confidence * 100)}% match)` : ''}
                  </span>
                )}
              </div>
            )}

            {voiceStatus === 'nomatch' && (
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {liveTranscript
                      ? `Heard: “${liveTranscript}” (No DBD match)`
                      : (locale === 'pl' ? 'Brak dźwięku lub nierozpoznano' : 'No speech detected / Not recognized')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono truncate">
                  {locale === 'pl'
                    ? 'Spróbuj: „Dead Dawg”, „RPD East” lub „Badham 2”'
                    : 'Try saying: “Dead Dawg”, “RPD East”, or “Coal Tower”'}
                </span>
              </div>
            )}

            {voiceStatus === 'error' && (
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 font-mono">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{errorMessage || t.micBlocked || 'Microphone error'}</span>
                </div>
                <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-mono">
                  {locale === 'pl' ? 'Sprawdź uprawnienia mikrofonu w przeglądarce' : 'Check microphone permissions in browser address bar'}
                </span>
              </div>
            )}

            {voiceStatus === 'idle' && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <kbd className="rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 text-[9px] font-mono text-cyan-600 dark:text-cyan-300 shadow-xs">
                  V
                </kbd>
                <span className="truncate">
                  {locale === 'pl' ? 'Przytrzymaj [V] aby mówić (lub kliknij mikrofon)' : 'Hold [V] to talk (or click mic)'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 h-9 px-1" aria-hidden="true">
          {[14, 24, 32, 18, 28, 16, 22, 12].map((h, i) => {
            const dynamicHeight =
              voiceStatus === 'listening'
                ? Math.max(8, Math.min(36, Math.round(h * (0.6 + (audioLevel / 100) * 1.2))))
                : voiceStatus === 'matched'
                ? 24
                : 4;
            return (
              <span
                key={`right-wave-${i}`}
                style={{
                  height: `${dynamicHeight}px`,
                  animation:
                    voiceStatus === 'listening'
                      ? `pulse ${(0.4 + ((i + 2) % 4) * 0.12).toFixed(2)}s ease-in-out infinite alternate`
                      : 'none',
                }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  voiceStatus === 'listening'
                    ? 'bg-gradient-to-t from-cyan-500 to-emerald-400'
                    : voiceStatus === 'matched'
                    ? 'bg-emerald-400'
                    : 'bg-slate-300 dark:bg-slate-700/60'
                }`}
              />
            );
          })}
        </div>
      </div>

      {disambiguationVariants.length > 0 && (
        <div className="relative z-10 mt-2.5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 dark:bg-cyan-950/30 p-2.5 backdrop-blur-sm flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-cyan-800 dark:text-cyan-300 font-mono">
            <span>Variants:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {disambiguationVariants.map((variant) => (
              <button
                key={variant}
                type="button"
                onClick={() => handleExecuteCommand(variant)}
                className="flex items-center gap-1 rounded-xl border border-cyan-400/40 bg-white/80 dark:bg-cyan-900/40 px-2.5 py-0.5 text-xs font-bold text-cyan-900 dark:text-cyan-200 transition hover:border-cyan-500 hover:bg-cyan-100 dark:hover:bg-cyan-800/60 active:scale-95 cursor-pointer shadow-xs font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
              >
                <span>{variant}</span>
                <ArrowRight className="h-3 w-3 text-cyan-500 dark:text-cyan-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      <VoiceEngineInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        currentEngine={activeEngine}
        onSelectEngine={(eng) => {
          setActiveEngine(eng);
          if (eng === 'client-model') {
            initClientSpeechModel(locale);
          }
        }}
        browserName={browserInfo.browserName}
        hasNativeWebSpeech={browserInfo.hasNativeWebSpeech}
        modelProgress={modelProgress}
        onPreloadModel={() => initClientSpeechModel(locale)}
        dict={dict}
      />
    </section>
  );
}

export default VoiceCommandBanner;
```

### frontend/src/components/maps/VoiceNavButton.tsx

```typescript
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceCommandBanner } from './VoiceCommandBanner';

export interface VoiceNavButtonProps {
  locale?: string;
  currentSource?: 'all' | 'hens333' | 'samoelcolt';
  onSourceChange?: (source: 'all' | 'hens333' | 'samoelcolt') => void;
  onSelectMap?: (mapName: string, mapId?: string, source?: string) => void;
  onAction?: (action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => void;
  availableMaps?: Array<{ id: string; name: string; realm?: string; source?: string }>;
  className?: string;
  variant?: 'banner' | 'compact';
}

export function VoiceNavButton({
  locale = 'en',
  currentSource: propSource,
  onSourceChange: propOnSourceChange,
  onSelectMap: propOnSelectMap,
  onAction: propOnAction,
  availableMaps,
  className = '',
}: VoiceNavButtonProps) {
  const router = useRouter();
  const [internalSource, setInternalSource] = useState<'all' | 'hens333' | 'samoelcolt'>(
    propSource || 'hens333'
  );

  const currentSource = propSource || internalSource;
  const handleSourceChange = propOnSourceChange || setInternalSource;

  const handleSelectMap =
    propOnSelectMap ||
    ((mapName: string, mapId?: string, source?: string) => {
      const queryParams = new URLSearchParams();
      if (mapName) queryParams.set('mapName', mapName);
      if (mapId) queryParams.set('mapId', mapId);
      if (source && source !== 'all') queryParams.set('source', source);

      router.push(`/${locale}/maps?${queryParams.toString()}`);
    });

  const handleAction =
    propOnAction ||
    ((action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => {
      if (action === 'close') {
        router.push(`/${locale}`);
      }
    });

  return (
    <VoiceCommandBanner
      locale={locale}
      currentSource={currentSource}
      onSourceChange={handleSourceChange}
      onSelectMap={handleSelectMap}
      onAction={handleAction}
      availableMaps={availableMaps}
      className={className}
    />
  );
}

export { VoiceCommandBanner };
export default VoiceNavButton;
```

### frontend/src/app/[locale]/maps/page.tsx

```typescript
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { MapExplorer } from '@/components/maps/MapExplorer';
import { VoiceCommandBanner } from '@/components/maps/VoiceCommandBanner';
import { QuestsModal } from '@/components/QuestsModal';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';
import { MapRealm } from '@/types/map';
import { Perk, PerkDictionary } from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';

function MapsPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();

  const [dict, setDict] = useState<PerkDictionary | null>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);
  const initialMapName = searchParams?.get('mapName') || '';

  const [currentSource, setCurrentSource] = useState<'all' | 'hens333' | 'samoelcolt'>('hens333');
  const [availableMaps, setAvailableMaps] = useState<MapRealm[]>([]);
  const [selectedMap, setSelectedMap] = useState<{
    mapName: string;
    timestamp: number;
  }>({
    mapName: initialMapName,
    timestamp: Date.now(),
  });
  const [triggerAction, setTriggerAction] = useState<{
    action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close';
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    if (initialMapName) {
      setSelectedMap({ mapName: initialMapName, timestamp: Date.now() });
    }
  }, [initialMapName]);

  const [totalPerksCount, setTotalPerksCount] = useState<number>(0);
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const backendBase = getBackendBaseUrl();

  useEffect(() => {
    document.title = 'LemonDBD - Tactical Map Command Explorer';
    getDictionary(locale)
      .then((d) => setDict(d as PerkDictionary))
      .catch((err: unknown) => console.error('Failed to load maps dictionary:', err));
  }, [locale]);

  useEffect(() => {
    async function loadVaultStats() {
      try {
        const [perksRes, charsRes] = await Promise.all([
          fetch(`${backendBase}/api/v1/perks?limit=1000`),
          fetch(`${backendBase}/api/v1/characters`),
        ]);
        if (perksRes.ok) {
          const pData = await perksRes.json();
          const list: Perk[] = pData.data || [];
          setTotalPerksCount(pData.pagination?.total || list.length);
          setSurvivorCount(list.filter((p) => p.category === 'Survivor').length);
          setKillerCount(list.filter((p) => p.category === 'Killer').length);
        }
        if (charsRes.ok) {
          const cData = await charsRes.json();
          setCharacterCount(cData.count || (cData.data || []).length);
        }
      } catch (err: unknown) {
        console.error('Failed to load sidebar vault stats:', err);
      }
    }
    loadVaultStats();
  }, [backendBase]);

  const handleSelectCategory = () => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono text-xs">
        Initializing Tactical Map Command...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="maps"
        onSelectCategory={handleSelectCategory}
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={totalPerksCount}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main
        className={`flex-1 w-full min-h-screen transition-all duration-300 p-4 sm:p-6 lg:p-7 flex flex-col gap-4 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <VoiceCommandBanner
          locale={locale}
          dict={dict}
          currentSource={currentSource}
          onSourceChange={(src) => {
            setCurrentSource(src);
          }}
          onSelectMap={(name, id, src) => {
            if (src) setCurrentSource(src as 'all' | 'hens333' | 'samoelcolt');
            setSelectedMap({ mapName: name, timestamp: Date.now() });
          }}
          onAction={(act) => {
            setTriggerAction({ action: act, timestamp: Date.now() });
          }}
          availableMaps={availableMaps}
        />

        <MapExplorer
          initialMapName={selectedMap.mapName}
          selectedMap={selectedMap}
          selectedSource={currentSource}
          onSourceChange={(src) => {
            setCurrentSource(src);
          }}
          onAvailableMapsLoaded={(maps) => {
            setAvailableMaps(maps);
          }}
          onActionTriggered={(act) => setTriggerAction({ action: act, timestamp: Date.now() })}
          triggerAction={triggerAction}
        />

        <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
      </main>
    </div>
  );
}

export default function MapsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono text-xs">
          Loading Tactical Maps...
        </div>
      }
    >
      <MapsPageInner />
    </Suspense>
  );
}
```