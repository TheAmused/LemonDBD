// frontend/src/__tests__/unit/maps/mapCard.test.ts
import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';
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
  pallet_density: 'Medium',
  is_shack: true,
  is_main_building: true,
  size_sq_tiles: 176.0,
  size_sq_meters: 11264,
  description: 'Iconic dumbbell-shaped map',
  callout_image_url: 'https://hens333.com/img/dbd/callouts/Azarovs/Azarovs%20Resting%20Place.webp',
  callout_image_local_path: 'maps/callouts/hens333/azarovs/azarovs_resting_place.webp',
};

test('MapCard renders the map name as a visible label', () => {
  const html = renderWithDictionary(
    React.createElement(MapCard, {
      map: sampleMap,
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(html.includes("Azarov&#x27;s Resting Place") || html.includes("Azarov's Resting Place"));
});

test('MapCard resolves the local static image path', () => {
  const html = renderWithDictionary(
    React.createElement(MapCard, {
      map: sampleMap,
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(html.includes('http://localhost:5000/api/v1/thumbs/maps/320/callouts/hens333/azarovs/azarovs_resting_place.webp'));
});

test('MapCard falls back to the remote callout URL when no local path is set', () => {
  const remoteOnlyMap: MapRealm = { ...sampleMap, callout_image_local_path: undefined };
  const html = renderWithDictionary(
    React.createElement(MapCard, {
      map: remoteOnlyMap,
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(html.includes('https://hens333.com/img/dbd/callouts/Azarovs/Azarovs%20Resting%20Place.webp'));
});

test('A retired map stays a normal, clickable button, greyed with a filter (not opacity)', () => {
  const html = renderWithDictionary(
    React.createElement(MapCard, {
      map: { ...sampleMap, is_retired: true },
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(!/<button[^>]*\sdisabled(=|\s|>)/.test(html), 'a retired map can be opened');
  assert.ok(html.includes('grayscale'), 'it is greyed out');
  assert.ok(!html.includes('opacity-50'), 'a see-through card would show the background particles');
  assert.ok(html.includes('Removed from the game'));
});

test('MapCard shows the in-game photo thumbnail when the map has one', () => {
  const photoMap: MapRealm = { ...sampleMap, photo_local_path: 'maps/photos/autohaven_wreckers/azarovs_resting_place.webp' };
  const html = renderWithDictionary(
    React.createElement(MapCard, { map: photoMap, backendBase: 'http://localhost:5000', onSelect: () => {} })
  );
  assert.ok(html.includes('http://localhost:5000/api/v1/thumbs/maps/320/photos/autohaven_wreckers/azarovs_resting_place.webp'));
  assert.ok(!html.includes('callouts/hens333'));
  assert.ok(html.includes('object-cover'));
});

test('A variation after the first is marked as removed from the game but stays clickable', () => {
  const render = (name: string) =>
    renderWithDictionary(
      React.createElement(MapCard, { map: { ...sampleMap, name }, backendBase: 'http://localhost:5000', onSelect: () => {} })
    );
  const second = render('Coal Tower II');
  assert.ok(second.includes('Removed from the game') && second.includes('grayscale'));
  assert.ok(!/<button[^>]*\sdisabled(=|\s|>)/.test(second));
  assert.ok(!render('Preschool I').includes('Removed from the game'), 'the first variation is the map itself');
  assert.ok(!render('Coal Tower').includes('Removed from the game'));
});
