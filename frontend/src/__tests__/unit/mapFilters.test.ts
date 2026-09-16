// frontend/src/__tests__/unit/mapFilters.test.ts
import test from 'node:test';
import assert from 'node:assert';
import type { MapRealm } from '@/types/map';
import {
  EMPTY_MAP_FILTERS,
  filterAndSortRealmGroups,
  getLayoutTypeOptions,
  getMapSizeBucket,
  getPalletDensityOptions,
  hasActiveMapFilters,
  mapMatchesFilters,
  type MapAttributeFilters,
} from '@/utils/mapUtils';

function makeMap(overrides: Partial<MapRealm> & Pick<MapRealm, 'id' | 'name' | 'realm'>): MapRealm {
  return {
    layout_type: 'Outdoor',
    jungle_gyms_count: 3,
    totem_spawns_count: 5,
    pallet_density: 'Medium',
    is_shack: true,
    is_main_building: true,
    size_sq_meters: 9500,
    ...overrides,
  };
}

const lodge = makeMap({ id: 1, name: 'Blood Lodge', realm: 'Autohaven Wreckers', pallet_density: 'High', size_sq_meters: 8448 });
const azarov = makeMap({ id: 2, name: "Azarov's Resting Place", realm: 'Autohaven Wreckers', size_sq_meters: 11264 });
const lab = makeMap({ id: 3, name: 'Hawkins Lab', realm: 'Hawkins', layout_type: 'Indoor', pallet_density: 'Very High', size_sq_meters: null, is_shack: false, is_main_building: false });
const groups = [
  { realm: 'Autohaven Wreckers', maps: [lodge, azarov] },
  { realm: 'Hawkins', maps: [lab] },
];

test('getMapSizeBucket splits sizes at 9000 and 10000 m²', () => {
  assert.strictEqual(getMapSizeBucket(8999), 'small');
  assert.strictEqual(getMapSizeBucket(9000), 'medium');
  assert.strictEqual(getMapSizeBucket(9999), 'medium');
  assert.strictEqual(getMapSizeBucket(10000), 'large');
  assert.strictEqual(getMapSizeBucket(null), null);
});

test('hasActiveMapFilters is false only for the empty filter set', () => {
  assert.strictEqual(hasActiveMapFilters(EMPTY_MAP_FILTERS), false);
  assert.strictEqual(hasActiveMapFilters({ ...EMPTY_MAP_FILTERS, size: 'large' }), true);
});

test('mapMatchesFilters combines every active filter', () => {
  assert.ok(mapMatchesFilters(lodge, EMPTY_MAP_FILTERS));
  assert.ok(mapMatchesFilters(lodge, { layoutType: 'Outdoor', palletDensity: 'High', size: 'small', structure: null }));
  assert.ok(!mapMatchesFilters(lodge, { layoutType: 'Outdoor', palletDensity: 'High', size: 'large', structure: null }));
  assert.ok(!mapMatchesFilters(lab, { ...EMPTY_MAP_FILTERS, size: 'small' }), 'maps without a size never match a size filter');
});

test('mapMatchesFilters checks shack and main building presence', () => {
  const only = (structure: MapAttributeFilters['structure']) => ({ ...EMPTY_MAP_FILTERS, structure });
  assert.ok(mapMatchesFilters(lodge, only('shack')));
  assert.ok(!mapMatchesFilters(lab, only('shack')));
  assert.ok(mapMatchesFilters(lab, only('no_shack')));
  assert.ok(mapMatchesFilters(lodge, only('main_building')));
  assert.ok(mapMatchesFilters(lab, only('no_main_building')));
  assert.ok(!mapMatchesFilters(lodge, only('no_main_building')));
});

test('option helpers list distinct values in display order', () => {
  const all = [lodge, azarov, lab];
  assert.deepStrictEqual(getLayoutTypeOptions(all), ['Indoor', 'Outdoor']);
  assert.deepStrictEqual(getPalletDensityOptions(all), ['Medium', 'High', 'Very High']);
});

test('filterAndSortRealmGroups drops empty realms and keeps only matching maps', () => {
  const result = filterAndSortRealmGroups(groups, { ...EMPTY_MAP_FILTERS, layoutType: 'Outdoor' }, 'az');
  assert.deepStrictEqual(
    result.map((g) => [g.realm, g.maps.map((m) => m.id)]),
    [['Autohaven Wreckers', [2, 1]]]
  );
});

test('filterAndSortRealmGroups orders realms and maps Z to A', () => {
  const result = filterAndSortRealmGroups(groups, EMPTY_MAP_FILTERS, 'za');
  assert.deepStrictEqual(
    result.map((g) => [g.realm, g.maps.map((m) => m.id)]),
    [['Hawkins', [3]], ['Autohaven Wreckers', [1, 2]]]
  );
});
