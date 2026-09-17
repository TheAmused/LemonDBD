// frontend/src/__tests__/unit/mapCard.test.ts
import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
  is_shack: true,
  is_main_building: true,
  size_sq_tiles: 176.0,
  size_sq_meters: 11264,
  description: 'Iconic dumbbell-shaped map',
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
