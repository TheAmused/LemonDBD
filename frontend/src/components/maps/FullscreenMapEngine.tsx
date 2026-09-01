'use client';
// frontend/src/components/maps/FullscreenMapEngine.tsx

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ImageOff } from 'lucide-react';
import type { MapRealm } from '@/types/map';
import type { Dictionary } from '@/locales/types';
import { getMapImageSrc } from '@/utils/mapUtils';

interface FullscreenMapEngineProps {
  mapId: string;
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dict?.maps?.fullscreenEngineAria || ''}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden select-none text-slate-100"
    >
      <header className="absolute top-0 inset-x-0 z-40 h-20 px-4 bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-transparent backdrop-blur-md flex items-center justify-between gap-4 border-b border-slate-800/50">
        {activeMap && (
          <div>
            <h1 className="text-base font-extrabold text-white tracking-wide">{activeMap.name}</h1>
            <span className="text-xs text-amber-400/90 font-medium">{activeMap.realm}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label={dict?.modal?.close || ''}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 border-2 border-slate-700 text-slate-300 hover:text-white hover:border-rose-500 hover:bg-rose-950 transition-all shadow-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

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
        className="relative flex-1 w-full h-full cursor-default overflow-hidden flex items-center justify-center bg-slate-950 pt-20 pb-24 px-6"
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
            className={`max-w-full max-h-full object-contain select-none shadow-2xl ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <ImageOff className="w-12 h-12" />
            <span className="text-xs font-bold uppercase tracking-wide">{dict?.maps?.noMapsFound || ''}</span>
          </div>
        )}
      </div>

      <footer className="absolute bottom-6 inset-x-6 z-40 flex items-center justify-end pointer-events-none">
        <div
          role="toolbar"
          aria-label={dict?.maps?.engineControlsAria || ''}
          className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl backdrop-blur-xl shadow-2xl"
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
            title={dict?.maps?.zoomOut || ''}
            aria-label={dict?.maps?.zoomOutAria || ''}
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold text-amber-400 px-2 min-w-[50px] text-center">
            {Math.round(zoom * 100)}{dict?.maps?.percentSign || '%'}
          </span>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.2, 5.0))}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
            title={dict?.maps?.zoomIn || ''}
            aria-label={dict?.maps?.zoomInAria || ''}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-800 my-auto" />

          <button
            type="button"
            onClick={handleResetView}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
            title={dict?.maps?.resetPanZoom || ''}
            aria-label={dict?.maps?.resetPanAndZoomAria || ''}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
