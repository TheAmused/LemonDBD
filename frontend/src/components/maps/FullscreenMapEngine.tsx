'use client';

import { Button } from '@/components/common/Button';
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { X, ImageOff, Building2, Compass, Home, Maximize2, type LucideIcon } from 'lucide-react';
import type { MapRealm } from '@/types/map';
import { getLayoutTypeLabel, getMapImageSrc } from '@/utils/mapUtils';
import { formatNumber } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import { Surface } from '@/components/common/Surface';
import { CheckIcon } from '@/components/icons/DbdIcons';
import { cn } from '@/utils/cn';

import { Modal } from '@/components/common/Modal';
import { useDictionary } from "@/context/DictionaryContext";
import { Img } from '@/components/common/Img';
import { ZoomControl, type ZoomValue } from '@/components/common/ZoomControl';

/** The zoom steps of the -/+ buttons, in percent of the picture's real size. */
const MAP_ZOOM_STEPS = [25, 50, 75, 100, 150, 200, 300] as const;
const MAX_ZOOM = MAP_ZOOM_STEPS[MAP_ZOOM_STEPS.length - 1];

// ─── Legend ──────────────────────────────────────────────────────────────────
// The map's facts as a legend over the map: surface area, layout, and whether the map has a shack and a
// main building. A card in the corner of the map area, not badges in the header bar. It grows with the
// screen (wide, 2K, 4K) like the picture beside it. On a phone, where there is no free space beside the
// map, it is a strip under the header instead, always open.

const LAYOUT_TONE: Record<string, string> = {
  Indoor: 'text-accent-red',
  Hybrid: 'text-accent-amber',
  Outdoor: 'text-accent-green',
};

const LEGEND_ICON = 'icon-md shrink-0 wide:icon-lg wide-4k:icon-xl';

function LegendRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 wide-2k:gap-3.5">
      <dt className="flex items-center gap-2.5 wide-2k:gap-3.5 type-body-screen text-text-muted">
        <Icon className={cn(LEGEND_ICON, 'text-accent-red')} aria-hidden="true" />
        {label}
      </dt>
      <dd className="ml-auto pl-3 wide-2k:pl-6 type-strong-screen text-text-primary text-right">{children}</dd>
    </div>
  );
}

/** A structure the map has (check) or lacks (cross); the full "Shack" / "No Shack" text is read out. */
function Presence({ present, yes, no }: { present: boolean; yes: string; no: string }) {
  const Icon = present ? CheckIcon : X;
  return (
    <span className="inline-flex">
      <Icon className={cn(LEGEND_ICON, present ? 'text-accent-green' : 'text-text-muted')} aria-hidden="true" />
      <span className="sr-only">{present ? yes : no}</span>
    </span>
  );
}

export const MapDetailsLegend: React.FC<{ map: MapRealm; className?: string }> = ({ map, className }) => {
  const dict = useDictionary();
  const m = dict.maps;

  // Phones: a flat strip under the header, two facts per line, so nothing covers the map. From `sm` up:
  // the card in the corner of the map area, with its title.
  return (
    <Surface
      as="aside"
      aria-label={m.legendTitle}
      tone="elevated"
      padding="none"
      stripOnPhone
      className={cn(
        'px-4 py-2.5',
        'sm:bg-bg-elevated/90 sm:p-4 sm:backdrop-blur-xl sm:shadow-2xl wide-2k:p-5 wide-4k:p-6',
        className
      )}
    >
      <h3 className="max-sm:hidden type-label-screen text-text-muted">{m.legendTitle}</h3>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 sm:mt-3 sm:block sm:space-y-2.5 wide-2k:mt-4 wide-2k:space-y-3.5">
        {map.size_sq_tiles != null && (
          <LegendRow icon={Maximize2} label={m.surfaceArea}>
            {map.size_sq_tiles} {m.sqTilesUnit}
            {map.size_sq_meters != null && (
              <span className="block type-caption-screen text-text-muted">
                {formatMessage(m.sqMetersSuffix, { value: formatNumber(map.size_sq_meters) })}
              </span>
            )}
          </LegendRow>
        )}
        {map.layout_type && (
          <LegendRow icon={Compass} label={m.layoutLabel}>
            <span className={LAYOUT_TONE[map.layout_type] ?? LAYOUT_TONE.Outdoor}>
              {getLayoutTypeLabel(map.layout_type, m)}
            </span>
          </LegendRow>
        )}
        <LegendRow icon={Home} label={m.shackYes}>
          <Presence present={map.is_shack} yes={m.shackYes} no={m.shackNo} />
        </LegendRow>
        <LegendRow icon={Building2} label={m.mainBuildingYes}>
          <Presence present={map.is_main_building} yes={m.mainBuildingYes} no={m.mainBuildingNo} />
        </LegendRow>
      </dl>
    </Surface>
  );
};

