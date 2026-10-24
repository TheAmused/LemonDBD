// frontend/src/__tests__/unit/mapLayout.test.ts
import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderWithDictionary } from '../helpers/renderWithDictionary';
import { MapCard } from '@/components/maps/MapCard';
import { getMapImageSrc, getMapThumbSrc } from '@/utils/mapUtils';
import { MAP_SOURCE } from '@/services/mapApi';
import { TIER_LIST_MAP_SOURCE } from '@/utils/tierLists/constants';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MapLayoutView } from '@/components/maps/MapLayoutView';
import { FullscreenMapEngineView } from '@/components/maps/FullscreenMapEngine';
import { MapLegend } from '@/components/maps/MapLegend';
import type { MapLayout, MapRealm, MapLandmark } from '@/types/map';
import {
  clockHourAt,
  clockLabels,
  distanceToLandmark,
  floorSquares,
  pointInRing,
  layoutPictureDataUri,
  pointOnFloor,
  ringsToPath,
} from '@/utils/mapLayout';
import { getFeatureLandmarkName, KNOWN_FEATURE_CODES, type FeatureCode } from '@/utils/mapLandmarkLabels';
import en from '@/locales/en';
import de from '@/locales/de';
import es from '@/locales/es';
import ja from '@/locales/ja';
import pl from '@/locales/pl';

// The Thompson House as seeded: 152 sqT, a wide top, a narrower body and a tab bottom right.
const thompson: MapLayout = {
  v: 1,
  cell_m: 8,
  width_m: 112,
  height_m: 112,
  floors: [
    {
      label: null,
      outline: [[[0, 0], [112, 0], [112, 48], [96, 48], [96, 112], [64, 112], [64, 96], [16, 96], [16, 48], [0, 48]]],
      area_m2: 9728,
    },
  ],
};

const twoFloors: MapLayout = {
  v: 1,
  cell_m: 8,
  width_m: 64,
  height_m: 64,
  floors: [
    { label: 'lower', outline: [[[0, 0], [64, 0], [64, 64], [0, 64]]], area_m2: 4096 },
    { label: 'upper', outline: [[[0, 0], [56, 0], [56, 56], [0, 56]]], area_m2: 3136 },
  ],
};

const baseMap: MapRealm = {
  id: 14,
  name: 'The Thompson House',
  realm: 'Coldwind Farm',
  layout_type: 'Outdoor',
  jungle_gyms_count: 3,
  pallet_density: 'Medium',
  is_shack: true,
  is_main_building: true,
  size_sq_tiles: 152,
  size_sq_meters: 9728,
  callout_image_url: 'https://example.com/thompson.webp',
  layout: thompson,
};

test('pointInRing and pointOnFloor follow the outline, notches included', () => {
  const ring = thompson.floors[0].outline[0];
  assert.ok(pointInRing(56, 24, ring), 'top band');
  assert.ok(pointInRing(80, 104, ring), 'bottom tab');
  assert.ok(!pointInRing(8, 72, ring), 'left notch is outside');
  assert.ok(!pointInRing(104, 104, ring), 'right notch is outside');
  const blockedFloor = { ...thompson.floors[0], blocked: [[[48, 8], [64, 8], [64, 24], [48, 24]] as [number, number][]] };
  assert.ok(!pointOnFloor(blockedFloor, 56, 16), 'blocked rings are not floor');
  assert.ok(pointOnFloor(blockedFloor, 56, 40));
});

test('floorSquares counts exactly the map size in 8 m squares', () => {
  assert.strictEqual(floorSquares(thompson, thompson.floors[0]).length, 152);
  assert.strictEqual(floorSquares(twoFloors, twoFloors.floors[1]).length, 49);
});

test('clockHourAt: 12 is straight up and the hours run clockwise', () => {
  assert.strictEqual(clockHourAt(0, 0, 0, -10), 12);
  assert.strictEqual(clockHourAt(0, 0, 10, 0), 3);
  assert.strictEqual(clockHourAt(0, 0, 0, 10), 6);
  assert.strictEqual(clockHourAt(0, 0, -10, 0), 9);
  assert.strictEqual(clockHourAt(0, 0, 10, -17.32), 1, '30 degrees is 1 o\'clock');
});

