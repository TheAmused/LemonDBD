'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/maps/layouts/DesktopMapLayout.tsx

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
  dict?: Dictionary;
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
  dict,
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
                {dict?.maps?.mapDirectory || 'Map Directory'}
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
                  placeholder={dict?.maps?.searchPlaceholder || 'Search map or realm...'}
                  aria-label={dict?.maps?.searchAria || 'Search map or realm'}
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 pl-9 pr-8 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none min-h-[36px] shadow-inner"
                  data-testid="desktop-map-search-input"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label={dict?.maps?.clearSearchAria || 'Clear search input'}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div
                role="group"
                aria-label={dict?.maps?.providerAria || 'Map Provider Source'}
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
                  <span>{'Hens333'}</span>
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
                  <span>{'SamoelColt'}</span>
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
                  <span>{dict?.maps?.all || 'All'}</span>
                </button>
              </div>
            </div>

            <div
              role="group"
              aria-label={dict?.maps?.realmFiltersAria || 'Realm Filters'}
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
                {dict?.maps?.all || 'All'} ({maps.length})
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
                aria-label={dict?.maps?.launch2DEngine || 'Launch 2D Interactive Engine'}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer min-h-[34px] shadow-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                data-testid="desktop-map-fullscreen-btn"
                title={dict?.maps?.launch2DEngine || 'Launch 2D Interactive Engine'}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{dict?.maps?.twoDEngine || '2D Engine'}</span>
              </button>
            )}
            {onPopoutImage && activeMap && (
              <button
                type="button"
                onClick={() => onPopoutImage(getMapImageSrc(activeMap), activeMap.name)}
                aria-label={dict?.maps?.popoutAria || 'Popout Map Image in New Window'}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all cursor-pointer min-h-[34px] shadow-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                data-testid="desktop-map-popout-btn"
                title={dict?.maps?.popoutAria || 'Popout Map Image in New Window'}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{dict?.maps?.popout || 'Popout'}</span>
              </button>
            )}
          </div>
        </header>

        <VariantSwitcherBar
          variants={variants}
          activeMapName={activeMap?.name || ''}
          onSelectVariant={onSelectVariant}
          className="m-3 mb-0 shrink-0"
          dict={dict}
        />

        <div className="relative flex-1 w-full min-h-0 overflow-hidden flex items-center justify-center bg-slate-900/10 dark:bg-slate-950/80">
          <MapCanvas
            imageUrl={getMapImageSrc(activeMap)}
            mapName={activeMap?.name}
            realmName={activeMap?.realm}
            transformStyle={transformStyle}
            isDragging={isDragging}
            className="h-full w-full rounded-none border-0 max-h-none"
            dict={dict}
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
              dict={dict}
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
          dict={dict}
        />
      </main>
    </div>
  );
};
