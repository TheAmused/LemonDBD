// frontend/src/components/maps/MapExplorer.tsx
'use client';

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

  // 1. Manage Map Data, Search, Filtering and Variants
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

  // 2. Manage Pan, Zoom & Touch Gestures
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

  // Canvas Handlers Package for Child Layouts
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

  // Reset Zoom & Pan on Map Selection change
  useEffect(() => {
    handleResetZoomPan();
  }, [selectedMapId, handleResetZoomPan]);

  // Handle external or voice trigger actions (zoom_in, zoom_out, fullscreen, close)
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

  // Keyboard Escape listener for fullscreen interactive engine
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

  // Popout image window handler
  const handlePopoutImage = useCallback((url: string, title: string) => {
    handlePopoutImageWindow(url, title);
  }, []);

  return (
    <div className="w-full space-y-6" data-testid="map-explorer-root">
      {/* Desktop Responsive Layout (hidden on mobile/tablet) */}
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

      {/* Mobile Responsive Layout (visible on mobile/tablet) */}
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

      {/* Fullscreen 2D Interactive Engine Modal */}
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