test('clockLabels puts every number on the floor, inside the edge', () => {
  const { center, labels } = clockLabels(thompson.floors[0]);
  assert.deepStrictEqual(center, [56, 56]);
  assert.strictEqual(labels.length, 12);
  for (const l of labels) {
    assert.ok(pointOnFloor(thompson.floors[0], l.x, l.y), `hour ${l.hour} is on the floor`);
    assert.strictEqual(clockHourAt(center[0], center[1], l.x, l.y), l.hour, `hour ${l.hour} sits in its own sector`);
  }
  const twelve = labels.find((l) => l.hour === 12)!;
  assert.ok(twelve.y < 10, '12 sits near the top edge');
});

test('ringsToPath writes closed SVG subpaths', () => {
  assert.strictEqual(ringsToPath([[[0, 0], [8, 0], [8, 8]]]), 'M0 0L8 0L8 8Z');
  assert.strictEqual(ringsToPath([[[0, 0], [8, 0]]]), '', 'degenerate rings are skipped');
});

test('MapLayoutView draws the outline, the callouts and a scale bar in metres', () => {
  const html = renderWithDictionary(React.createElement(MapLayoutView, { layout: thompson, title: 'The Thompson House' }));
  assert.ok(html.includes('<title>The Thompson House</title>'));
  assert.ok(html.includes('M0 0L112 0L112 48L96 48L96 112L64 112L64 96L16 96L16 48L0 48Z'));
  for (const hour of [1, 6, 12]) assert.ok(html.includes(`>${hour}</text>`), `clock ${hour}`);
  assert.ok(html.includes('>MID</text>'));
  assert.ok(html.includes('>32 m</text>'));
});

test('thumbnails share one frame so map sizes compare', () => {
  const big = renderWithDictionary(React.createElement(MapLayoutView, { layout: thompson, title: 'a', variant: 'thumb' }));
  const small = renderWithDictionary(React.createElement(MapLayoutView, { layout: twoFloors, title: 'b', variant: 'thumb' }));
  assert.ok(big.includes('viewBox="-20 -20 152 152"'));
  assert.ok(small.includes('viewBox="-44 -44 152 152"'));
  assert.ok(!big.includes('</text>'), 'thumbnails carry no labels');
});

test('MapCard draws the layout instead of loading the callout image', () => {
  const html = renderWithDictionary(React.createElement(MapCard, { map: baseMap, backendBase: 'http://x', onSelect: () => {} }));
  assert.ok(html.includes('<svg'));
  assert.ok(!html.includes('<img'));
  const noLayout = renderWithDictionary(
    React.createElement(MapCard, { map: { ...baseMap, layout: null }, backendBase: 'http://x', onSelect: () => {} })
  );
  assert.ok(noLayout.includes('<img'), 'maps without a layout keep their image');
});

test('the fullscreen view draws the map, offers its floors and no longer switches to a callout image', () => {
  const html = renderWithDictionary(
    React.createElement(FullscreenMapEngineView, {
      mapId: 45,
      availableMaps: [{ ...baseMap, id: 45, name: 'Midwich Elementary School', layout: twoFloors }],
      backendBase: 'http://x',
      onClose: () => {},
    })
  );
  assert.ok(html.includes('<svg') && html.includes('data-pan-target'));
  assert.ok(!html.includes('<img'), 'the callout image is not loaded');
  assert.ok(!html.includes('Hens333'), 'there is no switch back to the Hens333 image');
  assert.ok(html.includes('Lower floor') && html.includes('Upper floor'));
  assert.ok(!html.includes('Approximate'), 'measured maps carry no approximation note');
});

test('maps without a measured outline say their scale is approximate', () => {
  const html = renderWithDictionary(
    React.createElement(FullscreenMapEngineView, {
      mapId: 14,
      availableMaps: [{ ...baseMap, layout: { ...thompson, approx: true } }],
      backendBase: 'http://x',
      onClose: () => {},
    })
  );
  assert.ok(html.includes('Approximate scale'));
});

test('landmarks are drawn with their names, and clock numbers keep clear of them', () => {
  const withLandmarks: MapLayout = {
    ...thompson,
    floors: [{ ...thompson.floors[0], landmarks: [
      { kind: 'main', x: 56, y: 24 },
      { kind: 'shack', x: 92, y: 22 },
      { kind: 'feature', x: 40, y: 72, label: 'C|H' },
    ] }],
  };
  const html = renderWithDictionary(React.createElement(MapLayoutView, { layout: withLandmarks, title: 'The Thompson House' }));
  assert.ok(html.includes('<title>Main Building</title>'));
  assert.ok(html.includes('<title>Shack</title>'));
  assert.ok(html.includes('>C|H</text>'));
  const { labels, showMid } = clockLabels(withLandmarks.floors[0]);
  for (const l of labels) {
    for (const lm of withLandmarks.floors[0].landmarks!) {
      assert.ok(distanceToLandmark(lm, l.x, l.y) >= 4, `hour ${l.hour} clears ${lm.kind}`);
    }
  }
  assert.strictEqual(showMid, true);
  const centred = { ...thompson.floors[0], landmarks: [{ kind: 'main' as const, x: 56, y: 56 }] };
  assert.strictEqual(clockLabels(centred).showMid, false, 'MID hides under a landmark in the centre');
});

