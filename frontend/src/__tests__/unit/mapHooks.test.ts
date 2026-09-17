// frontend/src/__tests__/unit/mapHooks.test.ts
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
    pallet_density: 'Medium',
    is_shack: true,
    is_main_building: true,
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
    pallet_density: 'High',
    is_shack: true,
    is_main_building: true,
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
    pallet_density: 'Medium',
    is_shack: true,
    is_main_building: true,
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