interface FullscreenMapEngineProps {
  mapId: number;
  onClose: () => void;
  availableMaps?: MapRealm[];
  backendBase: string;
}

/** The map chrome + pan/zoom engine, without the Modal shell (also what the unit tests render). */
export const FullscreenMapEngineView: React.FC<FullscreenMapEngineProps> = ({ mapId, onClose, availableMaps = [], backendBase }) => {
  const dict = useDictionary();
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const activeMap = useMemo(
    () => availableMaps.find((m) => m.id === mapId) || null,
    [availableMaps, mapId]
  );
  const imageSrc = getMapImageSrc(activeMap, backendBase);

  // Zoom is a percent of the picture's real size, or 'fit' (the whole picture in the map area, which is
  // also how a map opens). Wheel and pinch zoom freely between the smallest step (or Fit, if smaller) and
  // the largest; the -/+ buttons step to the next of MAP_ZOOM_STEPS.
  const [zoom, setZoom] = useState<ZoomValue>('fit');
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState<number>(100);

  // Another map: start from a fresh view. Done while rendering (not in an effect), so the new
  // map never paints with the previous one's zoom and pan first.
  const [viewedMapId, setViewedMapId] = useState(mapId);
  if (viewedMapId !== mapId) {
    setViewedMapId(mapId);
    setImageFailed(false);
    setNatural(null);
    setZoom('fit');
    setPan({ x: 0, y: 0 });
  }

  const fitPercent = natural && box ? Math.min(box.w / natural.w, box.h / natural.h) * 100 : 100;
  const zoomPercent = zoom === 'fit' ? fitPercent : zoom;
  // Fit can be above the largest step (a small picture on a big screen), so it widens both bounds.
  const clampZoom = useCallback(
    (percent: number) =>
      Math.min(Math.max(percent, Math.min(MAP_ZOOM_STEPS[0], fitPercent)), Math.max(MAX_ZOOM, fitPercent)),
    [fitPercent]
  );
  // The wheel listener is attached once, so it reads the latest values from here.
  const zoomRef = useRef({ zoomPercent, clampZoom });
  useEffect(() => {
    zoomRef.current = { zoomPercent, clampZoom };
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef<boolean>(false);

  // The room the picture can fill: the map area minus its padding (the bottom padding keeps the toolbar clear).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (w > 0 && h > 0) setBox((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { zoomPercent: current, clampZoom: clamp } = zoomRef.current;
      setZoom(clamp(current * (e.deltaY < 0 ? 1.15 : 0.85)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  // The picture's real size, from the load event or, for a cached picture that loaded before React
  // attached it, straight from the element.
  const readNatural = useCallback((img: HTMLImageElement | null) => {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const next = { w: img.naturalWidth, h: img.naturalHeight };
    setNatural((prev) => (prev && prev.w === next.w && prev.h === next.h ? prev : next));
  }, []);

  // The picture being panned: the callout <img>.
  const isImageTarget = (target: EventTarget) => (target as Element).closest?.('[data-pan-target]') != null;

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
      setInitialZoom(zoomPercent);
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
      setZoom(clampZoom(initialZoom * (currentDist / initialPinchDistance)));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialPinchDistance(null);
  };

  // Fit and the percent button also bring the picture back to the middle; a -/+ step keeps the pan.
  const handleZoomChange = (next: ZoomValue) => {
    if (next === 'fit') setPan({ x: 0, y: 0 });
    setZoom(next === 'fit' ? next : clampZoom(next));
  };
  const handleZoomReset = () => {
    setPan({ x: 0, y: 0 });
    setZoom(100);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col justify-between overflow-hidden text-text-primary">
      <header className="relative shrink-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 sm:px-6 py-2 sm:py-2.5 bg-bg-primary border-b border-border-color/80 shadow-2xl">
        <span aria-hidden="true" />
        <h2 className="min-w-0 truncate text-center type-page-title text-text-primary">{activeMap?.name}</h2>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="md"
            icon
            data-modal-close
            onClick={onClose}
            aria-label={dict.modal.close}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* In the flow under the header on a phone; over the map's corner from `sm` up. */}
      {activeMap && (
        <MapDetailsLegend map={activeMap} className="relative z-30 shrink-0 sm:absolute sm:left-6 sm:top-20 sm:z-40" />
      )}

      <div
        ref={containerRef}
        // Drag-to-pan for pointers; the zoom and reset buttons below are the keyboard controls.
        role="presentation"
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
        className="relative flex-1 min-h-0 w-full cursor-default overflow-hidden flex items-center justify-center bg-bg-primary pt-4 pb-20 px-4"
      >
        {imageSrc && !imageFailed ? (
          <Img
            data-pan-target
            src={imageSrc}
            alt={activeMap?.name || ''}
            draggable={false}
            ref={readNatural}
            onLoad={(e) => readNatural(e.currentTarget)}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomPercent / 100})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 75ms ease-out',
            }}
            className={`max-w-none shrink-0 select-none shadow-2xl ${natural ? '' : 'invisible'} ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-text-muted">
            <ImageOff className="w-12 h-12" />
            <span className="type-label-sm">
              {dict.maps.noMapsFound}
            </span>
          </div>
        )}
      </div>

      <footer className="absolute inset-x-0 bottom-4 sm:inset-x-auto sm:right-6 z-40 flex justify-center sm:justify-end pointer-events-none">
        <div role="toolbar" aria-label={dict.maps.engineControlsAria} className="pointer-events-auto">
          <ZoomControl
            value={zoom}
            steps={MAP_ZOOM_STEPS}
            onChange={handleZoomChange}
            onReset={handleZoomReset}
            fitValue={fitPercent}
            labels={{
              zoomOut: dict.maps.zoomOut,
              zoomIn: dict.maps.zoomIn,
              reset: dict.maps.zoomReset,
              fit: dict.maps.zoomFit,
              fitHint: dict.maps.zoomFitHint,
            }}
            className="shadow-2xl"
          />
        </div>
      </footer>
    </div>
  );
};

/**
 * Shared fullscreen <Modal> (portal, scroll lock, Escape, focus trap) around the
 * engine. Only the chrome is wrapped: the pan/zoom/pinch engine stays
 * hand-written. The container is offset by the desktop sidebar width
 * (`--sidebar-width`, 0 on mobile) so the sidebar stays reachable, like before.
 */
export const FullscreenMapEngine: React.FC<FullscreenMapEngineProps> = (props) => {
  const dict = useDictionary();
  return (
  <Modal
    isOpen
    onClose={props.onClose}
    variant="fullscreen"
    testId="fullscreen-map-engine"
    ariaLabel={dict.maps.fullscreenEngineAria}
    closeButton="none"
    backdrop="none"
    borderless
    zIndexClassName="z-40 lg:z-30"
    containerClassName="left-[var(--sidebar-width,0rem)] right-0 w-auto transition-[left] duration-300 ease-in-out"
    className="bg-bg-primary"
    bodyClassName="flex flex-col overflow-hidden"
  >
    <FullscreenMapEngineView {...props} />
  </Modal>
  );
};
