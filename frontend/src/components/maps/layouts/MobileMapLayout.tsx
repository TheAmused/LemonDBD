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
import type { MapRealm } from '@/types/map';
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

  // Close bottom sheet on Escape key press
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
      className="flex flex-col w-full h-[calc(100vh-14rem)] rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-sm dark:shadow-xl overflow-hidden relative"
      data-testid="mobile-map-layout"
    >
      {/* ─── Top Compact Header ────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shrink-0 z-10"
        data-testid="mobile-map-header"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-600 dark:text-amber-400 whitespace-nowrap">
            {activeMap?.realm || 'Select a Map'}
          </span>
          <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
            {activeMap ? activeMap.name : 'Select a Map'}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Provider Source Segmented Pill */}
          <div
            className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-0.5"
            data-testid="mobile-map-source-toggle"
          >
            <button
              type="button"
              onClick={() => onSourceChange('hens333')}
              aria-pressed={activeSource === 'hens333'}
              title="Hens333 (12-Clock)"
              className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center ${
                activeSource === 'hens333'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
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
              className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center ${
                activeSource === 'samoelcolt'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
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
              className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center ${
                activeSource === 'all'
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              data-testid="mobile-map-source-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Fullscreen Button */}
          {onLaunchFullscreen && (
            <button
              type="button"
              onClick={onLaunchFullscreen}
              aria-label="Launch Fullscreen"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer min-h-[32px] min-w-[32px]"
              data-testid="mobile-map-fullscreen-btn"
              title="Launch Fullscreen Engine"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 1-Click Variant Switcher Bar */}
      <VariantSwitcherBar
        variants={variants}
        activeMapName={activeMap?.name || ''}
        onSelectVariant={onSelectVariant}
        className="m-2 mb-0 shrink-0"
      />

      {/* ─── Center Viewport: High-Res MapCanvas & Floating MapControls ─────── */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <MapCanvas
          imageUrl={getMapImageSrc(activeMap)}
          mapName={activeMap?.name}
          realmName={activeMap?.realm}
          transformStyle={transformStyle}
          isDragging={isDragging}
          className="h-full w-full rounded-none border-0 max-h-none"
          {...canvasHandlers}
        />

        {/* Floating MapControls in bottom-right corner */}
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

      {/* ─── Bottom Sheet Collapsed Dock Bar ─────────────────────────────────── */}
      {!isBottomSheetOpen && (
        <div
          className="absolute bottom-0 inset-x-0 z-30 flex items-center justify-between p-3 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-xl shadow-2xl rounded-t-2xl"
          data-testid="mobile-bottom-sheet"
        >
          <button
            type="button"
            onClick={() => setIsBottomSheetOpen(true)}
            className="flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-extrabold transition-all cursor-pointer min-h-[44px] shadow-sm"
            data-testid="mobile-bottom-sheet-toggle"
          >
            <div className="flex items-center gap-2 truncate">
              <Compass className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
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

      {/* ─── Expanded Bottom Sheet Drawer ───────────────────────────────────── */}
      {isBottomSheetOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsBottomSheetOpen(false)}
            className="absolute inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm z-40 cursor-pointer"
            data-testid="mobile-bottom-sheet-backdrop"
          />

          {/* Drawer container */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Map Directory and Legends"
            className="absolute bottom-0 inset-x-0 z-50 h-[80vh] max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700/80 rounded-t-3xl shadow-2xl backdrop-blur-2xl"
            data-testid="mobile-bottom-sheet-content"
          >
            {/* Drag Handle */}
            <div
              onClick={() => setIsBottomSheetOpen(false)}
              className="w-full py-2.5 flex justify-center cursor-pointer select-none shrink-0"
              data-testid="mobile-bottom-sheet-handle"
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors" />
            </div>

            {/* Sheet Header: Search Input & Close Button */}
            <div className="px-4 pb-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search map or realm..."
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none min-h-[38px] shadow-inner"
                  data-testid="mobile-map-search-input"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsBottomSheetOpen(false)}
                aria-label="Close Bottom Sheet"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer shadow-sm"
                data-testid="mobile-bottom-sheet-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Realm Selection Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto p-3 border-b border-slate-200 dark:border-slate-800 scrollbar-thin shrink-0">
              <button
                type="button"
                onClick={() => onSelectRealm('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer border min-h-[32px] ${
                  selectedRealm === 'all'
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
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
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-700'
                    }`}
                    data-testid={`mobile-map-realm-pill-${slug}`}
                  >
                    {r} ({count})
                  </button>
                );
              })}
            </div>

            {/* Scrollable Sheet Body: Map Directory List & Map Legend Drawer */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
              {/* Map Directory Showcase */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
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

              {/* Map Legend Drawer */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Sector Callouts & Clock System
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
