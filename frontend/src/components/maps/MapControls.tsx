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
      className={`flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-2 backdrop-blur-md shadow-2xl z-30 select-none ${
        isVertical ? 'flex-col' : 'flex-wrap'
      } ${className}`}
      data-testid="map-controls-hud"
    >
      {/* Zoom In Button (44px touch target) */}
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Zoom In"
        title="Zoom In (+25%)"
        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-200 hover:text-amber-400 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
        data-testid="map-controls-zoom-in"
      >
        <ZoomIn className="h-4 w-4" />
      </button>

      {/* Current Zoom Percentage */}
      <span
        className="text-xs font-mono font-bold text-amber-400 px-2 min-w-[48px] text-center"
        data-testid="map-controls-zoom-level"
      >
        {Math.round(zoomLevel * 100)}%
      </span>

      {/* Zoom Out Button (44px touch target) */}
      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Zoom Out"
        title="Zoom Out (-25%)"
        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-200 hover:text-amber-400 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
        data-testid="map-controls-zoom-out"
      >
        <ZoomOut className="h-4 w-4" />
      </button>

      {/* Divider */}
      {(!isCompact || showPresets) && (
        <div
          className={
            isVertical ? 'w-5 h-px bg-slate-800 my-1' : 'w-px h-5 bg-slate-800 mx-1 hidden sm:block'
          }
        />
      )}

      {/* Preset Buttons (Fit, 100%, 150%, 200%) */}
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
            className="px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-all cursor-pointer"
            data-testid="map-controls-preset-fit"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={() => onSetZoom(1.0)}
            title="Set 100% Zoom"
            className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              Math.abs(zoomLevel - 1.0) < 0.01
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800'
            }`}
            data-testid="map-controls-preset-100"
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => onSetZoom(1.5)}
            title="Set 150% Zoom"
            className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              Math.abs(zoomLevel - 1.5) < 0.01
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800'
            }`}
            data-testid="map-controls-preset-150"
          >
            150%
          </button>
          <button
            type="button"
            onClick={() => onSetZoom(2.0)}
            title="Set 200% Zoom"
            className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              Math.abs(zoomLevel - 2.0) < 0.01
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800'
            }`}
            data-testid="map-controls-preset-200"
          >
            200%
          </button>
        </div>
      )}

      {/* Divider */}
      <div className={isVertical ? 'w-5 h-px bg-slate-800 my-1' : 'w-px h-5 bg-slate-800 mx-1'} />

      {/* Reset Zoom & Pan Button (44px touch target) */}
      <button
        type="button"
        onClick={onReset}
        aria-label="Reset View"
        title="Reset Zoom & Pan"
        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-200 hover:text-amber-400 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
        data-testid="map-controls-reset"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {/* Fullscreen Button (if provided) */}
      {onFullscreen && (
        <button
          type="button"
          onClick={onFullscreen}
          aria-label="Fullscreen"
          title="Fullscreen Interactive Mode"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-200 hover:text-amber-400 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          data-testid="map-controls-fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}

      {/* Popout Button (if provided) */}
      {onPopout && (
        <button
          type="button"
          onClick={onPopout}
          aria-label="Popout"
          title="Popout Map in Window"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-200 hover:text-amber-400 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          data-testid="map-controls-popout"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
