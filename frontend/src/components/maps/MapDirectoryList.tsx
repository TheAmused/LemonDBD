'use client';

import React, { useMemo } from 'react';
import { Compass, Clock, Layers, ExternalLink, Search } from 'lucide-react';
import type { MapRealm } from '@/types/map';
import { getMapImageSrc } from '@/utils/mapUtils';

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
  backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  className = '',
  showFilters = false,
}) => {
  // Extract all maps into a flat list or filtered by selected realm
  const flatMaps = useMemo(() => {
    const realms = Object.keys(groupedMaps || {});
    if (selectedRealm && selectedRealm !== 'all') {
      return groupedMaps[selectedRealm] || [];
    }
    return realms.flatMap((realm) => groupedMaps[realm] || []);
  }, [groupedMaps, selectedRealm]);

  // Filter flatMaps further by searchQuery if provided and controlled
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
      {/* Optional Filters Bar (Search & Realm Pills) */}
      {showFilters && (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
          {onSearchChange && (
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search map or realm..."
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs font-semibold text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none min-h-[40px]"
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
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
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
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
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

      {/* Loading Skeleton */}
      {loading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          data-testid="map-directory-loading"
        >
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-3xl bg-slate-900/60 border border-slate-800"
            />
          ))}
        </div>
      ) : filteredMaps.length === 0 ? (
        /* Empty State */
        <div
          className="my-12 rounded-3xl border border-dashed border-slate-800 p-12 text-center select-none"
          data-testid="map-directory-empty"
        >
          <Compass
            className="mx-auto h-12 w-12 text-slate-600 mb-3 animate-spin"
            style={{ animationDuration: '20s' }}
          />
          <h3 className="text-lg font-bold text-slate-200">No Maps Found</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search query or selected realm filter.
          </p>
        </div>
      ) : (
        /* Maps Grid Showcase */
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
                className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border bg-slate-900/90 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                    : 'border-slate-800 hover:border-amber-500/50'
                }`}
                data-testid={`map-card-${m.id}`}
              >
                {/* Thumbnail Image Area */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={m.name}
                      style={{
                        imageRendering: '-webkit-optimize-contrast' as React.CSSProperties['imageRendering'],
                      }}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      data-testid={`map-thumbnail-${m.id}`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-600">
                      <Compass className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  {/* Realm Tag Overlay */}
                  <div
                    className="absolute top-3 left-3 rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1 text-[11px] font-extrabold text-amber-400 backdrop-blur-md"
                    data-testid={`map-realm-tag-${m.id}`}
                  >
                    {m.realm}
                  </div>

                  {/* Source Badge Overlay */}
                  <div
                    className={`absolute bottom-3 left-3 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase backdrop-blur-md ${
                      isSamoel
                        ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-300'
                        : 'border-amber-500/50 bg-amber-950/90 text-amber-300'
                    }`}
                  >
                    {isSamoel ? 'SamoelColt Isometric' : 'Hens333 12-Clock'}
                  </div>

                  {/* Popout Quick Button */}
                  {onPopoutImage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPopoutImage(imgSrc, m.name);
                      }}
                      className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/80 text-slate-300 hover:text-amber-400 backdrop-blur-md transition-colors cursor-pointer min-h-[36px] min-w-[36px]"
                      title="Popout Map Image in New Window"
                      data-testid={`map-popout-btn-${m.id}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col gap-3">
                  <h3 className="text-lg font-black text-slate-100 group-hover:text-amber-400 transition-colors">
                    {m.name}
                  </h3>

                  {/* Callout Quick Hint */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    {isSamoel ? (
                      <>
                        <Layers className="h-3.5 w-3.5 text-emerald-400" />
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
