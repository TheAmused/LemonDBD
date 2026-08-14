import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapCanvas } from '../../components/maps/MapCanvas';
import { MapControls } from '../../components/maps/MapControls';
import { VariantSwitcherBar } from '../../components/maps/VariantSwitcherBar';
import { MapLegendDrawer } from '../../components/maps/MapLegendDrawer';
import { MapDirectoryList } from '../../components/maps/MapDirectoryList';
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

// ─── 1. Export Verification ───────────────────────────────────────────────────
test('All modular map UI sub-components are exported functions', () => {
  assert.strictEqual(typeof MapCanvas, 'function');
  assert.strictEqual(typeof MapControls, 'function');
  assert.strictEqual(typeof VariantSwitcherBar, 'function');
  assert.strictEqual(typeof MapLegendDrawer, 'function');
  assert.strictEqual(typeof MapDirectoryList, 'function');
});

// ─── 2. MapCanvas Component Unit Tests ────────────────────────────────────────
test('MapCanvas renders container with transform style and image rendering optimization', () => {
  const html = renderToStaticMarkup(
    React.createElement(MapCanvas, {
      imageUrl: 'https://cdn.example.com/azarov.png',
      mapName: "Azarov's Resting Place",
      realmName: 'Autohaven Wreckers',
      transformStyle: { transform: 'translate(10px, 20px) scale(1.5)', cursor: 'grab' },
      isDragging: false,
      imageAlignment: 'center',
      showPanHint: true,
    })
  );

  assert.ok(html.includes('data-testid="map-canvas-container"'));
  assert.ok(html.includes('cursor-grab'));
  assert.ok(html.includes('data-testid="map-canvas-viewport"'));
  assert.ok(html.includes('translate(10px, 20px) scale(1.5)'));
  assert.ok(html.includes('data-testid="map-canvas-image"'));
  assert.ok(html.includes('src="https://cdn.example.com/azarov.png"'));
  assert.ok(html.includes('image-rendering:-webkit-optimize-contrast'));
  assert.ok(html.includes('data-testid="map-canvas-pan-hint"'));
  assert.ok(html.includes('Drag to pan • Scroll to zoom'));
});

test('MapCanvas renders fallback state and left alignment when no imageUrl is provided', () => {
  const html = renderToStaticMarkup(
    React.createElement(MapCanvas, {
      imageUrl: '',
      mapName: 'Unknown Realm Map',
      isDragging: true,
      imageAlignment: 'left',
      showPanHint: false,
    })
  );

  assert.ok(html.includes('cursor-grabbing'));
  assert.ok(html.includes('justify-start'));
  assert.ok(html.includes('data-testid="map-canvas-fallback"'));
  assert.ok(html.includes('No diagram available'));
  assert.ok(html.includes('Diagram for Unknown Realm Map is not yet available.'));
  assert.ok(!html.includes('data-testid="map-canvas-pan-hint"'));
});

// ─── 3. MapControls Component Unit Tests ──────────────────────────────────────
test('MapControls renders zoom percentage and control elements', () => {
  const html = renderToStaticMarkup(
    React.createElement(MapControls, {
      zoomLevel: 1.5,
      onZoomIn: () => {},
      onZoomOut: () => {},
      onSetZoom: () => {},
      onReset: () => {},
      onFullscreen: () => {},
      onPopout: () => {},
      layoutMode: 'horizontal',
      showPresets: true,
    })
  );

  assert.ok(html.includes('data-testid="map-controls-hud"'));
  assert.ok(html.includes('data-testid="map-controls-zoom-level"'));
  assert.ok(html.includes('150%'));
  assert.ok(html.includes('data-testid="map-controls-zoom-in"'));
  assert.ok(html.includes('min-h-[44px]'));
  assert.ok(html.includes('data-testid="map-controls-zoom-out"'));
  assert.ok(html.includes('data-testid="map-controls-presets"'));
  assert.ok(html.includes('data-testid="map-controls-preset-fit"'));
  assert.ok(html.includes('data-testid="map-controls-preset-100"'));
  assert.ok(html.includes('data-testid="map-controls-preset-150"'));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes('data-testid="map-controls-preset-200"'));
  assert.ok(html.includes('data-testid="map-controls-reset"'));
  assert.ok(html.includes('data-testid="map-controls-fullscreen"'));
  assert.ok(html.includes('data-testid="map-controls-popout"'));
});