test('landmarks with a size are drawn as their footprint in metres, estimates dashed', () => {
  const sized: MapLayout = {
    ...thompson,
    floors: [{ ...thompson.floors[0], landmarks: [
      { kind: 'main', x: 56, y: 24, w: 30, h: 30 },
      { kind: 'shack', x: 80, y: 104, w: 8, h: 8, est: true },
    ] }],
  };
  const html = renderWithDictionary(React.createElement(MapLayoutView, { layout: sized, title: 'T' }));
  assert.ok(html.includes('x="41" y="9" width="30" height="30"'), 'a 30 m main building spans 30 m');
  assert.ok(html.includes('x="76" y="100" width="8" height="8"') && html.includes('stroke-dasharray="1.6 1.2"'), 'the estimated shack is dashed');
  const boat = { kind: 'main' as const, x: 50, y: 50, w: 36, h: 15, angle: 45 };
  assert.ok(Math.abs(distanceToLandmark(boat, 50, 50)) < 1e-9);
  assert.ok(distanceToLandmark(boat, 50, 90) > 4);
});

test('pictures for tier lists come from the layout, not the callout image', () => {
  const uri = layoutPictureDataUri(thompson);
  assert.ok(uri.startsWith('data:image/svg+xml;utf8,'));
  assert.ok(decodeURIComponent(uri).includes('M0 0L112 0L112 48'));
  assert.strictEqual(getMapThumbSrc(baseMap), uri);
  assert.strictEqual(getMapImageSrc(baseMap), uri);
  assert.ok(getMapImageSrc({ ...baseMap, layout: null }).includes('thompson.webp'), 'falls back without a layout');
});

test('the fullscreen view shows the image for maps without a layout', () => {
  const html = renderWithDictionary(
    React.createElement(FullscreenMapEngineView, {
      mapId: 14,
      availableMaps: [{ ...baseMap, layout: null }],
      backendBase: 'http://x',
      onClose: () => {},
    })
  );
  assert.ok(html.includes('<img'), 'a map that ever arrives without a layout still shows its image');
});

test('pages request the maps by the source the seed data actually uses', () => {
  // A stale code here filters every map out of the API response ("No maps found").
  const seed = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../../../backend/app/seeds/data/content/map_sources.json'), 'utf8'),
  ) as { map_sources: Array<{ id: number; code: string }> };
  const maps = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../../../backend/app/seeds/data/content/maps/lemondbd.json'), 'utf8'),
  ) as { maps: Array<{ source_id: number }> };
  const codes = new Set(maps.maps.map((m) => seed.map_sources.find((s) => s.id === m.source_id)?.code));
  assert.deepStrictEqual([...codes], [MAP_SOURCE]);
  assert.strictEqual(TIER_LIST_MAP_SOURCE, MAP_SOURCE);
});

test('KNOWN_FEATURE_CODES defines all 10 competitive feature codes', () => {
  assert.deepStrictEqual([...KNOWN_FEATURE_CODES], ['C|H', 'H/FB', 'WT', 'CT', 'GARDEN', 'STATUE', 'H', 'T', 'P', 'UFO']);
});

test('getFeatureLandmarkName translates all competitive codes and falls back to code if unknown', () => {
  assert.strictEqual(getFeatureLandmarkName('C|H', en), en.maps.landmarkCowTreeHarvester);
  assert.strictEqual(getFeatureLandmarkName('H/FB', en), en.maps.landmarkHouseFallBuilding);
  assert.strictEqual(getFeatureLandmarkName('WT', en), en.maps.landmarkWaterTower);
  assert.strictEqual(getFeatureLandmarkName('CT', en), en.maps.landmarkCourtyard);
  assert.strictEqual(getFeatureLandmarkName('GARDEN', en), en.maps.landmarkGarden);
  assert.strictEqual(getFeatureLandmarkName('STATUE', en), en.maps.landmarkStatue);
  assert.strictEqual(getFeatureLandmarkName('H', en), en.maps.landmarkHill);
  assert.strictEqual(getFeatureLandmarkName('T', en), en.maps.landmarkTower);
  assert.strictEqual(getFeatureLandmarkName('P', en), en.maps.landmarkPagoda);
  assert.strictEqual(getFeatureLandmarkName('UFO', en), en.maps.landmarkShuttle);
  assert.strictEqual(getFeatureLandmarkName('UNKNOWN_CODE', en), 'UNKNOWN_CODE');
  assert.strictEqual(getFeatureLandmarkName('C|H', {}), 'C|H');
});

