'use client';

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ImageOff,
  Compass,
  Layers,
  Grid,
  Flame,
  Home,
  Maximize2,
  SlidersHorizontal,
} from 'lucide-react';
import type { MapRealm } from '@/types/map';
import type { Dictionary } from '@/locales/types';
import { getMapImageSrc } from '@/utils/mapUtils';

interface FullscreenMapEngineProps {
  mapId: number;
  onClose: () => void;
  availableMaps?: MapRealm[];
  backendBase: string;
  dict?: Dictionary;
}

export const FullscreenMapEngine: React.FC<FullscreenMapEngineProps> = ({
  mapId,
  onClose,
  availableMaps = [],
  backendBase,
  dict,
}) => {
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    setImageFailed(false);
  }, [mapId]);

  const activeMap = useMemo(
    () => availableMaps.find((m) => m.id === mapId) || null,
    [availableMaps, mapId]
  );
  const imageSrc = getMapImageSrc(activeMap, backendBase);

  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState<number>(1.0);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.5), 5.0));
  };

  const isImageTarget = (target: EventTarget) => (target as HTMLElement).tagName === 'IMG';

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    draggedRef.current = false;
    if (isImageTarget(e.target)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (pointerDownPosRef.current && !draggedRef.current) {
      const dx = e.clientX - pointerDownPosRef.current.x;
      const dy = e.clientY - pointerDownPosRef.current.y;
      if (Math.hypot(dx, dy) > 5) draggedRef.current = true;
    }
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (!draggedRef.current && !isImageTarget(e.target)) onClose();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      pointerDownPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      draggedRef.current = false;
      if (isImageTarget(e.target)) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - pan.x,
          y: e.touches[0].clientY - pan.y,
        });
      }
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
    if (pointerDownPosRef.current && !draggedRef.current && e.touches.length === 1) {
      const dx = e.touches[0].clientX - pointerDownPosRef.current.x;
      const dy = e.touches[0].clientY - pointerDownPosRef.current.y;
      if (Math.hypot(dx, dy) > 5) draggedRef.current = true;
    }
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
      setZoom(Math.min(Math.max(initialZoom * factor, 0.5), 5.0));
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

  const getPalletBadge = (density?: string) => {
    switch (density) {
      case 'Very High':
      case 'High':
        return 'text-accent-green bg-accent-green/10 border-accent-green/40';
      case 'Low':
        return 'text-accent-red bg-accent-red/10 border-accent-red/40';
      case 'Medium':
      default:
        return 'text-accent-amber bg-accent-amber/10 border-accent-amber/40';
    }
  };

  const getLayoutBadge = (layout?: string) => {
    switch (layout) {
      case 'Indoor':
        return 'text-accent-red bg-accent-red/10 border-accent-red/40';
      case 'Hybrid':
        return 'text-accent-amber bg-accent-amber/10 border-accent-amber/40';
      case 'Outdoor':
      default:
        return 'text-accent-green bg-accent-green/10 border-accent-green/40';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dict?.maps?.fullscreenEngineAria || 'Tactical Map Command Viewer'}
      className="fixed inset-0 z-50 bg-bg-primary flex flex-col justify-between overflow-hidden select-none text-text-primary"
    >
      {/* Top Tactical Command Ribbon */}
      <header className="absolute top-0 inset-x-0 z-40 px-3 sm:px-6 py-2 sm:py-2.5 bg-bg-primary/90 backdrop-blur-2xl border-b border-border-color/80 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          {activeMap && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-none mb-1">
                <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest uppercase text-text-secondary">
                  {activeMap.realm}
                </span>
                <span className="text-text-muted text-[10px]">•</span>
                <span className="text-[10px] font-mono text-text-muted hidden xs:inline">{dict?.maps?.twelveClockCallouts || '12-Clock Callouts'}</span>
              </div>
              <h1 className="text-sm sm:text-base md:text-lg font-black text-text-primary tracking-wide truncate leading-tight">
                {activeMap.name}
              </h1>
            </div>
          )}

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsDrawerOpen((prev) => !prev)}
              aria-pressed={isDrawerOpen}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${isDrawerOpen
                  ? 'bg-accent-red/15 border-accent-red/50 text-accent-red'
                  : 'bg-bg-elevated border-border-color text-text-muted hover:text-text-primary hover:border-border-subtle'
                }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent-red" />
              <span className="hidden sm:inline">{dict?.maps?.tacticalDossier || 'Tactical Dossier'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={dict?.modal?.close || 'Close'}
              className="rounded-xl p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated border border-transparent hover:border-border-subtle transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tactical Telemetry Strip -- always visible (horizontally scrollable
         * on narrow viewports) rather than hidden below the `lg` breakpoint,
         * so the map's size and other stats are actually reachable on every
         * screen size, not just wide desktops. */}
        {activeMap && (
          <div
            className="flex items-center gap-2 mt-2 pt-2 border-t border-border-color/60 overflow-x-auto text-xs [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* Size / sqT Badge */}
            {activeMap.size_sq_tiles != null ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-bg-elevated border border-accent-red/40 text-text-secondary font-mono shadow-sm shrink-0">
                <Maximize2 className="w-3.5 h-3.5 text-accent-red shrink-0" />
                <span className="font-bold text-text-primary text-xs">{activeMap.size_sq_tiles}</span>
                <span className="text-accent-red font-bold">{dict?.maps?.sqTilesUnit || 'sqT'}</span>
                {activeMap.size_sq_meters != null && (
                  <span className="text-text-muted text-[10px] pl-0.5">
                    {(dict?.maps?.sqMetersSuffix || '({value} m²)').replace(
                      '{value}',
                      activeMap.size_sq_meters.toLocaleString()
                    )}
                  </span>
                )}
              </div>
            ) : null}

            {/* Layout Type */}
            {activeMap.layout_type && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-semibold text-xs shrink-0 ${getLayoutBadge(
                  activeMap.layout_type
                )}`}
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                {activeMap.layout_type}
              </span>
            )}

            {/* Pallet Density */}
            {activeMap.pallet_density && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-semibold text-xs shrink-0 ${getPalletBadge(
                  activeMap.pallet_density
                )}`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                {(dict?.maps?.palletsSuffix || '{density} Pallets').replace('{density}', activeMap.pallet_density)}
              </span>
            )}

            {/* Maze Tiles */}
            {activeMap.jungle_gyms_count != null && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-bg-elevated border border-border-color text-text-secondary font-mono text-xs shrink-0">
                <Grid className="w-3.5 h-3.5 text-text-muted shrink-0" />
                {(dict?.maps?.gymsSuffix || '{count} Gyms').replace('{count}', String(activeMap.jungle_gyms_count))}
              </span>
            )}

            {/* Totems */}
            {activeMap.totem_spawns_count != null && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-bg-elevated border border-border-color text-text-secondary font-mono text-xs shrink-0">
                <Flame className="w-3.5 h-3.5 text-text-muted shrink-0" />
                {(dict?.maps?.totemsSuffix || '{count} Totems').replace('{count}', String(activeMap.totem_spawns_count))}
              </span>
            )}

            {/* Killer Shack */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold shrink-0 ${activeMap.shack_has_basement
                  ? 'text-accent-green bg-accent-green/10 border-accent-green/40'
                  : 'text-text-muted bg-bg-elevated border-border-color'
                }`}
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              {activeMap.shack_has_basement
                ? (dict?.maps?.shackBasementYes || 'Shack Basement')
                : (dict?.maps?.shackBasementNo || 'No Shack')}
            </span>
          </div>
        )}
      </header>

      {/* Main Map Viewport Canvas */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleBackgroundClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ touchAction: 'none' }}
        className="relative flex-1 w-full h-full cursor-default overflow-hidden flex items-center justify-center bg-bg-primary pt-24 sm:pt-20 pb-16 px-4"
      >
        {imageSrc && !imageFailed ? (
          <img
            src={imageSrc}
            alt={activeMap?.name || ''}
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 75ms ease-out',
            }}
            className={`max-w-full max-h-full object-contain select-none shadow-2xl ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-text-muted">
            <ImageOff className="w-12 h-12" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {dict?.maps?.noMapsFound || 'No Tactical Callout Image Available'}
            </span>
          </div>
        )}
      </div>

      {/* Tactical Dossier: a bottom sheet on phones (full width, capped height,
       * safely clear of the zoom toolbar) so it never overflows a narrow
       * viewport, and the original right-anchored floating panel from `sm`
       * up, unchanged. */}
      {isDrawerOpen && activeMap && (
        <aside
          role="complementary"
          aria-label={dict?.maps?.specsAndIntelAria || 'Map Specifications and Intel'}
          className="absolute inset-x-3 bottom-20 top-auto max-h-[60dvh] sm:inset-x-auto sm:top-24 sm:right-4 sm:bottom-20 sm:max-h-none z-40 sm:w-80 lg:w-96 rounded-2xl bg-bg-surface border border-border-color backdrop-blur-2xl shadow-2xl flex flex-col p-4 text-xs transition-all overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-border-color">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent-red animate-pulse" />
              <span className="font-mono text-xs font-bold tracking-wider uppercase text-accent-red">
                {dict?.maps?.tacticalDossier || 'Tactical Dossier'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-bg-elevated transition-colors cursor-pointer"
              aria-label={dict?.maps?.closeDossierAria || 'Close Dossier'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Prominent Surface Area Card */}
          {activeMap.size_sq_tiles != null && (
            <div className="mb-3 p-3 rounded-xl bg-bg-elevated border border-accent-red/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent-red/10 border border-accent-red/30 text-accent-red">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted block">
                    {dict?.maps?.surfaceArea || 'Surface Area'}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-mono font-black text-text-primary">
                      {activeMap.size_sq_tiles} {dict?.maps?.sqTilesUnit || 'sqT'}
                    </span>
                    {activeMap.size_sq_meters != null && (
                      <span className="text-xs font-mono text-text-secondary font-medium">
                        {(dict?.maps?.sqMetersSuffix || '({value} m²)').replace(
                          '{value}',
                          activeMap.size_sq_meters.toLocaleString()
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metric Specifications Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
            <div className="p-2.5 rounded-xl bg-bg-elevated border border-border-color">
              <span className="text-[10px] text-text-muted uppercase font-mono block mb-0.5">
                {dict?.maps?.layoutLabel || 'Layout'}
              </span>
              <strong className="font-semibold text-text-secondary">
                {activeMap.layout_type || 'Outdoor'}
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-bg-elevated border border-border-color">
              <span className="text-[10px] text-text-muted uppercase font-mono block mb-0.5">
                {dict?.maps?.palletDensityLabel || 'Pallet Density'}
              </span>
              <strong className="font-semibold text-text-secondary">
                {activeMap.pallet_density || 'Medium'}
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-bg-elevated border border-border-color">
              <span className="text-[10px] text-text-muted uppercase font-mono block mb-0.5">
                {dict?.maps?.mazeTilesLabel || 'Maze Tiles'}
              </span>
              <strong className="font-semibold text-text-secondary">
                {activeMap.jungle_gyms_count != null
                  ? activeMap.jungle_gyms_count === 0
                    ? (dict?.maps?.corridorsLabel || '0 (Corridors)')
                    : (dict?.maps?.gymsSuffix || '{count} Gyms').replace(
                        '{count}',
                        String(activeMap.jungle_gyms_count)
                      )
                  : '—'}
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-bg-elevated border border-border-color">
              <span className="text-[10px] text-text-muted uppercase font-mono block mb-0.5">
                {dict?.maps?.dullTotemsLabel || 'Dull Totems'}
              </span>
              <strong className="font-semibold text-text-secondary">
                {(dict?.maps?.spawnsSuffix || '{count} Spawns').replace(
                  '{count}',
                  String(activeMap.totem_spawns_count ?? 5)
                )}
              </strong>
            </div>

            <div className="col-span-2 p-2.5 rounded-xl bg-bg-elevated border border-border-color flex items-center justify-between">
              <span className="text-[10px] text-text-muted uppercase font-mono">
                {dict?.maps?.killerShackLabel || 'Killer Shack'}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${activeMap.shack_has_basement
                    ? 'text-accent-green bg-accent-green/10 border-accent-green/40'
                    : 'text-text-muted bg-bg-primary border-border-color'
                  }`}
              >
                {activeMap.shack_has_basement
                  ? (dict?.maps?.basementPossible || 'Basement Possible')
                  : (dict?.maps?.noShackBasement || 'No Shack Basement')}
              </span>
            </div>
          </div>

          {activeMap.description && (
            <p className="mt-auto pt-2.5 border-t border-border-color text-[11px] text-text-muted leading-relaxed">
              {activeMap.description}
            </p>
          )}
        </aside>
      )}

      {/* Floating Bottom Navigation Bar */}
      <footer className="absolute bottom-4 inset-x-4 sm:inset-x-6 z-40 flex items-center justify-between pointer-events-none">
        {/* Subtle Callout Instruction Note at Bottom Center-Left */}
        <div className="pointer-events-auto hidden md:block">
          {activeMap?.description && (
            <span className="text-[11px] font-mono text-text-muted bg-bg-surface border border-border-color px-3 py-1.5 rounded-xl backdrop-blur-md">
              {activeMap.description}
            </span>
          )}
        </div>

        {/* Viewport Zoom & Pan Controls */}
        <div
          role="toolbar"
          aria-label={dict?.maps?.engineControlsAria || 'Viewport Zoom Toolbar'}
          className="pointer-events-auto ml-auto flex items-center gap-2 bg-bg-elevated/90 border border-border-color p-2 rounded-2xl backdrop-blur-xl shadow-2xl"
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-red"
            title={dict?.maps?.zoomOut || 'Zoom Out'}
            aria-label={dict?.maps?.zoomOutAria || 'Zoom Out'}
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold text-text-primary px-2 min-w-[50px] text-center">
            {Math.round(zoom * 100)}{dict?.maps?.percentSign || '%'}
          </span>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.2, 5.0))}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-red"
            title={dict?.maps?.zoomIn || 'Zoom In'}
            aria-label={dict?.maps?.zoomInAria || 'Zoom In'}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border-color my-auto" />

          <button
            type="button"
            onClick={handleResetView}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-red"
            title={dict?.maps?.resetPanZoom || 'Reset Pan and Zoom'}
            aria-label={dict?.maps?.resetPanAndZoomAria || 'Reset Pan and Zoom'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};