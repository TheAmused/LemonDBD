// frontend/src/__tests__/unit/mapFilters.test.ts
import test from 'node:test';
import assert from 'node:assert';
import type { MapRealm } from '@/types/map';
import {
  EMPTY_MAP_FILTERS,
  filterAndSortRealmGroups,
  getLayoutTypeOptions,
  getMapSizeBucket,
  hasActiveMapFilters,
  getLayoutTypeLabel,
  mapMatchesFilters,
} from '@/utils/mapUtils';
import pl from '@/locales/pl';

function makeMap(overrides: Partial<MapRealm> & Pick<MapRealm, 'id' | 'name' | 'realm'>): MapRealm {
  return {
    layout_type: 'Outdoor',
    jungle_gyms_count: 3,
    pallet_density: 'Medium',
    is_shack: true,
    is_main_building: true,
    size_sq_meters: 9500,
    ...overrides,
  };
}

const lodge = makeMap({ id: 1, name: 'Blood Lodge', realm: 'Autohaven Wreckers', size_sq_meters: 8448 });
const azarov = makeMap({ id: 2, name: "Azarov's Resting Place", realm: 'Autohaven Wreckers', size_sq_meters: 11264 });
const lab = makeMap({ id: 3, name: 'Hawkins Lab', realm: 'Hawkins', layout_type: 'Indoor', size_sq_meters: null, is_shack: false, is_main_building: false });
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
  assert.ok(mapMatchesFilters(lodge, { layoutType: 'Outdoor', size: 'small' }));
  assert.ok(!mapMatchesFilters(lodge, { layoutType: 'Outdoor', size: 'large' }));
  assert.ok(!mapMatchesFilters(lab, { ...EMPTY_MAP_FILTERS, size: 'small' }), 'maps without a size never match a size filter');
});

test('getLayoutTypeOptions lists distinct layouts alphabetically', () => {
  const all = [lodge, azarov, lab];
  assert.deepStrictEqual(getLayoutTypeOptions(all), ['Indoor', 'Outdoor']);
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

test('layout labels are translated, with English fallbacks', () => {
  assert.strictEqual(getLayoutTypeLabel('Outdoor', pl.maps), 'Otwarty');
  assert.strictEqual(getLayoutTypeLabel('Outdoor'), 'Outdoor');
  assert.strictEqual(getLayoutTypeLabel('Underwater', pl.maps), 'Underwater');
});
