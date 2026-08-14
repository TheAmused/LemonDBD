'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Compass,
  Search,
  Maximize2,
  ExternalLink,
  Layers,
  Clock,
  RotateCcw,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X,
  ZoomIn,
  ZoomOut,
  Map as MapIcon,
  Check,
  Move,
} from 'lucide-react';
import { MapRealm } from '@/types/map';
import { fetchMaps, fetchMapDetail } from '@/services/mapApi';
import { FullscreenMapEngine } from './FullscreenMapEngine';
import { getVariantsForMap } from '@/utils/mapVoiceMatcher';

export interface MapExplorerProps {
  initialMapName?: string;
  selectedSource?: 'all' | 'hens333' | 'samoelcolt';
  onSourceChange?: (source: 'all' | 'hens333' | 'samoelcolt') => void;
  onActionTriggered?: (action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => void;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
}

export const MapExplorer: React.FC<MapExplorerProps> = ({
  initialMapName = '',
  selectedSource: propSelectedSource,
  onSourceChange,
  onActionTriggered,
  onAvailableMapsLoaded,
}) => {
  const [maps, setMaps] = useState<MapRealm[]>([]);
  const [selectedRealm, setSelectedRealm] = useState<string>('all');
  const [internalSource, setInternalSource] = useState<'all' | 'hens333' | 'samoelcolt'>(
    propSelectedSource || 'hens333'
  );
  const [selectedMapId, setSelectedMapId] = useState<string>('hens_azarovs_resting_place');
  const [activeMap, setActiveMap] = useState<MapRealm | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [imageAlignment, setImageAlignment] = useState<'left' | 'center' | 'right'>('center');

  // Zoom & Pan State for Detail Modal
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialPinchZoom, setInitialPinchZoom] = useState<number>(1);

  const modalCanvasRef = useRef<HTMLDivElement>(null);
  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Synchronize internal source state with prop if controlled
  const activeSource = propSelectedSource !== undefined ? propSelectedSource : internalSource;

  useEffect(() => {
    if (propSelectedSource !== undefined) {
      setInternalSource(propSelectedSource);
    }
  }, [propSelectedSource]);

  const handleSourceChange = (source: 'all' | 'hens333' | 'samoelcolt') => {
    setInternalSource(source);
    onSourceChange?.(source);
  };

