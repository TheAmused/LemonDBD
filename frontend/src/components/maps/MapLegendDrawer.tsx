'use client';

import React, { useState } from 'react';
import { Clock, Layers, ChevronDown, ChevronUp, Info } from 'lucide-react';

export interface ClockSystemData {
  description?: string;
  twelve_o_clock?: string;
  three_o_clock?: string;
  six_o_clock?: string;
  nine_o_clock?: string;
}

export interface MapLegendDrawerProps {
  clockSystem?: ClockSystemData;
  source?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  collapsible?: boolean;
  className?: string;
  title?: string;
}

export const MapLegendDrawer: React.FC<MapLegendDrawerProps> = ({
  clockSystem,
  source = 'hens333',
  isOpen: controlledIsOpen,
  onToggle,
  collapsible = false,
  className = '',
  title,
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

  const sectors = [
    {
      label: isSamoel ? 'North Sector' : "12 O'Clock (Top)",
      value: clockSystem?.twelve_o_clock || 'Main Building / Top Spawn',
      badge: isSamoel ? 'N' : '12',
    },
    {
      label: isSamoel ? 'East Sector' : "3 O'Clock (Right)",
      value: clockSystem?.three_o_clock || 'Right Tile / Generator Cluster',
      badge: isSamoel ? 'E' : '3',
    },
    {
      label: isSamoel ? 'South Sector' : "6 O'Clock (Bottom)",
      value: clockSystem?.six_o_clock || 'Killer Shack / Bottom Spawn',
      badge: isSamoel ? 'S' : '6',
    },
    {
      label: isSamoel ? 'West Sector' : "9 O'Clock (Left)",
      value: clockSystem?.nine_o_clock || 'Left Tile / Jungle Gym',
      badge: isSamoel ? 'W' : '9',
    },
  ];

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl backdrop-blur-md overflow-hidden transition-all duration-300 ${className}`}
      data-testid="map-legend-drawer"
    >
      {/* Header Bar */}
      <div
        onClick={collapsible ? handleToggle : undefined}
        className={`flex items-center justify-between p-3.5 md:p-4 border-b border-slate-800/80 ${
          collapsible ? 'cursor-pointer hover:bg-slate-800/40 select-none' : ''
        }`}
        data-testid="map-legend-header"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
              isSamoel
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
            }`}
          >
            {isSamoel ? <Layers className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div>
            <h4 className="text-xs md:text-sm font-extrabold text-slate-100">
              {displayTitle}
            </h4>
            <p className="text-[11px] text-slate-400">
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
            aria-label={isExpanded ? 'Collapse Legend' : 'Expand Legend'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/50 text-slate-400 hover:text-white transition-colors min-h-[36px] min-w-[36px]"
            data-testid="map-legend-toggle-btn"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="p-3.5 md:p-4 space-y-3" data-testid="map-legend-body">
          {/* Optional System Description */}
          {clockSystem?.description && (
            <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
              <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{clockSystem.description}</span>
            </div>
          )}

          {/* 4-Sector / Clock Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {sectors.map((sector) => (
              <div
                key={sector.label}
                className="group relative rounded-xl border border-slate-800/90 bg-slate-950 p-3 md:p-3.5 hover:border-amber-500/40 transition-colors shadow-inner flex flex-col justify-between"
                data-testid={`map-legend-sector-${sector.badge.toLowerCase()}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wider ${
                      isSamoel ? 'text-emerald-400' : 'text-amber-500'
                    }`}
                  >
                    {sector.label}
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-[10px] font-black text-slate-400 font-mono">
                    {sector.badge}
                  </span>
                </div>
                <div className="text-xs md:text-sm font-extrabold text-slate-100 line-clamp-2">
                  {sector.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
