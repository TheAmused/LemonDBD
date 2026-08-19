// frontend/src/utils/__tests__/mapHooks.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  clampZoom,
  calculateTouchDistance,
  calculatePinchZoom,
  useMapGestures,
} from '../../hooks/useMapGestures';
import {
  normalizeMapSearch,
  groupMapsByRealm,
  extractUniqueRealms,
  findMapByNameAndSource,
  useMapExplorerData,
} from '../../hooks/useMapExplorerData';
import { getVariantsForMap } from '../mapVoiceMatcher';
import type { MapRealm } from '@/types/map';

const sampleMockMaps: MapRealm[] = [
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
  },
  {
    id: 'hens_blood_lodge',
    name: 'Blood Lodge',
    realm: 'Autohaven Wreckers',
    layout_type: 'Open Quad',
    jungle_gyms_count: 4,
    totem_spawns_count: 5,
    pallet_density: 'High',
    shack_has_basement: true,
    description: 'Open yard lodge',
    source: 'hens333',
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
  {
    id: 'hens_preschool_ii',
    name: 'Preschool II',
    realm: 'Badham Preschool',
    layout_type: 'Suburban Street',
    jungle_gyms_count: 4,
    totem_spawns_count: 5,
    pallet_density: 'High',
    shack_has_basement: true,
    description: 'Badham Variant 2',
    source: 'hens333',
  },
  {
    id: 'hens_police_station_east_wing',
    name: 'Police Station East Wing',
    realm: 'Raccoon City',
    layout_type: 'Indoor Multi-Floor',
    jungle_gyms_count: 3,
    totem_spawns_count: 5,
    pallet_density: 'High',
    shack_has_basement: false,
    description: 'RPD East Wing',
    source: 'hens333',
  },
  {
    id: 'hens_police_station_west_wing',
    name: 'Police Station West Wing',
    realm: 'Raccoon City',
    layout_type: 'Indoor Multi-Floor',
    jungle_gyms_count: 3,
    totem_spawns_count: 5,
    pallet_density: 'High',
    shack_has_basement: false,
    description: 'RPD West Wing',
    source: 'hens333',
  },
  {
    id: 'hens_coal_tower',
    name: 'Coal Tower',
    realm: 'MacMillan Estate',
    layout_type: 'Open Industrial',
    jungle_gyms_count: 4,
    totem_spawns_count: 5,
    pallet_density: 'Medium',
    shack_has_basement: true,
    description: 'Coal Tower 1',
    source: 'hens333',
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
  },
  {
    id: 'samoel_dead_dawg_saloon',
    name: 'Dead Dawg Saloon',
    realm: 'Grave of Glennvale',
    layout_type: '3D Isometric',
    jungle_gyms_count: 3,
    totem_spawns_count: 5,
    pallet_density: 'Medium',
    shack_has_basement: false,
    description: 'Saloon Isometric',
    source: 'samoelcolt',
  },
];

// ─── 1. Zoom Boundary Clamping Tests ──────────────────────────────────────────
test('clampZoom respects minimum, maximum, and rounding constraints', () => {
  // Default bounds: 0.5 to 3.0
  assert.strictEqual(clampZoom(1.0), 1.0);
  assert.strictEqual(clampZoom(0.2), 0.5); // Below minimum clamped to 0.5
  assert.strictEqual(clampZoom(0.5), 0.5);
  assert.strictEqual(clampZoom(3.0), 3.0);
  assert.strictEqual(clampZoom(3.8), 3.0); // Above maximum clamped to 3.0
  assert.strictEqual(clampZoom(1.23456), 1.23); // Rounded to 2 decimal places

  // Custom bounds
  assert.strictEqual(clampZoom(0.8, 1.0, 2.0), 1.0);
  assert.strictEqual(clampZoom(2.5, 1.0, 2.0), 2.0);
  assert.strictEqual(clampZoom(1.5, 1.0, 2.0), 1.5);
});

// ─── 2. Touch Distance & Pinch Calculation Tests ───────────────────────────────
test('calculateTouchDistance computes Euclidean distance accurately', () => {
  const p1 = { clientX: 0, clientY: 0 };
  const p2 = { clientX: 30, clientY: 40 };
  assert.strictEqual(calculateTouchDistance(p1, p2), 50);

  const p3 = { clientX: 100, clientY: 200 };
  const p4 = { clientX: 100, clientY: 200 };
  assert.strictEqual(calculateTouchDistance(p3, p4), 0);
});

test('calculatePinchZoom scales and clamps zoom correctly', () => {
  // Scaling up: distance doubles (100 -> 200) from initial zoom 1.0 -> 2.0
  const zoomIn = calculatePinchZoom(1.0, 100, 200);
  assert.strictEqual(zoomIn, 2.0);

  // Scaling up exceeding max zoom (3.0 default) -> clamped to 3.0
  const zoomInMax = calculatePinchZoom(1.0, 100, 400);
  assert.strictEqual(zoomInMax, 3.0);

  // Scaling down: distance halved (200 -> 100) from initial zoom 1.5 -> 0.75
  const zoomOut = calculatePinchZoom(1.5, 200, 100);
  assert.strictEqual(zoomOut, 0.75);

  // Scaling down below min zoom (0.5 default) -> clamped to 0.5
  const zoomOutMin = calculatePinchZoom(1.0, 200, 50);
  assert.strictEqual(zoomOutMin, 0.5);

  // Invalid initial distance handling
  assert.strictEqual(calculatePinchZoom(1.25, 0, 100), 1.25);
  assert.strictEqual(calculatePinchZoom(1.25, -10, 100), 1.25);
});

