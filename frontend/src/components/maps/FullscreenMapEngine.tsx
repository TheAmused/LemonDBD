'use client';
// frontend/src/components/maps/FullscreenMapEngine.tsx

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
  dict?: any;
}

export const FullscreenMapEngine: React.FC<FullscreenMapEngineProps> = ({
  mapId,
  onClose,
  availableMaps = [],
  onSelectMapId,
  dict,
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
      aria-label={dict?.maps?.fullscreenEngineAria || '2D Fullscreen Map Engine'}
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
            <span>{dict?.modal?.close || 'Close Engine'}</span>
          </button>

          {activeMap && (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-wide">{activeMap.name}</h1>
                {availableMaps.length > 0 && (
                  <select
                    value={activeMap.id}
                    onChange={(e) => handleSelectMap(e.target.value)}
                    aria-label={dict?.maps?.searchAria || 'Select Realm Map'}
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
                {activeMap.realm} {dict?.maps?.bulletSeparator || '•'} {activeMap.layout_type}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label={dict?.maps?.mapVariantSelectorAria || 'Map Variant Selector'}
            className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-inner"
          >
            <span className="text-[10px] font-mono uppercase text-slate-500 px-2 font-bold">{dict?.maps?.variant || 'Variant:'}</span>
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
            aria-label={dict?.maps?.floorSelectorAria || 'Floor Selector'}
            className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-inner"
          >
            <span className="text-[10px] font-mono uppercase text-slate-500 px-2 font-bold">{dict?.maps?.floor || 'Floor:'}</span>
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
                  {dict?.maps?.floor ? `${dict?.maps?.floor.replace(':', '')} ${fl}` : `Floor ${fl}`}
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
              <span className="text-xs font-bold text-slate-300">{dict?.maps?.renderingLayout || 'Rendering Tactical Map Layout...'}</span>
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
              {dict?.maps?.hudBracketOpen || '['} {activeMap?.realm || 'REALM'} {dict?.maps?.hudFloorLabel || '• FLOOR'} {currentFloor} {dict?.maps?.hudVariantLabel || '• VARIANT'} {currentSeed.toUpperCase()} {dict?.maps?.hudBracketClose || ']'}
            </div>
            <div className="absolute bottom-3 right-4 text-[10px] font-mono text-amber-500/60 uppercase">
              {dict?.maps?.tacticalEngineVersion || 'LemonDBD Tactical Engine v2.0'}
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
                        {dict?.maps?.palletEmoji || '🪵'}
                      </span>
                    )}

                    {isWindowTile && showWindows && renderVaultArrows(tile.vault_directions || tile.vault_direction)}
                  </div>

                  {showCallouts && (
                    <div className="mt-1 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 text-center shadow whitespace-nowrap">
                      {dict?.maps?.calloutEmoji || '📢'} {tile.callout_label || tile.name}
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
                  {isHatch && <span className="text-sm">{dict?.maps?.hatchEmoji || '🕳️'}</span>}
                  {isPallet && !isTotem && !isGen && <span className="text-sm">{dict?.maps?.palletEmoji || '🪵'}</span>}
                  {isWindow && !isPallet && !isTotem && !isGen && <span className="text-sm">{dict?.maps?.windowEmoji || '🪟'}</span>}
                </div>

                {showCallouts && obj.location_description && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover:block whitespace-nowrap bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-md border border-slate-700 shadow-2xl z-50">
                    {dict?.maps?.calloutEmoji || '📢'} {obj.location_description}
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
          aria-label={dict?.maps?.layerTogglesAria || 'Map Layer Toggles'}
          className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl backdrop-blur-xl shadow-2xl overflow-x-auto max-w-full"
        >
          <div className="px-2 text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            {dict?.maps?.layersLabel || 'Layers:'}
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
            <span>{dict?.maps?.palletEmoji || '🪵'} {dict?.maps?.pallets || 'Pallets'}</span>
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
            <span>{dict?.maps?.windowEmoji || '🪟'} {dict?.maps?.windows || 'Windows'}</span>
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
            <span>{dict?.maps?.totems || 'Totems'}</span>
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
            <span>{dict?.maps?.gens || 'Gens'}</span>
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
            <span>{dict?.maps?.gatesHatch || 'Gates & Hatch'}</span>
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
            <span>{dict?.maps?.tiles || 'Tiles'}</span>
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
            <span>{dict?.maps?.callouts || 'Callouts'}</span>
          </button>
        </div>

        <div
          role="toolbar"
          aria-label={dict?.maps?.engineControlsAria || 'Engine Zoom and Reset Controls'}
          className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl backdrop-blur-xl shadow-2xl"
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.1))}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={dict?.maps?.zoomOut || 'Zoom Out'}
            aria-label={dict?.maps?.zoomOutAria || 'Zoom Out'}
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold text-amber-400 px-2 min-w-[50px] text-center">
            {Math.round(zoom * 100)}{dict?.maps?.percentSign || '%'}
          </span>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.2, 5.0))}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={dict?.maps?.zoomIn || 'Zoom In'}
            aria-label={dict?.maps?.zoomInAria || 'Zoom In'}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-800 my-auto" />

          <button
            type="button"
            onClick={handleResetView}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={dict?.maps?.resetPanZoom || 'Reset Pan & Zoom'}
            aria-label={dict?.maps?.resetPanAndZoomAria || 'Reset Pan and Zoom'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </footer>

      <TileInspectorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedItem={selectedInspectorItem}
        dict={dict}
      />
    </div>
  );
};
