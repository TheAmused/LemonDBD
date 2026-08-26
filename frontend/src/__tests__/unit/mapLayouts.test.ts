// frontend/src/utils/__tests__/mapLayouts.test.ts
import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DesktopMapLayout } from '@/utils/../components/maps/layouts/DesktopMapLayout';
import { MobileMapLayout } from '@/utils/../components/maps/layouts/MobileMapLayout';
import { MapExplorer } from '@/utils/../components/maps/MapExplorer';
import { getMapImageSrc, handlePopoutImageWindow } from '@/utils/mapUtils';
import type { MapRealm } from '@/types/map';

const mockMaps: MapRealm[] = [
  {
    id: 'hens_azarovs_resting_place',
    name: "Azarov's Resting Place",
    realm: 'Autohaven Wreckers',
    layout_type: 'Dumbbell Narrow',
    jungle_gyms_count: 5,
    totem_spawns_count: 5,
    pallet_density: 'High',
    shack_has_basement: false,
    description: 'Iconic dumbbell-shaped map',
    source: 'hens333',
    callout_image_url: 'https://cdn.example.com/azarov.png',
    clock_system: {
      description: 'Standard 12-clock setup',
      twelve_o_clock: 'Main Building Garage',
      three_o_clock: 'Right Jungle Gym',
      six_o_clock: 'Killer Shack',
      nine_o_clock: 'Left Crane Gym',
    },
  },
  {
    id: 'samoel_coal_tower',
    name: 'Coal Tower',
    realm: 'MacMillan Estate',
    layout_type: '3D Isometric',
    jungle_gyms_count: 4,
    totem_spawns_count: 5,
    pallet_density: 'Medium',
    shack_has_basement: true,
    description: 'Coal Tower Samoel Isometric',
    source: 'samoelcolt',
    callout_image_local_path: 'static/maps/coal_tower.png',
    clock_system: {
      twelve_o_clock: 'Coal Tower Industrial Base',
      three_o_clock: 'East Generator Yard',
      six_o_clock: 'South Shack',
      nine_o_clock: 'West Silo',
    },
  },
  {
    id: 'hens_preschool_i',
    name: 'Preschool I',
    realm: 'Badham Preschool',
    layout_type: 'Suburban Street',
    jungle_gyms_count: 4,
    totem_spawns_count: 5,
    pallet_density: 'High',
    shack_has_basement: true,
    description: 'Badham Variant 1',
    source: 'hens333',
  },
];

const mockGroupedMaps = {
  'Autohaven Wreckers': [mockMaps[0]],
  'MacMillan Estate': [mockMaps[1]],
  'Badham Preschool': [mockMaps[2]],
};

const dummyHandlers = {
  onMouseDown: () => {},
  onMouseMove: () => {},
  onMouseUp: () => {},
  onMouseLeave: () => {},
  onWheel: () => {},
  onTouchStart: () => {},
  onTouchMove: () => {},
  onTouchEnd: () => {},
  onTouchCancel: () => {},
};

// ─── 1. Export Verification ───────────────────────────────────────────────────
test('DesktopMapLayout and MobileMapLayout are exported functions', () => {
  assert.strictEqual(typeof DesktopMapLayout, 'function');
  assert.strictEqual(typeof MobileMapLayout, 'function');
});

// ─── 2. DesktopMapLayout Unit Tests ───────────────────────────────────────────
test('DesktopMapLayout renders 2-column split workspace with sidebar and viewport', () => {
  const html = renderToStaticMarkup(
    React.createElement(DesktopMapLayout, {
      maps: mockMaps,
      groupedMaps: mockGroupedMaps,
      activeMap: mockMaps[0],
      selectedMapId: 'hens_azarovs_resting_place',
      onSelectMapId: () => {},
      uniqueRealms: ['Autohaven Wreckers', 'Badham Preschool', 'MacMillan Estate'],
      selectedRealm: 'all',
      onSelectRealm: () => {},
      search: '',
      onSearchChange: () => {},
      activeSource: 'hens333',
      onSourceChange: () => {},
      variants: ["Azarov's Resting Place"],
      onSelectVariant: () => {},
      loading: false,
      transformStyle: { transform: 'translate(0px, 0px) scale(1)', transition: 'none', cursor: 'grab' },
      isDragging: false,
      zoomLevel: 1.0,
      onZoomIn: () => {},
      onZoomOut: () => {},
      onSetZoom: () => {},
      onResetZoomPan: () => {},
      canvasHandlers: dummyHandlers,
      onLaunchFullscreen: () => {},
      onPopoutImage: () => {},
    })
  );

  assert.ok(html.includes('data-testid="desktop-map-layout"'));
  assert.ok(html.includes('data-testid="desktop-map-sidebar"'));
  assert.ok(html.includes('data-testid="desktop-map-viewport"'));
  assert.ok(html.includes('data-testid="desktop-map-search-input"'));
  assert.ok(html.includes('data-testid="desktop-map-source-hens333"'));
  assert.ok(html.includes('data-testid="desktop-map-source-samoelcolt"'));
  assert.ok(html.includes('data-testid="desktop-map-source-all"'));
  assert.ok(html.includes('data-testid="desktop-map-realm-pill-all"'));
  assert.ok(html.includes('data-testid="desktop-map-realm-pill-autohaven-wreckers"'));
  assert.ok(html.includes('data-testid="desktop-map-header"'));
  assert.ok(html.includes("Azarov&#x27;s Resting Place"));
  assert.ok(html.includes('data-testid="map-canvas-container"'));
  assert.ok(html.includes('data-testid="map-controls-hud"'));
  assert.ok(html.includes('data-testid="map-legend-drawer"'));
});

