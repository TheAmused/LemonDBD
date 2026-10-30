'use client';
// frontend/src/components/admin/VectorMapTestModal.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Compass, Info } from 'lucide-react';
import { MapIcon } from '@/components/icons/DbdIcons';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { FieldLabel, Select } from '@/components/common/Field';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Surface } from '@/components/common/Surface';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import { fetchMapLayout, fetchMapsForTesting } from '@/services/adminApi';
import { MapLayoutView } from '@/components/maps/MapLayoutView';
import { MapLegend } from '@/components/maps/MapLegend';
import { getErrorMessage } from '@/utils/api';
import { formatNumber } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import type { MapLayout, MapRealm } from '@/types/map';

export interface VectorMapTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface VectorMapTestBodyProps {
  maps: MapRealm[];
  selectedMapId: number | null;
  onSelectMapId: (id: number) => void;
  layout: MapLayout | null;
  floorIndex: number;
  onSelectFloorIndex: (index: number) => void;
  isLegendOpen: boolean;
  onToggleLegend: () => void;
  onCloseLegend: () => void;
  loadingMaps: boolean;
  loadingLayout: boolean;
  error: string | null;
}

export function VectorMapTestBody({
  maps,
  selectedMapId,
  onSelectMapId,
  layout,
  floorIndex,
  onSelectFloorIndex,
  isLegendOpen,
  onToggleLegend,
  onCloseLegend,
  loadingMaps,
  loadingLayout,
  error,
}: VectorMapTestBodyProps) {
  const dict = useDictionary();
  const t = dict.admin;
  const mapsDict = dict.maps;

  const activeMap = useMemo(
    () => maps.find((m) => m.id === selectedMapId) || null,
    [maps, selectedMapId]
  );

  const activeFloorLandmarks = useMemo(
    () => layout?.floors[floorIndex]?.landmarks,
    [layout, floorIndex]
  );

  const mapOptions = useMemo(
    () =>
      maps.map((m) => ({
        value: String(m.id),
        label: `${m.name} (${m.realm || 'No Realm'})`,
      })),
    [maps]
  );

  return (
    <div className="space-y-4" data-testid="vector-map-test-modal">
      {/* Intro description */}
      <p className="type-body text-text-muted">{t.vectorMapTestDesc}</p>

      {/* Map Selector & Stats Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-color bg-bg-surface p-3 sm:p-4">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <FieldLabel htmlFor="admin-vector-map-select">{t.vectorMapSelect}</FieldLabel>
          <Select
            id="admin-vector-map-select"
            aria-label={t.vectorMapSelect}
            value={selectedMapId ? String(selectedMapId) : ''}
            onChange={(e) => onSelectMapId(Number(e.target.value))}
            disabled={loadingMaps}
          >
            {mapOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        {activeMap && (
          <div className="flex flex-wrap items-center gap-2 type-caption text-text-muted">
            {activeMap.size_sq_tiles != null && (
              <Surface tone="elevated" padding="none" className="inline-flex items-center gap-1.5 px-2.5 py-1">
                <Compass className="icon-xs text-accent-red shrink-0" aria-hidden="true" />
                <span className="type-strong text-text-primary">{activeMap.size_sq_tiles}</span>
                <span className="text-accent-red font-bold">{mapsDict.sqTilesUnit}</span>
                {activeMap.size_sq_meters != null && (
                  <span className="text-text-muted type-micro">
                    ({formatMessage(mapsDict.sqMetersSuffix, { value: formatNumber(activeMap.size_sq_meters) })})
                  </span>
                )}
              </Surface>
            )}

            {layout && layout.floors.length > 1 && (
              <SegmentedControl<string>
                size="sm"
                ariaLabel={mapsDict.floorAria}
                value={String(floorIndex)}
                onChange={(v) => onSelectFloorIndex(Number(v))}
                options={layout.floors.map((f, i) => ({
                  value: String(i),
                  label:
                    f.label === 'upper'
                      ? mapsDict.floorUpper
                      : f.label === 'lower'
                      ? mapsDict.floorLower
                      : `${mapsDict.floorAria} ${i + 1}`,
                }))}
              />
            )}

            {layout && (
              <Button
                variant="ghost"
                size="sm"
                icon
                onClick={onToggleLegend}
                aria-label={mapsDict.legendToggleAria}
                aria-pressed={isLegendOpen}
                className={isLegendOpen ? 'text-accent-red bg-accent-red/10 hover:bg-accent-red/20' : undefined}
                {...tip(mapsDict.legendTitle, undefined, 'action')}
              >
                <Info aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Live Vector Layout Rendering Area */}
      <div className="relative min-h-80 sm:min-h-112 w-full rounded-card border border-border-color bg-bg-primary overflow-hidden flex items-center justify-center p-4">
        {loadingLayout ? (
          <div className="flex flex-col items-center gap-2 type-body text-text-muted">
            <MapIcon className="icon-md animate-pulse text-accent-red" aria-hidden="true" />
            <span>{t.vectorMapLoading}</span>
          </div>
        ) : error ? (
          <p role="alert" className="type-body text-accent-red text-center px-4">
            {error}
          </p>
        ) : layout ? (
          <>
            <MapLayoutView
              layout={layout}
              floorIndex={floorIndex}
              title={activeMap?.name || ''}
              className="h-full w-full max-h-128 object-contain"
            />
            <MapLegend
              isOpen={isLegendOpen}
              onClose={onCloseLegend}
              landmarks={activeFloorLandmarks}
            />
          </>
        ) : (
          <p className="type-body text-text-muted text-center px-4">
            {t.vectorMapNoLayout}
          </p>
        )}
      </div>

      {layout && (layout.approx || layout.landmarks_approx) && (
        <p className="type-micro text-text-muted">
          {layout.approx ? mapsDict.layoutApprox : mapsDict.landmarksApprox}
        </p>
      )}
    </div>
  );
}