test('MapControls dispatches zoom, preset, and view control events', () => {
  let zoomInCalled = false;
  let zoomOutCalled = false;
  let resetCalled = false;
  let fullscreenCalled = false;
  let popoutCalled = false;
  let targetZoom = 0;

  const element = React.createElement(MapControls, {
    zoomLevel: 1.5,
    onZoomIn: () => {
      zoomInCalled = true;
    },
    onZoomOut: () => {
      zoomOutCalled = true;
    },
    onSetZoom: (lvl) => {
      targetZoom = lvl;
    },
    onReset: () => {
      resetCalled = true;
    },
    onFullscreen: () => {
      fullscreenCalled = true;
    },
    onPopout: () => {
      popoutCalled = true;
    },
    layoutMode: 'horizontal',
    showPresets: true,
  });

  const rendered = (MapControls as any)(element.props);
  const children = React.Children.toArray(rendered.props.children);

  // Zoom In
  const zoomInBtn = children.find((c: any) => c?.props?.['data-testid'] === 'map-controls-zoom-in') as any;
  zoomInBtn.props.onClick();
  assert.strictEqual(zoomInCalled, true);

  // Zoom Out
  const zoomOutBtn = children.find((c: any) => c?.props?.['data-testid'] === 'map-controls-zoom-out') as any;
  zoomOutBtn.props.onClick();
  assert.strictEqual(zoomOutCalled, true);

  // Presets
  const presets = children.find((c: any) => c?.props?.['data-testid'] === 'map-controls-presets') as any;
  const presetChildren = React.Children.toArray(presets.props.children);
  const preset100 = presetChildren.find((c: any) => c?.props?.['data-testid'] === 'map-controls-preset-100') as any;
  preset100.props.onClick();
  assert.strictEqual(targetZoom, 1.0);

  const preset200 = presetChildren.find((c: any) => c?.props?.['data-testid'] === 'map-controls-preset-200') as any;
  preset200.props.onClick();
  assert.strictEqual(targetZoom, 2.0);

  // Reset
  const resetBtn = children.find((c: any) => c?.props?.['data-testid'] === 'map-controls-reset') as any;
  resetBtn.props.onClick();
  assert.strictEqual(resetCalled, true);

  // Fullscreen & Popout
  const fsBtn = children.find((c: any) => c?.props?.['data-testid'] === 'map-controls-fullscreen') as any;
  fsBtn.props.onClick();
  assert.strictEqual(fullscreenCalled, true);

  const popoutBtn = children.find((c: any) => c?.props?.['data-testid'] === 'map-controls-popout') as any;
  popoutBtn.props.onClick();
  assert.strictEqual(popoutCalled, true);
});

test('MapControls supports vertical and compact layout modes', () => {
  const verticalHtml = renderToStaticMarkup(
    React.createElement(MapControls, {
      zoomLevel: 1.0,
      onZoomIn: () => {},
      onZoomOut: () => {},
      onSetZoom: () => {},
      onReset: () => {},
      layoutMode: 'vertical',
    })
  );
  assert.ok(verticalHtml.includes('flex-col'));

  const compactHtml = renderToStaticMarkup(
    React.createElement(MapControls, {
      zoomLevel: 1.0,
      onZoomIn: () => {},
      onZoomOut: () => {},
      onSetZoom: () => {},
      onReset: () => {},
      layoutMode: 'compact',
    })
  );
  assert.ok(!compactHtml.includes('data-testid="map-controls-presets"'));
});

// ─── 4. VariantSwitcherBar Component Unit Tests ───────────────────────────────
test('VariantSwitcherBar returns null if variants.length <= 1', () => {
  const emptyHtml = renderToStaticMarkup(
    React.createElement(VariantSwitcherBar, {
      variants: [],
      activeMapName: 'Coal Tower',
      onSelectVariant: () => {},
    })
  );
  assert.strictEqual(emptyHtml, '');

  const singleHtml = renderToStaticMarkup(
    React.createElement(VariantSwitcherBar, {
      variants: ['Dead Dawg Saloon'],
      activeMapName: 'Dead Dawg Saloon',
      onSelectVariant: () => {},
    })
  );
  assert.strictEqual(singleHtml, '');
});

