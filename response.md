### frontend/src/types/map.ts
```typescript
export interface Realm {
  id?: number;
  name: string;
  raw_name?: string;
  image_url: string;
  image_local_path: string;
}

export interface MapSource {
  id: number;
  code: string;
  label: string;
}

export interface MapRealm {
  id: number;
  name: string;
  realm: string;
  realm_id?: number;
  source_id?: number;
  source?: string;
  source_label?: string;
  layout_type: string;
  jungle_gyms_count: number;
  totem_spawns_count: number;
  pallet_density: string;
  shack_has_basement: boolean;
  size_sq_tiles?: number | null;
  size_sq_meters?: number | null;
  description?: string | null;
  image_url?: string;
  callout_image_url?: string;
  callout_image_local_path?: string;
}
```

### frontend/src/__tests__/unit/mapCard.test.ts
```typescript
import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapCard } from '@/components/maps/MapCard';
import type { MapRealm } from '@/types/map';

const sampleMap: MapRealm = {
  id: 1,
  name: "Azarov's Resting Place",
  realm: 'Autohaven Wreckers',
  realm_id: 2,
  source_id: 1,
  source: 'hens333',
  source_label: 'Hens333 12-Clock Callouts',
  layout_type: 'Outdoor',
  jungle_gyms_count: 4,
  totem_spawns_count: 5,
  pallet_density: 'Medium',
  shack_has_basement: true,
  size_sq_tiles: 176.0,
  size_sq_meters: 11264,
  description: 'Iconic dumbbell-shaped map',
  callout_image_url: 'https://hens333.com/img/dbd/callouts/Azarovs/Azarovs%20Resting%20Place.webp',
  callout_image_local_path: 'maps/callouts/hens333/azarovs/azarovs_resting_place.webp',
};

test('MapCard renders the map name as a visible label', () => {
  const html = renderToStaticMarkup(
    React.createElement(MapCard, {
      map: sampleMap,
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(html.includes("Azarov&#x27;s Resting Place") || html.includes("Azarov's Resting Place"));
});

test('MapCard resolves the local static image path', () => {
  const html = renderToStaticMarkup(
    React.createElement(MapCard, {
      map: sampleMap,
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(html.includes('http://localhost:5000/static/maps/callouts/hens333/azarovs/azarovs_resting_place.webp'));
});

test('MapCard falls back to the remote callout URL when no local path is set', () => {
  const remoteOnlyMap: MapRealm = { ...sampleMap, callout_image_local_path: undefined };
  const html = renderToStaticMarkup(
    React.createElement(MapCard, {
      map: remoteOnlyMap,
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(html.includes('https://hens333.com/img/dbd/callouts/Azarovs/Azarovs%20Resting%20Place.webp'));
});
```

### frontend/src/__tests__/unit/mapHooks.test.ts
```typescript
import test from 'node:test';
import assert from 'node:assert';
import {
  normalizeMapSearch,
  groupMapsByRealmSorted,
  useMapExplorerData,
} from '@/hooks/useMapExplorerData';
import type { MapRealm } from '@/types/map';

const sampleMockMaps: MapRealm[] = [
  {
    id: 1,
    name: "Azarov's Resting Place",
    realm: 'Autohaven Wreckers',
    realm_id: 2,
    source_id: 1,
    source: 'hens333',
    source_label: 'Hens333 12-Clock Callouts',
    layout_type: 'Outdoor',
    jungle_gyms_count: 4,
    totem_spawns_count: 5,
    pallet_density: 'Medium',
    shack_has_basement: true,
    size_sq_tiles: 176.0,
    size_sq_meters: 11264,
    description: 'Iconic dumbbell-shaped map',
  },
  {
    id: 2,
    name: 'Blood Lodge',
    realm: 'Autohaven Wreckers',
    realm_id: 2,
    source_id: 1,
    source: 'hens333',
    source_label: 'Hens333 12-Clock Callouts',
    layout_type: 'Outdoor',
    jungle_gyms_count: 4,
    totem_spawns_count: 5,
    pallet_density: 'High',
    shack_has_basement: true,
    size_sq_tiles: 156.0,
    size_sq_meters: 9984,
    description: 'Open yard lodge',
  },
  {
    id: 6,
    name: 'Preschool I',
    realm: 'Springwood',
    realm_id: 9,
    source_id: 1,
    source: 'hens333',
    source_label: 'Hens333 12-Clock Callouts',
    layout_type: 'Hybrid',
    jungle_gyms_count: 2,
    totem_spawns_count: 5,
    pallet_density: 'Medium',
    shack_has_basement: true,
    size_sq_tiles: 144.0,
    size_sq_meters: 9216,
    description: 'Badham Variant 1',
  },
];

test('normalizeMapSearch strips punctuation, whitespace, and diacritics', () => {
  assert.strictEqual(normalizeMapSearch("Azarov's Resting Place"), 'azarovsrestingplace');
  assert.strictEqual(normalizeMapSearch('Léry\'s Memorial Institute'), 'lerysmemorialinstitute');
  assert.strictEqual(normalizeMapSearch('  Coal   Tower  II '), 'coaltowerii');
  assert.strictEqual(normalizeMapSearch(''), '');
});

test('groupMapsByRealmSorted groups by realm and sorts sections alphabetically', () => {
  const grouped = groupMapsByRealmSorted(sampleMockMaps);

  assert.strictEqual(grouped.length, 2);
  assert.strictEqual(grouped[0].realm, 'Autohaven Wreckers');
  assert.strictEqual(grouped[0].maps.length, 2);
  assert.strictEqual(grouped[1].realm, 'Springwood');
  assert.strictEqual(grouped[1].maps.length, 1);

  assert.deepStrictEqual(groupMapsByRealmSorted([]), []);
});

test('useMapExplorerData is an exported hook function', () => {
  assert.strictEqual(typeof useMapExplorerData, 'function');
});

test('groupMapsByRealmSorted never produces an empty-map section, satisfying "hides non-matching sections"', () => {
  const partial = sampleMockMaps.filter((m) => m.name.toLowerCase().includes('preschool'));
  const grouped = groupMapsByRealmSorted(partial);
  assert.deepStrictEqual(
    grouped.map((g) => g.realm),
    ['Springwood']
  );
});
```

