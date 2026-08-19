'use client';
// frontend/src/components/maps/MapExplorer.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { MapRealm } from '@/types/map';
import { useMapExplorerData, type MapSource } from '@/hooks/useMapExplorerData';
import { useMapGestures } from '@/hooks/useMapGestures';
import { handlePopoutImageWindow } from '@/utils/mapUtils';
import { DesktopMapLayout } from './layouts/DesktopMapLayout';
import { MobileMapLayout } from './layouts/MobileMapLayout';
import { FullscreenMapEngine } from './FullscreenMapEngine';

export interface MapExplorerProps {
  initialMapName?: string;
  selectedMap?: { mapName: string; timestamp: number } | string;
  selectedSource?: MapSource;
  onSourceChange?: (source: MapSource) => void;
  onActionTriggered?: (action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => void;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
  triggerAction?:
    | { action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close'; timestamp: number }
    | 'zoom_in'
    | 'zoom_out'
    | 'fullscreen'
    | 'close'
    | null;
}

export const MapExplorer: React.FC<MapExplorerProps> = ({
  initialMapName = '',
  selectedMap,
  selectedSource,
  onSourceChange,
  onActionTriggered,
  onAvailableMapsLoaded,
  triggerAction,
}) => {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);

  const {
    maps,
    loading,
    activeMap,
    selectedMapId,
    selectedRealm,
    setSelectedRealm,
    search,
    setSearch,
    activeSource,
    setActiveSource,
    uniqueRealms,
    groupedMaps,
    variants,
    selectMapById,
    selectVariantByName,
  } = useMapExplorerData({
    initialMapName,
    selectedMap,
    selectedSource,
    onSourceChange,
    onAvailableMapsLoaded,
  });

  const {
    zoomLevel,
    isDragging,
    handleZoomIn,
    handleZoomOut,
    handleSetZoom,
    handleResetZoomPan,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    transformStyle,
  } = useMapGestures({
    onActionTriggered,
  });

  const canvasHandlers = useMemo(
    () => ({
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onWheel: handleWheel,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    }),
    [
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleMouseLeave,
      handleWheel,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleTouchCancel,
    ]
  );

  useEffect(() => {
    handleResetZoomPan();
  }, [selectedMapId, handleResetZoomPan]);

  useEffect(() => {
    if (!triggerAction) return;
    const action = typeof triggerAction === 'object' ? triggerAction.action : triggerAction;
    if (action === 'zoom_in') {
      handleZoomIn();
    } else if (action === 'zoom_out') {
      handleZoomOut();
    } else if (action === 'fullscreen') {
      setIsFullscreenOpen(true);
    } else if (action === 'close') {
      setIsFullscreenOpen(false);
    }
  }, [triggerAction, handleZoomIn, handleZoomOut]);

  useEffect(() => {
    if (!isFullscreenOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreenOpen(false);
        onActionTriggered?.('close');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenOpen, onActionTriggered]);

  const handlePopoutImage = useCallback((url: string, title: string) => {
    handlePopoutImageWindow(url, title);
  }, []);

  return (
    <div className="w-full space-y-6" data-testid="map-explorer-root">
      <div className="hidden lg:block">
        <DesktopMapLayout
          maps={maps}
          groupedMaps={groupedMaps}
          activeMap={activeMap}
          selectedMapId={selectedMapId}
          onSelectMapId={selectMapById}
          uniqueRealms={uniqueRealms}
          selectedRealm={selectedRealm}
          onSelectRealm={setSelectedRealm}
          search={search}
          onSearchChange={setSearch}
          activeSource={activeSource}
          onSourceChange={setActiveSource}
          variants={variants}
          onSelectVariant={selectVariantByName}
          loading={loading}
          transformStyle={transformStyle}
          isDragging={isDragging}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onSetZoom={handleSetZoom}
          onResetZoomPan={handleResetZoomPan}
          canvasHandlers={canvasHandlers}
          onLaunchFullscreen={() => {
            setIsFullscreenOpen(true);
            onActionTriggered?.('fullscreen');
          }}
          onPopoutImage={handlePopoutImage}
        />
      </div>

      <div className="block lg:hidden">
        <MobileMapLayout
          maps={maps}
          groupedMaps={groupedMaps}
          activeMap={activeMap}
          selectedMapId={selectedMapId}
          onSelectMapId={selectMapById}
          uniqueRealms={uniqueRealms}
          selectedRealm={selectedRealm}
          onSelectRealm={setSelectedRealm}
          search={search}
          onSearchChange={setSearch}
          activeSource={activeSource}
          onSourceChange={setActiveSource}
          variants={variants}
          onSelectVariant={selectVariantByName}
          loading={loading}
          transformStyle={transformStyle}
          isDragging={isDragging}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onSetZoom={handleSetZoom}
          onResetZoomPan={handleResetZoomPan}
          canvasHandlers={canvasHandlers}
          onLaunchFullscreen={() => {
            setIsFullscreenOpen(true);
            onActionTriggered?.('fullscreen');
          }}
          onPopoutImage={handlePopoutImage}
        />
      </div>

      {isFullscreenOpen && activeMap && (
        <FullscreenMapEngine
          mapId={activeMap.id}
          availableMaps={maps}
          onSelectMapId={(id) => {
            selectMapById(id);
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