test('VariantSwitcherBar highlights active variant and triggers selection callback', () => {
  let selected = '';
  const variants = ['Preschool I', 'Preschool II', 'Preschool III'];

  const element = React.createElement(VariantSwitcherBar, {
    variants,
    activeMapName: 'Preschool II',
    onSelectVariant: (v: string) => {
      selected = v;
    },
  });

  const html = renderToStaticMarkup(element);
  assert.ok(html.includes('data-testid="variant-switcher-bar"'));
  assert.ok(html.includes('Map Variants:'));
  assert.ok(html.includes('data-testid="variant-pill-preschool-i"'));
  assert.ok(html.includes('data-testid="variant-pill-preschool-ii"'));
  assert.ok(html.includes('data-testid="variant-pill-preschool-iii"'));
  assert.ok(html.includes('data-testid="variant-active-check"'));

  // Test event dispatching
  const rendered = (VariantSwitcherBar as any)(element.props);
  const children = React.Children.toArray(rendered.props.children);
  const buttonsContainer = children[1] as any;
  const buttons = React.Children.toArray(buttonsContainer.props.children);

  assert.strictEqual(buttons.length, 3);
  const btn1 = buttons[0] as any;
  assert.strictEqual(btn1.props['aria-pressed'], false);

  const btn2 = buttons[1] as any;
  assert.strictEqual(btn2.props['aria-pressed'], true);

  const btn3 = buttons[2] as any;
  btn3.props.onClick();
  assert.strictEqual(selected, 'Preschool III');
});

// ─── 5. MapLegendDrawer Component Unit Tests ──────────────────────────────────
test('MapLegendDrawer renders 4-sector system with Hens333 clock labels and description', () => {
  const clockSystem = {
    description: 'Azarov 12-clock layout callouts',
    twelve_o_clock: 'Main Garage',
    three_o_clock: 'Crane Jumble',
    six_o_clock: 'Killer Shack',
    nine_o_clock: 'Tree Line',
  };

  const html = renderToStaticMarkup(
    React.createElement(MapLegendDrawer, {
      clockSystem,
      source: 'hens333',
      isOpen: true,
    })
  );

  assert.ok(html.includes('data-testid="map-legend-drawer"'));
  assert.ok(html.includes('12-Clock Callout System'));
  assert.ok(html.includes('Azarov 12-clock layout callouts'));
  assert.ok(html.includes('data-testid="map-legend-sector-12"'));
  assert.ok(html.includes("12 O&#x27;Clock (Top)"));
  assert.ok(html.includes('Main Garage'));
  assert.ok(html.includes('data-testid="map-legend-sector-3"'));
  assert.ok(html.includes("3 O&#x27;Clock (Right)"));
  assert.ok(html.includes('Crane Jumble'));
  assert.ok(html.includes('data-testid="map-legend-sector-6"'));
  assert.ok(html.includes('Killer Shack'));
  assert.ok(html.includes('data-testid="map-legend-sector-9"'));
  assert.ok(html.includes('Tree Line'));
});

