import test from 'node:test';
import assert from 'node:assert/strict';
import { getMapImageSrc, getMapPhotoSrc, getMapThumbSrc } from '@/utils/mapUtils';
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
  assert.equal(src, 'http://localhost:5000/api/v1/thumbs/maps/320/callouts/lemondbd/autohaven_wreckers/azarovs_resting_place.webp');
});

test('getMapThumbSrc prefers the in-game photo, getMapPhotoSrc returns it full size', () => {
  const map: MapRealm = {
    id: 8,
    name: 'Coal Tower II',
    realm: 'The MacMillan Estate',
    callout_image_local_path: 'maps/callouts/lemondbd/the_macmillan_estate/coal_tower_ii.webp',
    photo_local_path: 'maps/photos/the_macmillan_estate/coal_tower.webp',
    layout_type: 'Outdoor',
    pallet_density: 'Medium',
    jungle_gyms_count: 3,
    is_shack: true,
    is_main_building: true,
  };

  assert.equal(getMapThumbSrc(map, 'http://localhost:5000'), 'http://localhost:5000/api/v1/thumbs/maps/320/photos/the_macmillan_estate/coal_tower.webp');
  assert.equal(getMapPhotoSrc(map, 'http://localhost:5000'), 'http://localhost:5000/static/maps/photos/the_macmillan_estate/coal_tower.webp');
  assert.equal(getMapPhotoSrc({ ...map, photo_local_path: undefined }, 'http://localhost:5000'), '');
});