// ─── 3. Map Voice & Variant Detection Tests ───────────────────────────────────
test('getVariantsForMap accurately detects variant groups', () => {
  // Badham / Preschool variants (all 5)
  const badhamVariants = getVariantsForMap('Preschool I');
  assert.deepStrictEqual(badhamVariants, [
    'Preschool I',
    'Preschool II',
    'Preschool III',
    'Preschool IIIV',
    'Preschool V',
  ]);

  const badhamVariants3 = getVariantsForMap('Preschool III');
  assert.strictEqual(badhamVariants3.length, 5);

  // RPD East / West
  const rpdVariants = getVariantsForMap('Police Station East Wing');
  assert.deepStrictEqual(rpdVariants, [
    'Police Station East Wing',
    'Police Station West Wing',
  ]);

  // Coal Tower
  const coalVariants = getVariantsForMap('Coal Tower');
  assert.deepStrictEqual(coalVariants, [
    'Coal Tower',
    'Coal Tower II',
  ]);

  // Non-variant map returns empty array
  assert.deepStrictEqual(getVariantsForMap('Dead Dawg Saloon'), []);
  assert.deepStrictEqual(getVariantsForMap("Azarov's Resting Place"), []);
  assert.deepStrictEqual(getVariantsForMap(''), []);
});

// ─── 4. Data Grouping and Realm Extraction Tests ──────────────────────────────
test('groupMapsByRealm groups maps by their realm property', () => {
  const grouped = groupMapsByRealm(sampleMockMaps);

  assert.ok(grouped['Autohaven Wreckers']);
  assert.strictEqual(grouped['Autohaven Wreckers'].length, 2);
  assert.strictEqual(grouped['Autohaven Wreckers'][0].name, "Azarov's Resting Place");
  assert.strictEqual(grouped['Autohaven Wreckers'][1].name, 'Blood Lodge');

  assert.ok(grouped['Badham Preschool']);
  assert.strictEqual(grouped['Badham Preschool'].length, 2);

  assert.ok(grouped['Raccoon City']);
  assert.strictEqual(grouped['Raccoon City'].length, 2);

  assert.ok(grouped['MacMillan Estate']);
  assert.strictEqual(grouped['MacMillan Estate'].length, 2);

  assert.ok(grouped['Grave of Glennvale']);
  assert.strictEqual(grouped['Grave of Glennvale'].length, 1);

  // Edge cases
  assert.deepStrictEqual(groupMapsByRealm([]), {});
  // @ts-expect-error test non-array safety
  assert.deepStrictEqual(groupMapsByRealm(null), {});
});

test('extractUniqueRealms returns sorted list of distinct realms', () => {
  const realms = extractUniqueRealms(sampleMockMaps);
  assert.deepStrictEqual(realms, [
    'Autohaven Wreckers',
    'Badham Preschool',
    'Grave of Glennvale',
    'MacMillan Estate',
    'Raccoon City',
  ]);

  assert.deepStrictEqual(extractUniqueRealms([]), []);
});

// ─── 5. Map Normalization and Search Matcher Tests ─────────────────────────────
test('normalizeMapSearch strips punctuation, whitespace, and diacritics', () => {
  assert.strictEqual(normalizeMapSearch("Azarov's Resting Place"), 'azarovsrestingplace');
  assert.strictEqual(normalizeMapSearch('Léry\'s Memorial Institute'), 'lerysmemorialinstitute');
  assert.strictEqual(normalizeMapSearch('  Coal   Tower  II '), 'coaltowerii');
  assert.strictEqual(normalizeMapSearch(''), '');
});

test('findMapByNameAndSource resolves target maps with source preference', () => {
  // Match in hens source
  const m1 = findMapByNameAndSource(sampleMockMaps, 'azarov', 'hens333');
  assert.ok(m1);
  assert.strictEqual(m1.id, 'hens_azarovs_resting_place');

  // Coal Tower in samoel source
  const mSamoel = findMapByNameAndSource(sampleMockMaps, 'coal tower', 'samoelcolt');
  assert.ok(mSamoel);
  assert.strictEqual(mSamoel.id, 'samoel_coal_tower');
  assert.strictEqual(mSamoel.source, 'samoelcolt');

  // Coal Tower in hens source
  const mHens = findMapByNameAndSource(sampleMockMaps, 'coal tower', 'hens333');
  assert.ok(mHens);
  assert.strictEqual(mHens.id, 'hens_coal_tower');
  assert.strictEqual(mHens.source, 'hens333');

  // Fallback across sources when source is 'all'
  const mDeadDawg = findMapByNameAndSource(sampleMockMaps, 'dead dawg', 'all');
  assert.ok(mDeadDawg);
  assert.strictEqual(mDeadDawg.id, 'samoel_dead_dawg_saloon');

  // Fallback when active source does not have the map
  const mDeadDawgFallback = findMapByNameAndSource(sampleMockMaps, 'dead dawg', 'hens333');
  assert.ok(mDeadDawgFallback);
  assert.strictEqual(mDeadDawgFallback.id, 'samoel_dead_dawg_saloon');

  // Non-matching query returns undefined
  assert.strictEqual(findMapByNameAndSource(sampleMockMaps, 'Nonexistent Map XYZ'), undefined);
  assert.strictEqual(findMapByNameAndSource([], 'azarov'), undefined);
});

// ─── 6. Hook Export Definitions & Contracts ───────────────────────────────────
test('useMapGestures and useMapExplorerData are exported hook functions', () => {
  assert.strictEqual(typeof useMapGestures, 'function');
  assert.strictEqual(typeof useMapExplorerData, 'function');
});
