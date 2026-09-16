// frontend/src/__tests__/unit/fullscreenMapEngine.test.ts
import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FullscreenMapEngine } from '@/components/maps/FullscreenMapEngine';
import type { MapRealm } from '@/types/map';

const sampleOutdoorMap: MapRealm = {
  id: 1,
  name: "Azarov's Resting Place",
  realm: 'Autohaven Wreckers',
  realm_id: 2,
  source_id: 1,
  source: 'hens333',
  source_label: 'Hens333 12-Clock Callouts',
  layout_type: 'Outdoor',
  jungle_gyms_count: 4,
  totem_spawns_count: 5,
  pallet_density: 'Medium',
  is_shack: true,
  is_main_building: true,
  size_sq_tiles: 176.0,
  size_sq_meters: 11264,
  description: 'Dumbbell-shaped tactical Autohaven layout',
  callout_image_url: 'https://hens333.com/img/dbd/callouts/Azarovs/Azarovs%20Resting%20Place.webp',
};

const sampleIndoorMap: MapRealm = {
  id: 43,
  name: 'The Game',
  realm: 'Gideon Meat Plant',
  realm_id: 10,
  source_id: 1,
  source: 'hens333',
  source_label: 'Hens333 12-Clock Callouts',
  layout_type: 'Indoor',
  jungle_gyms_count: 0,
  totem_spawns_count: 5,
  pallet_density: 'Very High',
  is_shack: false,
  is_main_building: false,
  size_sq_tiles: 142.0,
  size_sq_meters: 9088,
  description: 'Multistory meat processing facility',
  callout_image_url: 'https://hens333.com/img/dbd/callouts/Other/The%20Game.webp',
};

const sampleMidwichMap: MapRealm = {
  id: 45,
  name: 'Midwich Elementary School',
  realm: 'Silent Hill',
  realm_id: 15,
  source_id: 1,
  source: 'hens333',
  source_label: 'Hens333 12-Clock Callouts',
  layout_type: 'Indoor',
  jungle_gyms_count: 0,
  totem_spawns_count: 5,
  pallet_density: 'Low',
  is_shack: false,
  is_main_building: false,
  size_sq_tiles: 113.5,
  size_sq_meters: 7264,
  description: 'Silent Hill nightmare school',
  callout_image_url: 'https://hens333.com/img/dbd/callouts/Other/Midwich.gif',
};

test('FullscreenMapEngine renders outdoor map tactical intel badges and telemetry', () => {
  const html = renderToStaticMarkup(
    React.createElement(FullscreenMapEngine, {
      mapId: 1,
      availableMaps: [sampleOutdoorMap],
      backendBase: 'http://localhost:5000',
      onClose: () => {},
    })
  );

  assert.ok(html.includes("Azarov&#x27;s Resting Place") || html.includes("Azarov's Resting Place"));
  assert.ok(html.includes('Autohaven Wreckers'));
  assert.ok(html.includes('Outdoor'));
  assert.ok(html.includes('>176<'));
  assert.ok(html.includes('11,264 m²'));
  assert.ok(html.includes('Pallets: Average'));
  assert.ok(html.includes('4 Gyms'));
  assert.ok(html.includes('5 Totems'));
  assert.ok(html.includes('>Shack<'));
  assert.ok(html.includes('>Main Building<'));
});

test('FullscreenMapEngine renders indoor map tactical intel without shack and 0 maze tiles', () => {
  const html = renderToStaticMarkup(
    React.createElement(FullscreenMapEngine, {
      mapId: 43,
      availableMaps: [sampleIndoorMap],
      backendBase: 'http://localhost:5000',
      onClose: () => {},
    })
  );

  assert.ok(html.includes('The Game'));
  assert.ok(html.includes('Gideon Meat Plant'));
  assert.ok(html.includes('Indoor'));
  assert.ok(html.includes('>142<'));
  assert.ok(html.includes('9,088 m²'));
  assert.ok(html.includes('Pallets: Very many'));
  assert.ok(html.includes('0 Gyms'));
  assert.ok(html.includes('No Shack'));
  assert.ok(html.includes('No Main Building'));
});

test('FullscreenMapEngine renders float tile size accurately', () => {
  const html = renderToStaticMarkup(
    React.createElement(FullscreenMapEngine, {
      mapId: 45,
      availableMaps: [sampleMidwichMap],
      backendBase: 'http://localhost:5000',
      onClose: () => {},
    })
  );

  assert.ok(html.includes('Midwich Elementary School'));
  assert.ok(html.includes('>113.5<'));
  assert.ok(html.includes('7,264 m²'));
});
