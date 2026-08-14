'use client';

import React, { useState } from 'react';
import { Search, Clock, Layers, Sparkles, Maximize2, ExternalLink } from 'lucide-react';
import type { MapRealm } from '@/types/map';
import { MapCanvas } from '../MapCanvas';
import { MapControls } from '../MapControls';
import { VariantSwitcherBar } from '../VariantSwitcherBar';
import { MapLegendDrawer } from '../MapLegendDrawer';
import { MapDirectoryList } from '../MapDirectoryList';

export interface DesktopMapLayoutProps {
  // Explorer Data
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

  // Gesture & Canvas
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

  // Actions
  onLaunchFullscreen?: () => void;
  onPopoutImage?: (url: string, title: string) => void;
}

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getMapImageSrc(m: MapRealm | null | undefined): string {
  if (!m) return '';
  if (m.callout_image_local_path) {
    const clean = m.callout_image_local_path.replace(/^\/?(static\/)?/, '');
    return `${backendBase}/static/${clean}`;
  }
  return m.callout_image_url || m.image_url || '';
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

  return (
    <div
      className="flex flex-col lg:flex-row gap-6 w-full items-start"
      data-testid="desktop-map-layout"
    >
      {/* ─── Left Sidebar: Search, Source, Realms & Map Directory ───────────── */}
      <aside
        className="w-full lg:w-80 xl:w-96 shrink-0 h-[calc(100vh-14rem)] flex flex-col rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden"
        data-testid="desktop-map-sidebar"
      >
        {/* Top: Search Input & Provider Source Segmented Toggle */}
        <div className="p-3.5 border-b border-slate-800/80 space-y-3 shrink-0">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search map or realm..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs font-semibold text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none min-h-[40px]"
              data-testid="desktop-map-search-input"
            />
          </div>

          {/* Provider Source Segmented Control */}
          <div className="flex w-full rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => onSourceChange('hens333')}
              aria-pressed={activeSource === 'hens333'}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-extrabold transition-all cursor-pointer min-h-[34px] ${
                activeSource === 'hens333'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
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
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-extrabold transition-all cursor-pointer min-h-[34px] ${
                activeSource === 'samoelcolt'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
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
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-extrabold transition-all cursor-pointer min-h-[34px] ${
                activeSource === 'all'
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              data-testid="desktop-map-source-all"
            >
              <Sparkles className="h-3 w-3" />
              <span>All</span>
            </button>
          </div>
        </div>

        {/* Middle: Realm Selection Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-3 border-b border-slate-800/80 scrollbar-thin shrink-0">
          <button
            type="button"
            onClick={() => onSelectRealm('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer border min-h-[32px] ${
              selectedRealm === 'all'
                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border min-h-[32px] ${
                  selectedRealm === r
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
                data-testid={`desktop-map-realm-pill-${slug}`}
              >
                {r} ({count})
              </button>
            );
          })}
        </div>

        {/* Body: Scrollable MapDirectoryList */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0 scrollbar-thin [&_[data-testid=map-directory-grid]]:!grid-cols-1 [&_[data-testid=map-directory-grid]]:!gap-3">
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
      </aside>

      {/* ─── Right Center Viewport: Header, Variants, Canvas, Controls & Legend ── */}
      <main
        className="flex-1 flex flex-col min-w-0 h-[calc(100vh-14rem)] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden relative"
        data-testid="desktop-map-viewport"
      >
        {/* Viewport Header */}
        <div
          className="flex items-center justify-between p-3.5 md:p-4 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md shrink-0"
          data-testid="desktop-map-header"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-extrabold text-amber-400 whitespace-nowrap">
              {activeMap?.realm || 'Select a Map'}
            </span>
            <span
              className={`hidden sm:inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase whitespace-nowrap ${
                activeMap?.source === 'samoelcolt'
                  ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-300'
                  : 'border-amber-500/50 bg-amber-950/90 text-amber-300'
              }`}
            >
              {activeMap?.source === 'samoelcolt' ? 'SamoelColt Isometric' : 'Hens333 12-Clock'}
            </span>
            <h2 className="text-base md:text-lg font-black text-white truncate">
              {activeMap ? activeMap.name : 'No Map Selected'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onLaunchFullscreen && (
              <button
                type="button"
                onClick={onLaunchFullscreen}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer min-h-[36px]"
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
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-amber-500 hover:text-amber-400 transition-all cursor-pointer min-h-[36px]"
                data-testid="desktop-map-popout-btn"
                title="Popout Map Image in New Window"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Popout</span>
              </button>
            )}
          </div>
        </div>

        {/* 1-Click Variant Switcher Bar */}
        <VariantSwitcherBar
          variants={variants}
          activeMapName={activeMap?.name || ''}
          onSelectVariant={onSelectVariant}
          className="m-3 mb-0 shrink-0"
        />

        {/* High-Resolution Map Canvas & Floating Controls */}
        <div className="relative flex-1 w-full min-h-0 overflow-hidden flex items-center justify-center bg-slate-950">
          <MapCanvas
            imageUrl={getMapImageSrc(activeMap)}
            mapName={activeMap?.name}
            realmName={activeMap?.realm}
            transformStyle={transformStyle}
            isDragging={isDragging}
            className="h-full w-full rounded-none border-0 max-h-none"
            {...canvasHandlers}
          />

          {/* Floating MapControls Toolbar */}
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

        {/* Collapsible Bottom MapLegendDrawer */}
        <MapLegendDrawer
          clockSystem={activeMap?.clock_system}
          source={activeMap?.source}
          isOpen={isLegendOpen}
          onToggle={() => setIsLegendOpen((prev) => !prev)}
          collapsible={true}
          className="border-t border-slate-800/80 rounded-none rounded-b-2xl shrink-0"
        />
      </main>
    </div>
  );
};
