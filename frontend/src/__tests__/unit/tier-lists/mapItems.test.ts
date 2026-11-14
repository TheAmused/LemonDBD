// frontend/src/__tests__/unit/tier-lists/mapItems.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { mapsToItems } from '@/utils/tierLists/items';
import type { MapRealm } from '@/types/map';

function map(id: number, name: string, extra: Partial<MapRealm> = {}): MapRealm {
  return {
    id,
    name,
    realm: 'Realm',
    layout_type: 'Outdoor',
    pallet_density: 'Medium',
    jungle_gyms_count: 3,
    is_shack: true,
    is_main_building: false,
    ...extra,
  };
}

test('mapsToItems keeps one entry per map: variation I without its numeral, later variations dropped', () => {
  const items = mapsToItems([
    map(6, 'Preschool I'),
    map(7, 'Preschool II'),
    map(10, 'Preschool V'),
    map(23, 'Coal Tower'),
    map(54, 'Coal Tower II'),
    map(48, 'Mount Ormond Resort III'),
  ]);
  assert.deepEqual(items.map((i) => [i.key, i.name]), [['map:23', 'Coal Tower'], ['map:6', 'Preschool']]);
});

test('mapsToItems tells variations apart by the English name, so a translated name is cut too', () => {
  const items = mapsToItems([
    map(6, 'Przedszkole w Badham I', { raw_name: 'Preschool I' }),
    map(7, 'Przedszkole w Badham II', { raw_name: 'Preschool II' }),
  ]);
  assert.deepEqual(items.map((i) => i.name), ['Przedszkole w Badham']);
});