test('MapLegendDrawer adapts sector names for SamoelColt source and handles collapse', () => {
  const openHtml = renderToStaticMarkup(
    React.createElement(MapLegendDrawer, {
      clockSystem: {
        twelve_o_clock: 'North Tower',
        three_o_clock: 'East Generator',
        six_o_clock: 'South Shack',
        nine_o_clock: 'West Yard',
      },
      source: 'samoelcolt',
      isOpen: true,
      collapsible: true,
    })
  );

  assert.ok(openHtml.includes('4-Quadrant Sector System (Isometric Scheme)'));
  assert.ok(openHtml.includes('North Sector'));
  assert.ok(openHtml.includes('North Tower'));
  assert.ok(openHtml.includes('East Sector'));
  assert.ok(openHtml.includes('East Generator'));
  assert.ok(openHtml.includes('South Sector'));
  assert.ok(openHtml.includes('South Shack'));
  assert.ok(openHtml.includes('West Sector'));
  assert.ok(openHtml.includes('West Yard'));
  assert.ok(openHtml.includes('data-testid="map-legend-toggle-btn"'));
  assert.ok(openHtml.includes('aria-expanded="true"'));

  const collapsedHtml = renderToStaticMarkup(
    React.createElement(MapLegendDrawer, {
      clockSystem: {
        twelve_o_clock: 'North Tower',
      },
      source: 'samoelcolt',
      isOpen: false,
      collapsible: true,
    })
  );

  // Body not visible when isOpen is false
  assert.ok(!collapsedHtml.includes('data-testid="map-legend-body"'));
  assert.ok(!collapsedHtml.includes('North Tower'));
  assert.ok(collapsedHtml.includes('aria-expanded="false"'));
});

// ─── 6. MapDirectoryList Component Unit Tests ─────────────────────────────────
test('MapDirectoryList renders grouped showcase with active border and filters', () => {
  const groupedMaps = {
    'Autohaven Wreckers': [mockMaps[0]],
    'MacMillan Estate': [mockMaps[1]],
    'Badham Preschool': [mockMaps[2]],
  };

  const html = renderToStaticMarkup(
    React.createElement(MapDirectoryList, {
      groupedMaps,
      selectedMapId: 'hens_azarovs_resting_place',
      onSelectMapId: () => {},
      onPopoutImage: () => {},
      showFilters: true,
      selectedRealm: 'all',
      onSelectRealm: () => {},
      onSearchChange: () => {},
    })
  );

  assert.ok(html.includes('data-testid="map-directory-list"'));
  assert.ok(html.includes('data-testid="map-card-hens_azarovs_resting_place"'));
  assert.ok(html.includes('border-amber-500'));
  assert.ok(html.includes("Azarov&#x27;s Resting Place"));
  assert.ok(html.includes('data-testid="map-card-samoel_coal_tower"'));
  assert.ok(html.includes('Coal Tower'));
  assert.ok(html.includes('data-testid="map-popout-btn-hens_azarovs_resting_place"'));
  assert.ok(html.includes('data-testid="realm-pill-all"'));
});

test('MapDirectoryList handles realm filtering and search filtering in markup', () => {
  const groupedMaps = {
    'Autohaven Wreckers': [mockMaps[0]],
    'MacMillan Estate': [mockMaps[1]],
    'Badham Preschool': [mockMaps[2]],
  };

  const realmFilteredHtml = renderToStaticMarkup(
    React.createElement(MapDirectoryList, {
      groupedMaps,
      selectedMapId: 'samoel_coal_tower',
      selectedRealm: 'MacMillan Estate',
      onSelectMapId: () => {},
    })
  );

  assert.ok(realmFilteredHtml.includes('Coal Tower'));
  assert.ok(!realmFilteredHtml.includes("Azarov&#x27;s Resting Place"));

  const searchFilteredHtml = renderToStaticMarkup(
    React.createElement(MapDirectoryList, {
      groupedMaps,
      selectedMapId: 'hens_preschool_i',
      searchQuery: 'preschool',
      onSelectMapId: () => {},
    })
  );

  assert.ok(searchFilteredHtml.includes('Preschool I'));
  assert.ok(!searchFilteredHtml.includes('Coal Tower'));
});

test('MapDirectoryList handles empty and loading states', () => {
  const loadingHtml = renderToStaticMarkup(
    React.createElement(MapDirectoryList, {
      groupedMaps: {},
      selectedMapId: '',
      onSelectMapId: () => {},
      loading: true,
    })
  );
  assert.ok(loadingHtml.includes('data-testid="map-directory-loading"'));

  const emptyHtml = renderToStaticMarkup(
    React.createElement(MapDirectoryList, {
      groupedMaps: {},
      selectedMapId: '',
      onSelectMapId: () => {},
      loading: false,
    })
  );
  assert.ok(emptyHtml.includes('data-testid="map-directory-empty"'));
  assert.ok(emptyHtml.includes('No Maps Found'));
});
