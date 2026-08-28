'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/maps/MapControls.tsx

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
  dict?: Dictionary;
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
  dict,
}) => {
  const isVertical = layoutMode === 'vertical';
  const isCompact = layoutMode === 'compact';

  return (
    <div
      role="toolbar"
      aria-label={dict?.maps?.mapControlsAria || 'Map view zoom and navigation controls'}
      className={`flex items-center gap-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-2 backdrop-blur-md shadow-lg dark:shadow-2xl z-30 select-none ${
        isVertical ? 'flex-col' : 'flex-wrap'
      } ${className}`}
      data-testid="map-controls-hud"
    >
      <button
        type="button"
        onClick={onZoomIn}
        aria-label={dict?.maps?.zoomInAria || 'Zoom In'}
        title={dict?.maps?.zoomIn ? `${dict?.maps?.zoomIn} (+25%)` : 'Zoom In (+25%)'}
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
        {Math.round(zoomLevel * 100)}{dict?.maps?.percentSign || '%'}
      </span>

      <button
        type="button"
        onClick={onZoomOut}
        aria-label={dict?.maps?.zoomOutAria || 'Zoom Out'}
        title={dict?.maps?.zoomOut ? `${dict?.maps?.zoomOut} (-25%)` : 'Zoom Out (-25%)'}
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
            title={dict?.maps?.fitToScreen || 'Fit to Screen'}
            aria-pressed={false}
            className="px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
            data-testid="map-controls-preset-fit"
          >
            {dict?.maps?.fit || 'Fit'}
          </button>
          <button
            type="button"
            onClick={() => onSetZoom(1.0)}
            title={dict?.maps?.set100Zoom || 'Set 100% Zoom'}
            aria-pressed={Math.abs(zoomLevel - 1.0) < 0.01}
            className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 ${
              Math.abs(zoomLevel - 1.0) < 0.01
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800'
            }`}
            data-testid="map-controls-preset-100"
          >
            {dict?.maps?.zoomPreset100 || '100%'}
          </button>
          <button
            type="button"
            onClick={() => onSetZoom(1.5)}
            title={dict?.maps?.set150Zoom || 'Set 150% Zoom'}
            aria-pressed={Math.abs(zoomLevel - 1.5) < 0.01}
            className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 ${
              Math.abs(zoomLevel - 1.5) < 0.01
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800'
            }`}
            data-testid="map-controls-preset-150"
          >
            {dict?.maps?.zoomPreset150 || '150%'}
          </button>
          <button
            type="button"
            onClick={() => onSetZoom(2.0)}
            title={dict?.maps?.set200Zoom || 'Set 200% Zoom'}
            aria-pressed={Math.abs(zoomLevel - 2.0) < 0.01}
            className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 ${
              Math.abs(zoomLevel - 2.0) < 0.01
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800'
            }`}
            data-testid="map-controls-preset-200"
          >
            {dict?.maps?.zoomPreset200 || '200%'}
          </button>
        </div>
      )}

      <div className={isVertical ? 'w-5 h-px bg-slate-200 dark:bg-slate-800 my-1' : 'w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1'} />

      <button
        type="button"
        onClick={onReset}
        aria-label={dict?.maps?.resetView || 'Reset View'}
        title={dict?.maps?.resetZoomPan || 'Reset Zoom & Pan'}
        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        data-testid="map-controls-reset"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {onFullscreen && (
        <button
          type="button"
          onClick={onFullscreen}
          aria-label={dict?.maps?.fullscreenAria || 'Fullscreen Interactive Mode'}
          title={dict?.maps?.fullscreenMode || 'Fullscreen Interactive Mode'}
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
          aria-label={dict?.maps?.popoutInWindow || 'Popout Map in Window'}
          title={dict?.maps?.popoutInWindow || 'Popout Map in Window'}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          data-testid="map-controls-popout"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
