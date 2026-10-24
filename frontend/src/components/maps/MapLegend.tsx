'use client';
// frontend/src/components/maps/MapLegend.tsx
import React, { useMemo, useEffect } from 'react';
import { X, Building2, Home, Compass } from 'lucide-react';
import type { MapLandmark } from '@/types/map';
import { useDictionary } from '@/context/DictionaryContext';
import { Button } from '@/components/common/Button';
import { getFeatureLandmarkName } from '@/utils/mapLandmarkLabels';
import { cn } from '@/utils/cn';

export interface MapLegendProps {
  landmarks?: readonly MapLandmark[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * Interactive map legend overlay.
 * Displays icons and localized labels for core structures (Main Building, Killer Shack),
 * explanation of the 12-clock competitive callouts, and localized names for active
 * feature landmarks on the current floor.
 */
export const MapLegend: React.FC<MapLegendProps> = ({
  landmarks,
  isOpen,
  onClose,
  className,
}) => {
  const dict = useDictionary();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const featureCodes = useMemo(() => {
    if (!landmarks || landmarks.length === 0) return [];
    const codes = new Set<string>();
    for (const lm of landmarks) {
      if (lm.kind === 'feature' && lm.label) {
        codes.add(lm.label);
      }
    }
    return Array.from(codes);
  }, [landmarks]);

  if (!isOpen) return null;

  return (
    <section
      data-legend-panel
      aria-label={dict.maps.legendTitle}
      className={cn(
        'absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-72 sm:w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100%-2rem)]',
        'flex flex-col overflow-hidden rounded-card border border-border-color bg-bg-elevated/95 backdrop-blur-md shadow-2xl',
        'pointer-events-auto select-none transition-opacity duration-150',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-color/80 px-3.5 py-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
          {dict.maps.legendTitle}
        </h3>
        <Button
          variant="ghost"
          size="xs"
          icon
          onClick={onClose}
          aria-label={dict.modal.close}
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
        {/* Core structures */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control bg-accent-red/15 text-accent-red border border-accent-red/30">
              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span className="text-text-primary font-medium">{dict.maps.mainBuildingYes}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control bg-bg-surface border border-border-color text-text-primary">
              <Home className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span className="text-text-primary font-medium">{dict.maps.shackYes}</span>
          </div>
        </div>

        {/* Clock callouts */}
        <div className="border-t border-border-color/60 pt-3 space-y-1">
          <div className="flex items-center gap-1.5 text-text-primary font-semibold">
            <Compass className="w-3.5 h-3.5 text-accent-amber shrink-0" aria-hidden="true" />
            <span>{dict.maps.legendClockTitle}</span>
          </div>
          <p className="type-micro text-text-secondary leading-relaxed pl-5">
            {dict.maps.legendClockDesc}
          </p>
        </div>

        {/* Floor features (if any) */}
        {featureCodes.length > 0 && (
          <div className="border-t border-border-color/60 pt-3 space-y-2">
            <h4 className="type-micro font-bold uppercase tracking-wider text-text-muted">
              {dict.maps.legendFeatures}
            </h4>
            <div className="space-y-1.5">
              {featureCodes.map((code) => {
                const fullName = getFeatureLandmarkName(code, dict);
                return (
                  <div key={code} className="flex items-center gap-2">
                    <span className="inline-flex min-w-8 h-5 items-center justify-center px-1.5 rounded-control bg-bg-surface border border-border-color text-text-primary font-mono type-micro font-bold shrink-0">
                      {code}
                    </span>
                    <span className="text-text-secondary type-micro font-medium truncate" title={fullName}>
                      {fullName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