test('DesktopMapLayout renders variant switcher bar when multiple variants are provided', () => {
  const html = renderToStaticMarkup(
    React.createElement(DesktopMapLayout, {
      maps: mockMaps,
      groupedMaps: mockGroupedMaps,
      activeMap: mockMaps[2],
      selectedMapId: 'hens_preschool_i',
      onSelectMapId: () => {},
      uniqueRealms: ['Autohaven Wreckers', 'Badham Preschool', 'MacMillan Estate'],
      selectedRealm: 'Badham Preschool',
      onSelectRealm: () => {},
      search: 'preschool',
      onSearchChange: () => {},
      activeSource: 'hens333',
      onSourceChange: () => {},
      variants: ['Preschool I', 'Preschool II', 'Preschool III'],
      onSelectVariant: () => {},
      loading: false,
      transformStyle: { transform: 'scale(1)', transition: 'none', cursor: 'grab' },
      isDragging: false,
      zoomLevel: 1.0,
      onZoomIn: () => {},
      onZoomOut: () => {},
      onSetZoom: () => {},
      onResetZoomPan: () => {},
      canvasHandlers: dummyHandlers,
      onLaunchFullscreen: () => {},
      onPopoutImage: () => {},
    })
  );

  assert.ok(html.includes('data-testid="variant-switcher-bar"'));
  assert.ok(html.includes('data-testid="variant-pill-preschool-i"'));
  assert.ok(html.includes('data-testid="variant-pill-preschool-ii"'));
  assert.ok(html.includes('data-testid="variant-pill-preschool-iii"'));
  assert.ok(html.includes('data-testid="desktop-map-fullscreen-btn"'));
  assert.ok(html.includes('data-testid="desktop-map-popout-btn"'));
});

test('DesktopMapLayout handles SamoelColt 3D isometric source and badge display', () => {
  const html = renderToStaticMarkup(
    React.createElement(DesktopMapLayout, {
      maps: mockMaps,
      groupedMaps: mockGroupedMaps,
      activeMap: mockMaps[1],
      selectedMapId: 'samoel_coal_tower',
      onSelectMapId: () => {},
      uniqueRealms: ['Autohaven Wreckers', 'Badham Preschool', 'MacMillan Estate'],
      selectedRealm: 'MacMillan Estate',
      onSelectRealm: () => {},
      search: '',
      onSearchChange: () => {},
      activeSource: 'samoelcolt',
      onSourceChange: () => {},
      variants: [],
      onSelectVariant: () => {},
      loading: false,
      transformStyle: { transform: 'translate(10px, 20px) scale(1.5)', transition: 'none', cursor: 'grab' },
      isDragging: true,
      zoomLevel: 1.5,
      onZoomIn: () => {},
      onZoomOut: () => {},
      onSetZoom: () => {},
      onResetZoomPan: () => {},
      canvasHandlers: dummyHandlers,
    })
  );

  assert.ok(html.includes('SamoelColt Isometric'));
  assert.ok(html.includes('Coal Tower'));
  assert.ok(html.includes('4-Quadrant Sector System (Isometric Scheme)'));
  assert.ok(html.includes('data-testid="desktop-map-controls"'));
});

// ─── 3. MobileMapLayout Unit Tests ────────────────────────────────────────────
test('MobileMapLayout renders map-first viewport, top bar, canvas, floating controls, and bottom sheet', () => {
  const html = renderToStaticMarkup(
    React.createElement(MobileMapLayout, {
      maps: mockMaps,
      groupedMaps: mockGroupedMaps,
      activeMap: mockMaps[1],
      selectedMapId: 'samoel_coal_tower',
      onSelectMapId: () => {},
      uniqueRealms: ['Autohaven Wreckers', 'Badham Preschool', 'MacMillan Estate'],
      selectedRealm: 'all',
      onSelectRealm: () => {},
      search: '',
      onSearchChange: () => {},
      activeSource: 'samoelcolt',
      onSourceChange: () => {},
      variants: ['Coal Tower', 'Ironworks of Misery'],
      onSelectVariant: () => {},
      loading: false,
      transformStyle: { transform: 'scale(1.5)', transition: 'none', cursor: 'grab' },
      isDragging: false,
      zoomLevel: 1.5,
      onZoomIn: () => {},
      onZoomOut: () => {},
      onSetZoom: () => {},
      onResetZoomPan: () => {},
      canvasHandlers: dummyHandlers,
      onLaunchFullscreen: () => {},
      onPopoutImage: () => {},
    })
  );

  assert.ok(html.includes('data-testid="mobile-map-layout"'));
  assert.ok(html.includes('data-testid="mobile-map-topbar"'));
  assert.ok(html.includes('data-testid="mobile-map-source-toggle"'));
  assert.ok(html.includes('data-testid="mobile-map-source-samoelcolt"'));
  assert.ok(html.includes('data-testid="mobile-map-fullscreen-btn"'));
  assert.ok(html.includes('data-testid="variant-switcher-bar"'));
  assert.ok(html.includes('data-testid="map-canvas-container"'));
  assert.ok(html.includes('data-testid="map-controls-hud"'));
  assert.ok(html.includes('data-testid="mobile-map-controls"'));
  assert.ok(html.includes('data-testid="mobile-bottom-sheet"'));
  assert.ok(html.includes('data-testid="mobile-bottom-sheet-toggle"'));
});

