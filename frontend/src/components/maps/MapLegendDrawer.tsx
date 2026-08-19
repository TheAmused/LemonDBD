'use client';
// frontend/src/components/maps/MapLegendDrawer.tsx

import React, { useState } from 'react';
import { Clock, Layers, ChevronDown, ChevronUp, Info, Compass } from 'lucide-react';
import { getMapLandmarks, MapLandmarks } from '@/utils/mapLandmarks';

export interface ClockSystemData {
  description?: string;
  twelve_o_clock?: string;
  three_o_clock?: string;
  six_o_clock?: string;
  nine_o_clock?: string;
  center?: string;
}

export interface MapLegendDrawerProps {
  clockSystem?: ClockSystemData;
  source?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  collapsible?: boolean;
  className?: string;
  title?: string;
  mapName?: string;
  realmName?: string;
}

const GENERIC_PLACEHOLDERS: ReadonlySet<string> = new Set([
  'north sector',
  'east sector',
  'south sector',
  'west sector',
  'main building / top spawn',
  'right tile / generator cluster',
  'killer shack / bottom spawn',
  'left tile / jungle gym',
  'main building',
  'top spawn',
  'bottom spawn',
  'left tile',
  'right tile',
]);

const isGenericOrMissing = (val?: string): boolean => {
  if (!val || typeof val !== 'string' || !val.trim()) return true;
  return GENERIC_PLACEHOLDERS.has(val.trim().toLowerCase());
};

export const MapLegendDrawer: React.FC<MapLegendDrawerProps> = ({
  clockSystem,
  source = 'hens333',
  isOpen: controlledIsOpen,
  onToggle,
  collapsible = false,
  className = '',
  title,
  mapName,
  realmName,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(true);

  const isControlled = controlledIsOpen !== undefined;
  const isExpanded = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    }
    if (!isControlled) {
      setInternalIsOpen((prev) => !prev);
    }
  };

  const isSamoel = source === 'samoelcolt';

  const defaultTitle = isSamoel
    ? '4-Quadrant Sector System (Isometric Scheme)'
    : '12-Clock Callout System (Hens333 Navigation)';

  const displayTitle = title || defaultTitle;

  const fallbackLandmarks: MapLandmarks = getMapLandmarks(mapName, realmName, source);

  const twelveVal = isGenericOrMissing(clockSystem?.twelve_o_clock)
    ? fallbackLandmarks.twelve_o_clock
    : clockSystem?.twelve_o_clock ?? fallbackLandmarks.twelve_o_clock;

  const threeVal = isGenericOrMissing(clockSystem?.three_o_clock)
    ? fallbackLandmarks.three_o_clock
    : clockSystem?.three_o_clock ?? fallbackLandmarks.three_o_clock;

  const sixVal = isGenericOrMissing(clockSystem?.six_o_clock)
    ? fallbackLandmarks.six_o_clock
    : clockSystem?.six_o_clock ?? fallbackLandmarks.six_o_clock;

  const nineVal = isGenericOrMissing(clockSystem?.nine_o_clock)
    ? fallbackLandmarks.nine_o_clock
    : clockSystem?.nine_o_clock ?? fallbackLandmarks.nine_o_clock;

  const centerVal = !isGenericOrMissing(clockSystem?.center)
    ? clockSystem?.center ?? fallbackLandmarks.center
    : fallbackLandmarks.center;

  const descriptionVal = clockSystem?.description || fallbackLandmarks.description;

  const sectors = [
    {
      label: isSamoel ? 'North Sector' : "12 O'Clock (Top)",
      value: twelveVal,
      badge: isSamoel ? 'N' : '12',
    },
    {
      label: isSamoel ? 'East Sector' : "3 O'Clock (Right)",
      value: threeVal,
      badge: isSamoel ? 'E' : '3',
    },
    {
      label: isSamoel ? 'South Sector' : "6 O'Clock (Bottom)",
      value: sixVal,
      badge: isSamoel ? 'S' : '6',
    },
    {
      label: isSamoel ? 'West Sector' : "9 O'Clock (Left)",
      value: nineVal,
      badge: isSamoel ? 'W' : '9',
    },
  ];

  return (
    <section
      aria-label="Map Sector Legend"
      className={`rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm dark:shadow-xl backdrop-blur-md overflow-hidden transition-all duration-300 ${className}`}
      data-testid="map-legend-drawer"
    >
      <div
        onClick={collapsible ? handleToggle : undefined}
        className={`flex items-center justify-between p-3.5 md:p-4 border-b border-slate-200 dark:border-slate-800/80 ${
          collapsible ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 select-none' : ''
        }`}
        data-testid="map-legend-header"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
              isSamoel
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isSamoel ? <Layers className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div>
            <h4 className="text-xs md:text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {displayTitle}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isSamoel
                ? 'Steam Workshop 3D Isometric Map Reference'
                : 'Clockwise navigation callouts for team callouts'}
            </p>
          </div>
        </div>

        {collapsible && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse Legend' : 'Expand Legend'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800/50 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors min-h-[36px] min-w-[36px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            data-testid="map-legend-toggle-btn"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="p-3.5 md:p-4 space-y-3" data-testid="map-legend-body">
          {descriptionVal && (
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-3 text-xs text-slate-700 dark:text-slate-300 shadow-inner">
              <Info className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>{descriptionVal}</span>
            </div>
          )}

          {centerVal && (
            <div
              className={`rounded-xl border p-3 md:p-3.5 flex items-center justify-between gap-3 shadow-inner ${
                isSamoel
                  ? 'border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
              }`}
              data-testid="map-legend-sector-center"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-lg border text-[11px] font-black font-mono shrink-0 ${
                    isSamoel
                      ? 'border-emerald-500/50 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                      : 'border-amber-500/50 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  <Compass className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <span
                    className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wider block ${
                      isSamoel ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-500'
                    }`}
                  >
                    Center Landmark / Objective
                  </span>
                  <div className="text-xs md:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    {centerVal}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {sectors.map((sector) => (
              <div
                key={sector.label}
                className="group relative rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50 dark:bg-slate-950 p-3 md:p-3.5 hover:border-amber-500/40 transition-colors shadow-inner flex flex-col justify-between"
                data-testid={`map-legend-sector-${sector.badge.toLowerCase()}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wider ${
                      isSamoel ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-500'
                    }`}
                  >
                    {sector.label}
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-black text-slate-600 dark:text-slate-400 font-mono shadow-sm">
                    {sector.badge}
                  </span>
                </div>
                <div className="text-xs md:text-sm font-extrabold text-slate-900 dark:text-slate-100 line-clamp-2">
                  {sector.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