test('all 5 locales provide translations for landmark and legend keys', () => {
  const locales = [en, de, es, ja, pl];
  const requiredKeys = [
    'landmarkCowTreeHarvester',
    'landmarkHouseFallBuilding',
    'landmarkWaterTower',
    'landmarkCourtyard',
    'landmarkGarden',
    'landmarkStatue',
    'landmarkHill',
    'landmarkTower',
    'landmarkPagoda',
    'landmarkShuttle',
    'legendTitle',
    'legendToggleAria',
    'legendClockTitle',
    'legendClockDesc',
    'legendFeatures',
    'sourceLemonDbd',
    'sourceHens',
    'sourceHensClock',
    'providerAria',
  ] as const;

  for (const loc of locales) {
    for (const key of requiredKeys) {
      assert.ok((loc.maps as any)[key], `Missing key ${key} in locale`);
      assert.strictEqual(typeof (loc.maps as any)[key], 'string');
      assert.ok((loc.maps as any)[key].length > 0);
    }
  }
});

test('landmarks render enhanced localized tooltips for features and structures', () => {
  const withLandmarks: MapLayout = {
    ...thompson,
    floors: [{
      ...thompson.floors[0],
      landmarks: [
        { kind: 'main', x: 56, y: 24 },
        { kind: 'shack', x: 92, y: 22 },
        { kind: 'feature', x: 40, y: 72, label: 'C|H' },
      ],
    }],
  };
  const html = renderWithDictionary(React.createElement(MapLayoutView, { layout: withLandmarks, title: 'Thompson' }));
  assert.ok(html.includes('<title>Main Building</title>'));
  assert.ok(html.includes('<title>Shack</title>'));
  assert.ok(html.includes('<title>C|H — Cow Tree / Harvester</title>'));
});

test('MapLegend renders correctly when open and closed', () => {
  const closedHtml = renderWithDictionary(
    React.createElement(MapLegend, {
      isOpen: false,
      onClose: () => {},
    })
  );
  assert.strictEqual(closedHtml, '');

  const openNoFeatures = renderWithDictionary(
    React.createElement(MapLegend, {
      isOpen: true,
      onClose: () => {},
      landmarks: [
        { kind: 'main', x: 56, y: 24 },
        { kind: 'shack', x: 92, y: 22 },
      ],
    })
  );
  assert.ok(openNoFeatures.includes('Map Legend'));
  assert.ok(openNoFeatures.includes('Main Building'));
  assert.ok(openNoFeatures.includes('Shack'));
  assert.ok(openNoFeatures.includes('12-Clock Orientation'));
  assert.ok(!openNoFeatures.includes('Landmarks &amp; Features'));

  const landmarksWithFeatures: MapLandmark[] = [
    { kind: 'main', x: 56, y: 24 },
    { kind: 'feature', x: 40, y: 72, label: 'C|H' },
    { kind: 'feature', x: 30, y: 50, label: 'WT' },
    { kind: 'feature', x: 35, y: 55, label: 'C|H' }, // duplicate to test uniqueness
  ];
  const openWithFeatures = renderWithDictionary(
    React.createElement(MapLegend, {
      isOpen: true,
      onClose: () => {},
      landmarks: landmarksWithFeatures,
    })
  );
  assert.ok(openWithFeatures.includes('Landmarks &amp; Features'));
  assert.ok(openWithFeatures.includes('C|H'));
  assert.ok(openWithFeatures.includes('Cow Tree / Harvester'));
  assert.ok(openWithFeatures.includes('WT'));
  assert.ok(openWithFeatures.includes('Water Tower'));
});

test('FullscreenMapEngineView provides legend toggle button when layout is present', () => {
  const html = renderWithDictionary(
    React.createElement(FullscreenMapEngineView, {
      mapId: 14,
      availableMaps: [baseMap],
      backendBase: 'http://x',
      onClose: () => {},
    })
  );
  assert.ok(html.includes('aria-label="Toggle Map Legend"'));
});