  // Reset Zoom & Pan
  const handleResetZoomPan = useCallback(() => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(3.0, Math.round((z + 0.25) * 100) / 100));
    onActionTriggered?.('zoom_in');
  }, [onActionTriggered]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
    onActionTriggered?.('zoom_out');
  }, [onActionTriggered]);

  const handleSetZoom = useCallback((level: number) => {
    setZoomLevel(Math.min(3.0, Math.max(0.5, level)));
  }, []);

  // Fetch maps list on realm/search/source change
  useEffect(() => {
    async function loadMaps() {
      try {
        setLoading(true);
        const data = await fetchMaps(selectedRealm, search, activeSource);
        const loaded: MapRealm[] = data.maps || [];
        setMaps(loaded);
        onAvailableMapsLoaded?.(loaded);

        if (loaded.length > 0 && !loaded.some((m) => m.id === selectedMapId)) {
          setSelectedMapId(loaded[0].id);
        }
      } catch (err) {
        console.error('Failed loading maps:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMaps();
  }, [selectedRealm, search, activeSource]);

  // Handle initialMapName changes: search maps matching name & active source, select, and open detail modal
  useEffect(() => {
    if (!initialMapName || !initialMapName.trim() || maps.length === 0) return;
    const needle = initialMapName.toLowerCase().trim();

    // Priority 1: Match within active source
    let match = maps.find(
      (m) =>
        (activeSource === 'all' || m.source === activeSource) &&
        (m.name.toLowerCase().includes(needle) || needle.includes(m.name.toLowerCase()))
    );

    // Priority 2: Match across any source in loaded maps
    if (!match) {
      match = maps.find(
        (m) =>
          m.name.toLowerCase().includes(needle) ||
          needle.includes(m.name.toLowerCase())
      );
    }

    if (match) {
      setSelectedMapId(match.id);
      setIsDetailModalOpen(true);
      handleResetZoomPan();
    }
  }, [initialMapName, maps, activeSource, handleResetZoomPan]);

  // Load Map Detail
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

  // Reset zoom and pan whenever a new map is loaded or detail modal opens
  useEffect(() => {
    handleResetZoomPan();
  }, [selectedMapId, isDetailModalOpen, handleResetZoomPan]);

  // Keyboard Escape Handler
  useEffect(() => {
    if (!isDetailModalOpen && !isFullscreenOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDetailModalOpen(false);
        setIsFullscreenOpen(false);
        onActionTriggered?.('close');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailModalOpen, isFullscreenOpen, onActionTriggered]);

  // Extract unique realms
  const uniqueRealms = useMemo(() => {
    const realmSet = new Set<string>();
    maps.forEach((m) => {
      if (m.realm) realmSet.add(m.realm);
    });
    return Array.from(realmSet).sort();
  }, [maps]);

  // Map variants for active map
  const variants = useMemo(() => {
    if (!activeMap) return [];
    return getVariantsForMap(activeMap.name);
  }, [activeMap]);

  // Handle switching to a specific variant within the same provider source
  const handleVariantSelect = (variantName: string) => {
    if (!activeMap) return;
    const normTarget = variantName.toLowerCase().trim();

    // Find map matching variant and source
    let match = maps.find(
      (m) =>
        m.source === activeMap.source &&
        (m.name.toLowerCase().includes(normTarget) || normTarget.includes(m.name.toLowerCase()))
    );

    // Fallback: any map matching variant
    if (!match) {
      match = maps.find(
        (m) =>
          m.name.toLowerCase().includes(normTarget) ||
          normTarget.includes(m.name.toLowerCase())
      );
    }

    if (match) {
      setSelectedMapId(match.id);
      handleResetZoomPan();
    }
  };

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
              <title>${title} - Map Guide</title>
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

  // ─── Mouse Drag Handlers for Modal Pan ─────────────────────────────────────
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

  // ─── Mouse Wheel Zoom ───────────────────────────────────────────────────────
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoomLevel((prev) => Math.min(3.0, Math.max(0.5, Math.round((prev + delta) * 100) / 100)));
  };

  // ─── Touch Drag & Pinch-to-Zoom Handlers for Mobile ─────────────────────────
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
      setInitialPinchZoom(zoomLevel);
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
      const nextZoom = Math.min(3.0, Math.max(0.5, initialPinchZoom * factor));
      setZoomLevel(Math.round(nextZoom * 100) / 100);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialPinchDistance(null);
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
              Hens333 12-Clock Callouts & SamoelColt Isometric Schemes
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Dead by Daylight Map & Callouts Library
            </h1>
            <p className="mt-2 text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Toggle between <strong className="text-amber-400">Hens333 12-hour clock callout diagrams</strong> and <strong className="text-emerald-400">SamoelColt 3D isometric map schemes</strong> from Steam Workshop. Explore 120+ map guides across 21 realms.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => {
                setIsFullscreenOpen(true);
                onActionTriggered?.('fullscreen');
              }}
              className="flex-1 lg:flex-none items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-xs font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 active:scale-95 transition-all cursor-pointer flex min-h-[44px]"
            >
              <Maximize2 className="h-4 w-4" />
              <span>Launch 2D Interactive Engine</span>
            </button>
          </div>
        </div>
      </div>

      {/* Source Toggle Bar (Hens333 vs SamoelColt vs All) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-amber-500" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            Map Provider Source:
          </span>
        </div>

        <div className="flex w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-950 p-1 shadow-inner">
          <button
            onClick={() => handleSourceChange('hens333')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition-all cursor-pointer min-h-[40px] ${
              activeSource === 'hens333'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Hens333 (12-Clock Callouts)</span>
          </button>

          <button
            onClick={() => handleSourceChange('samoelcolt')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition-all cursor-pointer min-h-[40px] ${
              activeSource === 'samoelcolt'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>SamoelColt (Isometric Schemes)</span>
          </button>

          <button
            onClick={() => handleSourceChange('all')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition-all cursor-pointer min-h-[40px] ${
              activeSource === 'all'
                ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-md scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>All Sources</span>
          </button>
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
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs font-semibold text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none min-h-[40px]"
            />
          </div>

          {/* Alignment Quick Controls */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Alignment:
            </span>
            <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
              <button
                onClick={() => setImageAlignment('left')}
                className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  imageAlignment === 'left' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Left Align"
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setImageAlignment('center')}
                className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  imageAlignment === 'center' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Center Align"
              >
                <AlignCenter className="h-4 w-4" />
              </button>
              <button
                onClick={() => setImageAlignment('right')}
                className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  imageAlignment === 'right' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Right Align"
              >
                <AlignRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Realm Selector Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedRealm('all')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer border min-h-[38px] ${
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
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border min-h-[38px] ${
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
            Try adjusting your search query, source toggle, or selected realm filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {maps.map((m) => {
            const imgSrc = getMapImageSrc(m);
            const isSelected = selectedMapId === m.id;
            const isSamoel = m.source === 'samoelcolt';

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
                      style={{ imageRendering: '-webkit-optimize-contrast' as any }}
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePopoutImage(imgSrc, m.name);
                    }}
                    className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/80 text-slate-300 hover:text-amber-400 backdrop-blur-md transition-colors cursor-pointer"
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

      {/* Map Callout Detail & Large-Scale Zoom Modal */}
      {isDetailModalOpen && activeMap && (
        <div
          onClick={() => {
            setIsDetailModalOpen(false);
            onActionTriggered?.('close');
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-2 sm:p-4 md:p-6 animate-in fade-in duration-200 overflow-y-auto cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[96vw] max-w-7xl max-h-[96vh] rounded-3xl border border-slate-800 bg-slate-900/95 p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 md:space-y-6 cursor-default flex flex-col overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex flex-col gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-extrabold text-amber-400">
                      {activeMap.realm}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        activeMap.source === 'samoelcolt'
                          ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-300'
                          : 'border-amber-500/50 bg-amber-950/90 text-amber-300'
                      }`}
                    >
                      {activeMap.source === 'samoelcolt' ? 'SamoelColt Isometric' : 'Hens333 12-Clock'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                    {activeMap.name} Diagram
                  </h2>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setIsFullscreenOpen(true);
                      onActionTriggered?.('fullscreen');
                    }}
                    className="hidden sm:flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer min-h-[44px]"
                  >
                    <Maximize2 className="h-4 w-4" />
                    <span>2D Engine</span>
                  </button>
                  <button
                    onClick={() => handlePopoutImage(getMapImageSrc(activeMap), activeMap.name)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:border-amber-500 hover:text-amber-400 transition-all cursor-pointer min-h-[44px]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="hidden sm:inline">Popout</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      onActionTriggered?.('close');
                    }}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Variant Disambiguation Switcher Bar */}
              {variants.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-2.5 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 pl-1 pr-2">
                    <Layers className="h-3.5 w-3.5" />
                    <span>Map Variants:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {variants.map((v) => {
                      const isActive =
                        activeMap.name.toLowerCase() === v.toLowerCase() ||
                        activeMap.name.toLowerCase().includes(v.toLowerCase()) ||
                        v.toLowerCase().includes(activeMap.name.toLowerCase());

                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleVariantSelect(v)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-extrabold scale-105 ring-2 ring-amber-400'
                              : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-amber-400 hover:text-white'
                          }`}
                        >
                          <span>{v}</span>
                          {isActive && <Check className="h-3.5 w-3.5 text-slate-950" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Main High-Resolution Image Display with Pan & Zoom */}
            <div
              ref={modalCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none' }}
              className={`relative min-h-[440px] md:min-h-[520px] max-h-[85vh] h-[55vh] md:h-[65vh] w-full overflow-hidden rounded-2xl bg-slate-950 p-4 border border-slate-800/80 flex items-center justify-center select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 100ms ease-out',
                }}
                className={`w-full h-full flex items-center transition-all ${
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
                  draggable={false}
                  style={{
                    imageRendering: '-webkit-optimize-contrast' as any,
                  }}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-2xl pointer-events-none"
                />
              </div>

              {/* Pan Hint Overlay */}
              <div className="absolute top-3 left-3 hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-800/80 bg-slate-950/70 px-2.5 py-1 text-[10px] font-mono text-slate-400 backdrop-blur-md pointer-events-none">
                <Move className="h-3 w-3 text-amber-500" />
                <span>Drag to pan • Scroll to zoom</span>
              </div>

              {/* Floating Zoom & Preset Controls Overlay */}
              <div className="absolute bottom-4 right-4 flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-2 backdrop-blur-md shadow-2xl z-30">
                <button
                  onClick={handleZoomIn}
                  className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-200 hover:text-amber-400 hover:bg-slate-800 transition-all cursor-pointer"
                  title="Zoom In (+25%)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>

                <span className="text-xs font-mono font-bold text-amber-400 px-2 min-w-[45px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>

                <button
                  onClick={handleZoomOut}
                  className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-200 hover:text-amber-400 hover:bg-slate-800 transition-all cursor-pointer"
                  title="Zoom Out (-25%)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>

                <div className="w-px h-5 bg-slate-800 mx-1 hidden sm:block" />

                {/* Quick Zoom Presets */}
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    onClick={() => handleSetZoom(1.0)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      zoomLevel === 1.0
                        ? 'bg-amber-500 text-slate-950 font-extrabold'
                        : 'text-slate-400 hover:text-white bg-slate-800/50'
                    }`}
                  >
                    100%
                  </button>
                  <button
                    onClick={() => handleSetZoom(1.5)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      zoomLevel === 1.5
                        ? 'bg-amber-500 text-slate-950 font-extrabold'
                        : 'text-slate-400 hover:text-white bg-slate-800/50'
                    }`}
                  >
                    150%
                  </button>
                  <button
                    onClick={() => handleSetZoom(2.0)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      zoomLevel === 2.0
                        ? 'bg-amber-500 text-slate-950 font-extrabold'
                        : 'text-slate-400 hover:text-white bg-slate-800/50'
                    }`}
                  >
                    200%
                  </button>
                </div>

                <div className="w-px h-5 bg-slate-800 mx-1" />

                <button
                  onClick={handleResetZoomPan}
                  className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-200 hover:text-amber-400 hover:bg-slate-800 transition-all cursor-pointer"
                  title="Reset Zoom & Pan"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Clock / Sector System Legend (2 columns mobile, 4 columns desktop) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 md:p-4">
                <div className="text-[11px] md:text-xs font-bold uppercase text-amber-500">
                  {activeMap.source === 'samoelcolt' ? 'North Sector' : "12 O'Clock (Top)"}
                </div>
                <div className="mt-1 text-xs md:text-sm font-extrabold text-slate-100 line-clamp-2">
                  {activeMap.clock_system?.twelve_o_clock || 'Main Building / Top Spawn'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 md:p-4">
                <div className="text-[11px] md:text-xs font-bold uppercase text-amber-500">
                  {activeMap.source === 'samoelcolt' ? 'East Sector' : "3 O'Clock (Right)"}
                </div>
                <div className="mt-1 text-xs md:text-sm font-extrabold text-slate-100 line-clamp-2">
                  {activeMap.clock_system?.three_o_clock || 'Right Tile / Generator Cluster'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 md:p-4">
                <div className="text-[11px] md:text-xs font-bold uppercase text-amber-500">
                  {activeMap.source === 'samoelcolt' ? 'South Sector' : "6 O'Clock (Bottom)"}
                </div>
                <div className="mt-1 text-xs md:text-sm font-extrabold text-slate-100 line-clamp-2">
                  {activeMap.clock_system?.six_o_clock || 'Killer Shack / Bottom Spawn'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 md:p-4">
                <div className="text-[11px] md:text-xs font-bold uppercase text-amber-500">
                  {activeMap.source === 'samoelcolt' ? 'West Sector' : "9 O'Clock (Left)"}
                </div>
                <div className="mt-1 text-xs md:text-sm font-extrabold text-slate-100 line-clamp-2">
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
          onSelectMapId={(id) => {
            setSelectedMapId(id);
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

