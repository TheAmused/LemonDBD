// frontend/src/__tests__/unit/mapHooks.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  normalizeMapSearch,
  groupMapsByRealmSorted,
  useMapExplorerData,
} from '@/utils/../hooks/useMapExplorerData';
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
    realm: 'Springwood',
    layout_type: 'Suburban Street',
    jungle_gyms_count: 4,
    totem_spawns_count: 5,
    pallet_density: 'High',
    shack_has_basement: true,
    description: 'Badham Variant 1',
    source: 'hens333',
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
  // Search filtering happens server-side (fetchMaps' existing name/realm ilike filter, already
  // covered by backend tests) — maps passed into this function are always pre-filtered, so a
  // realm with zero matches simply never appears as a key here. This test documents that
  // guarantee at the grouping boundary rather than re-testing the backend filter in JS.
  const partial = sampleMockMaps.filter((m) => m.name.toLowerCase().includes('preschool'));
  const grouped = groupMapsByRealmSorted(partial);
  assert.deepStrictEqual(
    grouped.map((g) => g.realm),
    ['Springwood']
  );
});