test('MobileMapLayout renders fallback and handles null activeMap', () => {
  const html = renderToStaticMarkup(
    React.createElement(MobileMapLayout, {
      maps: [],
      groupedMaps: {},
      activeMap: null,
      selectedMapId: '',
      onSelectMapId: () => {},
      uniqueRealms: [],
      selectedRealm: 'all',
      onSelectRealm: () => {},
      search: '',
      onSearchChange: () => {},
      activeSource: 'all',
      onSourceChange: () => {},
      variants: [],
      onSelectVariant: () => {},
      loading: true,
      transformStyle: { transform: 'scale(1)', transition: 'none', cursor: 'grab' },
      isDragging: false,
      zoomLevel: 1.0,
      onZoomIn: () => {},
      onZoomOut: () => {},
      onSetZoom: () => {},
      onResetZoomPan: () => {},
      canvasHandlers: dummyHandlers,
    })
  );

  assert.ok(html.includes('data-testid="mobile-map-layout"'));
  assert.ok(html.includes('Select a Map'));
  assert.ok(html.includes('Browse All Maps'));
  assert.ok(html.includes('data-testid="map-canvas-fallback"'));
});

// ─── 4. mapUtils Unit Tests ───────────────────────────────────────────────────
test('getMapImageSrc resolves local paths, remote URLs, and fallbacks properly', () => {
  const backend = 'http://test-api.local';
  const backendWithSlash = 'http://test-api.local/';

  // Local path
  const localMap: Partial<MapRealm> = {
    id: 'test_local',
    name: 'Local Map',
    realm: 'Realm',
    callout_image_local_path: 'static/maps/local.png',
  };
  assert.strictEqual(
    getMapImageSrc(localMap, backend),
    'http://test-api.local/static/maps/local.png'
  );
  assert.strictEqual(
    getMapImageSrc(localMap, backendWithSlash),
    'http://test-api.local/static/maps/local.png'
  );

  // Local path with leading slash and static/
  const leadingSlashMap: Partial<MapRealm> = {
    id: 'test_slash',
    name: 'Slash Map',
    realm: 'Realm',
    callout_image_local_path: '/static/maps/slash.png',
  };
  assert.strictEqual(
    getMapImageSrc(leadingSlashMap, backend),
    'http://test-api.local/static/maps/slash.png'
  );

  // Remote URL
  const remoteMap: Partial<MapRealm> = {
    id: 'test_remote',
    name: 'Remote Map',
    realm: 'Realm',
    callout_image_url: 'https://images.example.com/map.jpg',
  };
  assert.strictEqual(getMapImageSrc(remoteMap, backend), 'https://images.example.com/map.jpg');

  // Fallback image_url
  const fallbackMap: Partial<MapRealm> = {
    id: 'test_fallback',
    name: 'Fallback Map',
    realm: 'Realm',
    image_url: 'https://images.example.com/fallback.jpg',
  };
  assert.strictEqual(
    getMapImageSrc(fallbackMap, backend),
    'https://images.example.com/fallback.jpg'
  );

  // Null / undefined handling
  assert.strictEqual(getMapImageSrc(null, backend), '');
  assert.strictEqual(getMapImageSrc(undefined, backend), '');
});

test('handlePopoutImageWindow executes safely in non-browser environment', () => {
  assert.doesNotThrow(() => {
    handlePopoutImageWindow('https://example.com/img.png', 'Test Map');
    handlePopoutImageWindow('', '');
  });
});

// ─── 5. MapExplorer Orchestrator Unit Tests ───────────────────────────────────
test('MapExplorer renders responsive root with desktop and mobile wrappers', () => {
  const html = renderToStaticMarkup(
    React.createElement(MapExplorer, {
      initialMapName: "Azarov's Resting Place",
      selectedSource: 'hens333',
    })
  );

  assert.ok(html.includes('data-testid="map-explorer-root"'));
  assert.ok(html.includes('hidden lg:block'));
  assert.ok(html.includes('block lg:hidden'));
  assert.ok(html.includes('data-testid="desktop-map-layout"'));
  assert.ok(html.includes('data-testid="mobile-map-layout"'));
});

