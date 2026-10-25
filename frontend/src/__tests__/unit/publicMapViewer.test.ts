import test from 'node:test';
import assert from 'node:assert/strict';
import { getMapImageSrc, getMapThumbSrc } from '@/utils/mapUtils';
import type { MapRealm } from '@/types/map';

test('getMapImageSrc resolves the callout WebP image path directly without relying on layout SVG data URI', () => {
  const map: MapRealm = {
    id: 1,
    name: "Azarov's Resting Place",
    realm: 'Autohaven Wreckers',
    callout_image_local_path: 'maps/callouts/lemondbd/autohaven_wreckers/azarovs_resting_place.webp',
    layout_type: 'Outdoor',
    pallet_density: 'Medium',
    jungle_gyms_count: 3,
    is_shack: true,
    is_main_building: true,
  };

  const src = getMapImageSrc(map, 'http://localhost:5000');
  assert.equal(src, 'http://localhost:5000/static/maps/callouts/lemondbd/autohaven_wreckers/azarovs_resting_place.webp');
});

test('getMapThumbSrc resolves the callout thumbnail path without relying on layout SVG data URI', () => {
  const map: MapRealm = {
    id: 1,
    name: "Azarov's Resting Place",
    realm: 'Autohaven Wreckers',
    callout_image_local_path: 'maps/callouts/lemondbd/autohaven_wreckers/azarovs_resting_place.webp',
    layout_type: 'Outdoor',
    pallet_density: 'Medium',
    jungle_gyms_count: 3,
    is_shack: true,
    is_main_building: true,
  };

  const src = getMapThumbSrc(map, 'http://localhost:5000');
  assert.equal(src, 'http://localhost:5000/api/v1/maps/thumb/callouts/lemondbd/autohaven_wreckers/azarovs_resting_place.webp');
});
