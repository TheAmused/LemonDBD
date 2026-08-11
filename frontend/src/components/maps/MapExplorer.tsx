'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Compass,
  Search,
  Maximize2,
  ExternalLink,
  Layers,
  MapPin,
  Clock,
  ChevronRight,
  Shield,
  Eye,
  RotateCcw,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { MapRealm } from '@/types/map';
import { fetchMaps, fetchMapDetail } from '@/services/mapApi';
import { FullscreenMapEngine } from './FullscreenMapEngine';

export const MapExplorer: React.FC = () => {
  const [maps, setMaps] = useState<MapRealm[]>([]);
  const [selectedRealm, setSelectedRealm] = useState<string>('all');
  const [selectedMapId, setSelectedMapId] = useState<string>('azarovs_resting_place');
  const [activeMap, setActiveMap] = useState<MapRealm | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [imageAlignment, setImageAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    async function loadMaps() {
      try {
        setLoading(true);
        const data = await fetchMaps(selectedRealm, search);
        setMaps(data.maps || []);
        if (data.maps && data.maps.length > 0 && !data.maps.some((m) => m.id === selectedMapId)) {
          setSelectedMapId(data.maps[0].id);
        }
      } catch (err) {
        console.error('Failed loading maps:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMaps();
  }, [selectedRealm, search]);

  useEffect(() => {
    if (!selectedMapId) return;
    async function loadDetail() {
      try {
        const data = await fetchMapDetail(selectedMapId);
        setActiveMap(data.map);
      } catch (err) {
        console.error('Failed loading map detail:', err);
      }
    }
    loadDetail();
  }, [selectedMapId]);

  // Extract unique realms
  const uniqueRealms = useMemo(() => {
    const realmSet = new Set<string>();
    maps.forEach((m) => {
      if (m.realm) realmSet.add(m.realm);
    });
    return Array.from(realmSet).sort();
  }, [maps]);

  const getMapImageSrc = (m: MapRealm) => {
    if (m.callout_image_local_path) {
      const clean = m.callout_image_local_path.replace(/^\/?(static\/)?/, '');
      return `${backendBase}/static/${clean}`;
    }
    return m.callout_image_url || m.image_url || '';
  };

  const handlePopoutImage = (url: string, title: string) => {
    if (typeof window !== 'undefined') {
      const w = window.open('', '_blank', 'width=1200,height=900,resizable=yes,scrollbars=yes');
      if (w) {
        w.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title} - Map Callouts</title>
              <style>
                body { margin: 0; background: #090d16; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; color: #fff; }
                img { max-width: 98vw; max-height: 95vh; object-contain: fit; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
              </style>
            </head>
            <body>
              <img src="${url}" alt="${title}" />
            </body>
          </html>
        `);
        w.document.close();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-extrabold text-amber-400 mb-3">
              <Compass className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '12s' }} />
              Hens333 Competitive Map Callout Diagrams
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Dead by Daylight Map & Callouts Library
            </h1>
            <p className="mt-2 text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Explore 58 high-resolution 12-hour clock system callout diagrams across 21 realms. Perfect for SWF callouts, generator 3-gen setups, and tile layout recognition.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => setIsFullscreenOpen(true)}
              className="flex-1 lg:flex-none items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-xs font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 active:scale-95 transition-all cursor-pointer flex"
            >
              <Maximize2 className="h-4 w-4" />
              <span>Launch 2D Interactive Engine</span>
            </button>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Realm Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search map or realm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs font-semibold text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Alignment Quick Controls for Active View */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Alignment:
            </span>
            <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
              <button
                onClick={() => setImageAlignment('left')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  imageAlignment === 'left' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Left Align"
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setImageAlignment('center')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  imageAlignment === 'center' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Center Align"
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setImageAlignment('right')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  imageAlignment === 'right' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Right Align"
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Realm Selector Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedRealm('all')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer border ${
              selectedRealm === 'all'
                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            All Realms ({maps.length})
          </button>
          {uniqueRealms.map((r) => {
            const count = maps.filter((m) => m.realm === r).length;
            return (
              <button
                key={r}
                onClick={() => setSelectedRealm(r)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedRealm === r
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {r} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Maps Showcase Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-3xl bg-slate-900/60 border border-slate-800"
            />
          ))}
        </div>
      ) : maps.length === 0 ? (
        <div className="my-12 rounded-3xl border border-dashed border-slate-800 p-12 text-center">
          <Compass className="mx-auto h-12 w-12 text-slate-600 mb-3 animate-spin" style={{ animationDuration: '20s' }} />
          <h3 className="text-lg font-bold text-slate-200">No Maps Found</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search query or selected realm filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {maps.map((m) => {
            const imgSrc = getMapImageSrc(m);
            const isSelected = selectedMapId === m.id;

            return (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedMapId(m.id);
                  setIsDetailModalOpen(true);
                }}
                className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border bg-slate-900/90 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/40'
                    : 'border-slate-800 hover:border-amber-500/50'
                }`}
              >
                {/* Map Callout Diagram Image Header */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={m.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-600">
                      <Compass className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  {/* Realm Badge Overlay */}
                  <div className="absolute top-3 left-3 rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1 text-[11px] font-extrabold text-amber-400 backdrop-blur-md">
                    {m.realm}
                  </div>

                  {/* Popout Quick Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePopoutImage(imgSrc, m.name);
                    }}
                    className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/80 text-slate-300 hover:text-amber-400 backdrop-blur-md transition-colors"
                    title="Popout Map Image in New Window"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col gap-3">
                  <h3 className="text-lg font-black text-slate-100 group-hover:text-amber-400 transition-colors">
                    {m.name}
                  </h3>

                  {/* Clock Callout Quick Hint */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>12-Clock Callout Map System</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Map Callout Detail & Zoom Modal */}
      {isDetailModalOpen && activeMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 md:p-8 animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-6xl rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-extrabold text-amber-400">
                  {activeMap.realm}
                </span>
                <h2 className="text-2xl font-black text-white mt-1">
                  {activeMap.name} Callout Diagram
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePopoutImage(getMapImageSrc(activeMap), activeMap.name)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:border-amber-500 hover:text-amber-400 transition-all"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Popout Window</span>
                </button>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Main Callout Image Display with Alignment & Zoom */}
            <div className="relative min-h-[400px] max-h-[650px] w-full overflow-auto rounded-2xl bg-slate-950 p-4 border border-slate-800/80 flex items-center justify-center">
              <div
                className={`w-full flex transition-all ${
                  imageAlignment === 'left'
                    ? 'justify-start'
                    : imageAlignment === 'right'
                    ? 'justify-end'
                    : 'justify-center'
                }`}
              >
                <img
                  src={getMapImageSrc(activeMap)}
                  alt={activeMap.name}
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                  className="max-h-[600px] object-contain rounded-xl shadow-2xl transition-transform duration-200"
                />
              </div>

              {/* Zoom Controls Overlay */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-1.5 backdrop-blur-md">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                  className="p-1 text-slate-300 hover:text-amber-400"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <span className="text-[11px] font-mono font-bold text-slate-400 px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 text-slate-300 hover:text-amber-400"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 text-slate-300 hover:text-amber-400"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 12-Hour Clock System Callouts Legend */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs font-bold uppercase text-amber-500">12 O'Clock (Top)</div>
                <div className="mt-1 text-sm font-extrabold text-slate-100">
                  {activeMap.clock_system?.twelve_o_clock || 'Main Building / Top Spawn'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs font-bold uppercase text-amber-500">3 O'Clock (Right)</div>
                <div className="mt-1 text-sm font-extrabold text-slate-100">
                  {activeMap.clock_system?.three_o_clock || 'Right Tile / Generator Cluster'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs font-bold uppercase text-amber-500">6 O'Clock (Bottom)</div>
                <div className="mt-1 text-sm font-extrabold text-slate-100">
                  {activeMap.clock_system?.six_o_clock || 'Killer Shack / Bottom Spawn'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs font-bold uppercase text-amber-500">9 O'Clock (Left)</div>
                <div className="mt-1 text-sm font-extrabold text-slate-100">
                  {activeMap.clock_system?.nine_o_clock || 'Left Tile / Jungle Gym'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Interactive Engine Modal */}
      {isFullscreenOpen && activeMap && (
        <FullscreenMapEngine
          mapId={activeMap.id}
          availableMaps={maps}
          onClose={() => setIsFullscreenOpen(false)}
        />
      )}
    </div>
  );
};