### frontend/src/__tests__/unit/fullscreenMapEngine.test.ts
```typescript
import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FullscreenMapEngine } from '@/components/maps/FullscreenMapEngine';
import type { MapRealm } from '@/types/map';

const sampleOutdoorMap: MapRealm = {
  id: 1,
  name: "Azarov's Resting Place",
  realm: 'Autohaven Wreckers',
  realm_id: 2,
  source_id: 1,
  source: 'hens333',
  source_label: 'Hens333 12-Clock Callouts',
  layout_type: 'Outdoor',
  jungle_gyms_count: 4,
  totem_spawns_count: 5,
  pallet_density: 'Medium',
  shack_has_basement: true,
  size_sq_tiles: 176.0,
  size_sq_meters: 11264,
  description: 'Dumbbell-shaped tactical Autohaven layout',
  callout_image_url: 'https://hens333.com/img/dbd/callouts/Azarovs/Azarovs%20Resting%20Place.webp',
};

const sampleIndoorMap: MapRealm = {
  id: 43,
  name: 'The Game',
  realm: 'Gideon Meat Plant',
  realm_id: 10,
  source_id: 1,
  source: 'hens333',
  source_label: 'Hens333 12-Clock Callouts',
  layout_type: 'Indoor',
  jungle_gyms_count: 0,
  totem_spawns_count: 5,
  pallet_density: 'Very High',
  shack_has_basement: false,
  size_sq_tiles: 142.0,
  size_sq_meters: 9088,
  description: 'Multistory meat processing facility',
  callout_image_url: 'https://hens333.com/img/dbd/callouts/Other/The%20Game.webp',
};

const sampleMidwichMap: MapRealm = {
  id: 45,
  name: 'Midwich Elementary School',
  realm: 'Silent Hill',
  realm_id: 15,
  source_id: 1,
  source: 'hens333',
  source_label: 'Hens333 12-Clock Callouts',
  layout_type: 'Indoor',
  jungle_gyms_count: 0,
  totem_spawns_count: 5,
  pallet_density: 'Low',
  shack_has_basement: false,
  size_sq_tiles: 113.5,
  size_sq_meters: 7264,
  description: 'Silent Hill nightmare school',
  callout_image_url: 'https://hens333.com/img/dbd/callouts/Other/Midwich.gif',
};

test('FullscreenMapEngine renders outdoor map tactical intel badges and telemetry', () => {
  const html = renderToStaticMarkup(
    React.createElement(FullscreenMapEngine, {
      mapId: 1,
      availableMaps: [sampleOutdoorMap],
      backendBase: 'http://localhost:5000',
      onClose: () => {},
    })
  );

  assert.ok(html.includes("Azarov&#x27;s Resting Place") || html.includes("Azarov's Resting Place"));
  assert.ok(html.includes('Autohaven Wreckers'));
  assert.ok(html.includes('Outdoor'));
  assert.ok(html.includes('176 sqT'));
  assert.ok(html.includes('11,264 m²'));
  assert.ok(html.includes('Medium'));
  assert.ok(html.includes('4 Gyms'));
  assert.ok(html.includes('5 Spawns'));
  assert.ok(html.includes('Basement Possible'));
});

test('FullscreenMapEngine renders indoor map tactical intel without shack and 0 maze tiles', () => {
  const html = renderToStaticMarkup(
    React.createElement(FullscreenMapEngine, {
      mapId: 43,
      availableMaps: [sampleIndoorMap],
      backendBase: 'http://localhost:5000',
      onClose: () => {},
    })
  );

  assert.ok(html.includes('The Game'));
  assert.ok(html.includes('Gideon Meat Plant'));
  assert.ok(html.includes('Indoor'));
  assert.ok(html.includes('142 sqT'));
  assert.ok(html.includes('9,088 m²'));
  assert.ok(html.includes('Very High'));
  assert.ok(html.includes('0 (Corridors)'));
  assert.ok(html.includes('No Shack'));
});

test('FullscreenMapEngine renders float tile size accurately', () => {
  const html = renderToStaticMarkup(
    React.createElement(FullscreenMapEngine, {
      mapId: 45,
      availableMaps: [sampleMidwichMap],
      backendBase: 'http://localhost:5000',
      onClose: () => {},
    })
  );

  assert.ok(html.includes('Midwich Elementary School'));
  assert.ok(html.includes('113.5 sqT'));
  assert.ok(html.includes('7,264 m²'));
});
```