export function VectorMapTestModal({ isOpen, onClose }: VectorMapTestModalProps) {
  const dict = useDictionary();
  const t = dict.admin;

  const [maps, setMaps] = useState<MapRealm[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [layout, setLayout] = useState<MapLayout | null>(null);
  const [floorIndex, setFloorIndex] = useState(0);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load LemonDBD maps on modal open
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setLoadingMaps(true);
        setError(null);
      }
    });

    fetchMapsForTesting('lemondbd')
      .then((res) => {
        if (!active) return;
        const list = res.maps || [];
        setMaps(list);
        if (list.length > 0 && selectedMapId === null) {
          setSelectedMapId(list[0].id);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(getErrorMessage(err, t.networkError));
      })
      .finally(() => {
        if (active) setLoadingMaps(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, selectedMapId, t.networkError]);

  // Load layout on map selection
  useEffect(() => {
    if (!isOpen || selectedMapId === null) return;
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setLoadingLayout(true);
        setError(null);
        setFloorIndex(0);
      }
    });

    fetchMapLayout(selectedMapId)
      .then((res) => {
        if (!active) return;
        setLayout(res.layout);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLayout(null);
        setError(getErrorMessage(err, t.vectorMapNoLayout));
      })
      .finally(() => {
        if (active) setLoadingLayout(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, selectedMapId, t.vectorMapNoLayout]);

  const handleSelectMap = useCallback((id: number) => {
    setSelectedMapId(id);
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="5xl"
      title={t.vectorMapTest}
      testId="vector-map-test-modal"
    >
      <VectorMapTestBody
        maps={maps}
        selectedMapId={selectedMapId}
        onSelectMapId={handleSelectMap}
        layout={layout}
        floorIndex={floorIndex}
        onSelectFloorIndex={setFloorIndex}
        isLegendOpen={isLegendOpen}
        onToggleLegend={() => setIsLegendOpen((prev) => !prev)}
        onCloseLegend={() => setIsLegendOpen(false)}
        loadingMaps={loadingMaps}
        loadingLayout={loadingLayout}
        error={error}
      />
    </Modal>
  );
}
