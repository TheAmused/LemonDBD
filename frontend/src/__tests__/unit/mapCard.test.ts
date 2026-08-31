// frontend/src/__tests__/unit/mapCard.test.ts
import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapCard } from '@/utils/../components/maps/MapCard';
import type { MapRealm } from '@/types/map';

const sampleMap: MapRealm = {
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
  callout_image_url: 'https://hens333.com/img/dbd/callouts/Azarovs/Azarovs%20Resting%20Place.webp',
  callout_image_local_path: 'maps/callouts/hens333/azarovs/azarovs_resting_place.webp',
};

test('MapCard renders the map name as a visible label', () => {
  const html = renderToStaticMarkup(
    React.createElement(MapCard, {
      map: sampleMap,
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(html.includes("Azarov&#x27;s Resting Place") || html.includes("Azarov's Resting Place"));
});

test('MapCard resolves the local static image path', () => {
  const html = renderToStaticMarkup(
    React.createElement(MapCard, {
      map: sampleMap,
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(html.includes('http://localhost:5000/static/maps/callouts/hens333/azarovs/azarovs_resting_place.webp'));
});

test('MapCard falls back to the remote callout URL when no local path is set', () => {
  const remoteOnlyMap: MapRealm = { ...sampleMap, callout_image_local_path: undefined };
  const html = renderToStaticMarkup(
    React.createElement(MapCard, {
      map: remoteOnlyMap,
      backendBase: 'http://localhost:5000',
      onSelect: () => {},
    })
  );
  assert.ok(html.includes('https://hens333.com/img/dbd/callouts/Azarovs/Azarovs%20Resting%20Place.webp'));
});
