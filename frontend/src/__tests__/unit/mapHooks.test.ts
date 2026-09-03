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

// ── Locale-safe map resolution ────────────────────────────────────────────────
// The backend translates MapRealm.name per request locale (see
// backend/app/models/map.py -> MapRealm.to_dict and app/utils/lang.extract_lang).
// The map id is not translated, so it is the only reliable handle across locales.
// These names are the ones backend/app/translations/translations.json actually
// ships for each language.

const localizedMaps: MapRealm[] = [
  {
    id: 'hens_macmillan_estate_coal_tower',
    name: 'Kohleturm',
    realm: 'MacMillan Anwesen',
    layout_type: '',
    jungle_gyms_count: 0,
    totem_spawns_count: 5,
    pallet_density: '',
    shack_has_basement: false,
    description: '',
    source: 'hens333',
  },
  {
    id: 'hens_macmillan_estate_coal_tower_ii',
    name: 'Kohleturm II',
    realm: 'MacMillan Anwesen',
    layout_type: '',
    jungle_gyms_count: 0,
    totem_spawns_count: 5,
    pallet_density: '',
    shack_has_basement: false,
    description: '',
    source: 'hens333',
  },
  {
    id: 'hens_autohaven_wreckers_gas_heaven',
    name: 'Sprithimmel',
    realm: 'Autohaven-Schrottplatz',
    layout_type: '',
    jungle_gyms_count: 0,
    totem_spawns_count: 5,
    pallet_density: '',
    shack_has_basement: false,
    description: '',
    source: 'hens333',
  },
];

const japaneseMaps: MapRealm[] = [
  { ...localizedMaps[0], name: 'コール・タワー' },
  { ...localizedMaps[1], name: 'コール・タワー II' },
  { ...localizedMaps[2], name: 'ガス・ヘヴン' },
];

test('normalizeMapSearch preserves Japanese text instead of emptying it', async () => {
  const { normalizeMapSearch: normalize } = await import('@/utils/../hooks/useMapExplorerData');

  // Stripping to [a-z0-9] turned every Japanese name into '', which made all of
  // them compare equal to each other and to any other unmatched string.
  assert.notStrictEqual(normalize('ガス・ヘヴン'), '');
  assert.notStrictEqual(normalize('コール・タワー'), '');
  assert.notStrictEqual(normalize('ガス・ヘヴン'), normalize('コール・タワー'));

  // The katakana middle dot is punctuation and must not affect equality.
  assert.strictEqual(normalize('ガス・ヘヴン'), normalize('ガスヘヴン'));

  // Polish ł folds to l, matching the voice matcher's normalisation.
  assert.strictEqual(normalize('Złomowisko'), 'zlomowisko');
});

test('findMapByName resolves an English name against a localized map list', async () => {
  const { findMapByName } = await import('@/utils/../hooks/useMapExplorerData');

  // Not one of these German names contains the English string, so this only
  // works via the untranslated map id.
  assert.strictEqual(findMapByName(localizedMaps, 'Coal Tower')?.id, 'hens_macmillan_estate_coal_tower');
  assert.strictEqual(findMapByName(localizedMaps, 'Gas Heaven')?.id, 'hens_autohaven_wreckers_gas_heaven');
  assert.strictEqual(findMapByName(japaneseMaps, 'Coal Tower')?.id, 'hens_macmillan_estate_coal_tower');
  assert.strictEqual(findMapByName(japaneseMaps, 'Gas Heaven')?.id, 'hens_autohaven_wreckers_gas_heaven');
});

test('findMapByName does not let a base map swallow its numbered variant', async () => {
  const { findMapByName } = await import('@/utils/../hooks/useMapExplorerData');

  assert.strictEqual(findMapByName(localizedMaps, 'Coal Tower')?.id, 'hens_macmillan_estate_coal_tower');
  assert.strictEqual(
    findMapByName(localizedMaps, 'Coal Tower II')?.id,
    'hens_macmillan_estate_coal_tower_ii'
  );
  // And by localized name, both directions.
  assert.strictEqual(findMapByName(localizedMaps, 'Kohleturm')?.id, 'hens_macmillan_estate_coal_tower');
  assert.strictEqual(
    findMapByName(localizedMaps, 'Kohleturm II')?.id,
    'hens_macmillan_estate_coal_tower_ii'
  );
});

test('findMapByName still resolves localized names exactly', async () => {
  const { findMapByName } = await import('@/utils/../hooks/useMapExplorerData');

  assert.strictEqual(findMapByName(localizedMaps, 'Sprithimmel')?.id, 'hens_autohaven_wreckers_gas_heaven');
  assert.strictEqual(findMapByName(japaneseMaps, 'ガス・ヘヴン')?.id, 'hens_autohaven_wreckers_gas_heaven');
  assert.strictEqual(findMapByName(japaneseMaps, 'ガスヘヴン')?.id, 'hens_autohaven_wreckers_gas_heaven');
});

test('findMapForRequest prefers the id and ignores a stale or translated name', async () => {
  const { findMapForRequest } = await import('@/utils/../hooks/useMapExplorerData');

  // The id wins even when the name given belongs to a different map.
  assert.strictEqual(
    findMapForRequest(localizedMaps, 'hens_autohaven_wreckers_gas_heaven', 'Kohleturm')?.id,
    'hens_autohaven_wreckers_gas_heaven'
  );
  // No id: fall back to the name.
  assert.strictEqual(
    findMapForRequest(localizedMaps, undefined, 'Coal Tower')?.id,
    'hens_macmillan_estate_coal_tower'
  );
  // An id that is not in the list falls back to the name rather than failing.
  assert.strictEqual(
    findMapForRequest(localizedMaps, 'hens_does_not_exist', 'Sprithimmel')?.id,
    'hens_autohaven_wreckers_gas_heaven'
  );
  assert.strictEqual(findMapForRequest(localizedMaps, undefined, 'nothing like a map'), undefined);
});
