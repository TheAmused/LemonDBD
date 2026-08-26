// frontend/src/utils/__tests__/mapLandmarks.test.ts
import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getMapLandmarks,
  normalizeLandmarkKey,
  MAP_LANDMARKS_DICTIONARY,
  REALM_LANDMARKS_DICTIONARY,
} from '@/utils/mapLandmarks';
import { MapLegendDrawer } from '@/utils/../components/maps/MapLegendDrawer';

// ─── 1. Key Normalization Tests ───────────────────────────────────────────────
test('normalizeLandmarkKey cleans casing, whitespace, punctuation, and diacritics', () => {
  assert.strictEqual(normalizeLandmarkKey("Azarov's Resting Place"), 'azarovsrestingplace');
  assert.strictEqual(normalizeLandmarkKey("Léry's Memorial Institute"), 'lerysmemorialinstitute');
  assert.strictEqual(normalizeLandmarkKey('Father Campbell’s Chapel'), 'fathercampbellschapel');
  assert.strictEqual(normalizeLandmarkKey('  Mount Ormond Resort (v1)  '), 'mountormondresortv1');
  assert.strictEqual(normalizeLandmarkKey(''), '');
});

// ─── 2. Canonical Map Callout Resolutions ─────────────────────────────────────
test('getMapLandmarks resolves accurate rich landmarks for Autohaven maps', () => {
  const azarov = getMapLandmarks("Azarov's Resting Place", 'Autohaven Wreckers', 'hens333');
  assert.ok(azarov.twelve_o_clock.includes("Azarov's Office"));
  assert.ok(azarov.six_o_clock.includes('Killer Shack'));
  assert.ok(azarov.center?.includes('Chokepoint') || azarov.center?.includes('Spine'));

  const gasHeaven = getMapLandmarks('Gas Heaven', 'Autohaven Wreckers', 'hens333');
  assert.ok(gasHeaven.twelve_o_clock.includes('Gas Station'));
  assert.ok(gasHeaven.nine_o_clock.includes('Jungle Gym'));
  assert.ok(gasHeaven.center?.includes('Scrap Heap') || gasHeaven.center?.includes('Flatbed'));

  const bloodLodge = getMapLandmarks('Blood Lodge', 'Autohaven Wreckers', 'hens333');
  assert.ok(bloodLodge.twelve_o_clock.includes('Blood Lodge'));
  assert.ok(bloodLodge.six_o_clock.includes('Killer Shack'));
});

test('getMapLandmarks resolves accurate rich landmarks for Coldwind Farm maps', () => {
  const cowshed = getMapLandmarks('Fractured Cowshed', 'Coldwind Farm', 'hens333');
  assert.ok(cowshed.twelve_o_clock.includes('Fractured Cowshed') || cowshed.twelve_o_clock.includes('God Window'));
  assert.ok(cowshed.nine_o_clock.includes('Harvester') || cowshed.nine_o_clock.includes('Combine'));

  const thompson = getMapLandmarks('Thompson House', 'Coldwind Farm', 'hens333');
  assert.ok(thompson.twelve_o_clock.includes('Thompson Manor') || thompson.twelve_o_clock.includes('Porch'));

  const abattoir = getMapLandmarks('Rancid Abattoir', 'Coldwind Farm', 'hens333');
  assert.ok(abattoir.twelve_o_clock.includes('Slaughterhouse') || abattoir.twelve_o_clock.includes('Pig Hooks'));

  const torment = getMapLandmarks('Torment Creek', 'Coldwind Farm', 'hens333');
  assert.ok(torment.twelve_o_clock.includes('Silo') || torment.twelve_o_clock.includes('Barn'));
});

test('getMapLandmarks resolves accurate rich landmarks for MacMillan Estate maps', () => {
  const coal = getMapLandmarks('Coal Tower', 'The MacMillan Estate', 'hens333');
  assert.ok(coal.twelve_o_clock.includes('Coal Tower'));
  assert.ok(coal.six_o_clock.includes('Killer Shack'));

  const ironworks = getMapLandmarks('Ironworks of Misery', 'The MacMillan Estate', 'hens333');
  assert.ok(ironworks.twelve_o_clock.includes('Ironworks') || ironworks.twelve_o_clock.includes('Kiln'));

  const storehouse = getMapLandmarks('Groaning Storehouse', 'The MacMillan Estate', 'hens333');
  assert.ok(storehouse.twelve_o_clock.includes('Storehouse') || storehouse.twelve_o_clock.includes('Timber'));

  const shelter = getMapLandmarks('Shelter Woods', 'The MacMillan Estate', 'hens333');
  assert.ok(shelter.twelve_o_clock.includes('Oak Tree'));
});

test('getMapLandmarks resolves accurate rich landmarks for Badham Preschool variants', () => {
  for (const variant of ['Preschool I', 'Preschool II', 'Preschool III', 'Preschool IV', 'Preschool V']) {
    const landmarks = getMapLandmarks(variant, 'Springwood', 'hens333');
    assert.ok(landmarks.twelve_o_clock.includes('Badham') || landmarks.twelve_o_clock.includes('Preschool'));
    assert.ok(landmarks.six_o_clock.includes('Killer Shack'));
    assert.ok(landmarks.three_o_clock.length > 0);
    assert.ok(landmarks.nine_o_clock.length > 0);
  }
});

test('getMapLandmarks resolves iconic licensed and unique DBD maps', () => {
  // RPD East & West
  const rpdEast = getMapLandmarks('Police Station East Wing', 'Raccoon City', 'hens333');
  assert.ok(rpdEast.twelve_o_clock.includes('RPD Main Lobby') || rpdEast.twelve_o_clock.includes('Goddess Statue'));
  assert.ok(rpdEast.three_o_clock.includes('Helipad') || rpdEast.three_o_clock.includes('Helicopter'));

  const rpdWest = getMapLandmarks('Police Station West Wing', 'Raccoon City', 'hens333');
  assert.ok(rpdWest.nine_o_clock.includes('Library') || rpdWest.nine_o_clock.includes('Bookshelves'));

  // Dead Dawg Saloon
  const saloon = getMapLandmarks('Dead Dawg Saloon', 'Grave of Glennvale', 'hens333');
  assert.ok(saloon.twelve_o_clock.includes('Saloon') || saloon.twelve_o_clock.includes('Balcony'));
  assert.ok(saloon.three_o_clock.includes('Gallows'));

  // Midwich
  const midwich = getMapLandmarks('Midwich Elementary School', 'Silent Hill', 'hens333');
  assert.ok(midwich.center?.includes('Clock Tower') || midwich.center?.includes('Courtyard'));

  // The Game
  const theGame = getMapLandmarks('The Game', 'Gideon Meat Plant', 'hens333');
  assert.ok(theGame.twelve_o_clock.includes('Bathrooms') || theGame.twelve_o_clock.includes('Upper'));
  assert.ok(theGame.three_o_clock.includes('Freezer') || theGame.three_o_clock.includes('Pig Carcasses'));

  // Hawkins
  const hawkins = getMapLandmarks('The Underground Complex', 'Hawkins National Laboratory', 'hens333');
  assert.ok(hawkins.twelve_o_clock.includes('Rift') || hawkins.twelve_o_clock.includes('Portal'));

  // Nostromo & Toba
  const nostromo = getMapLandmarks('Nostromo Wreckage', 'Dvarka Deepwood', 'hens333');
  assert.ok(nostromo.twelve_o_clock.includes('Nostromo') || nostromo.twelve_o_clock.includes('Cryo'));

  // Freddy Fazbear's Pizza
  const fnaf = getMapLandmarks("Freddy Fazbear's Pizza", 'Withered Isle', 'hens333');
  assert.ok(fnaf.twelve_o_clock.includes('Stage') || fnaf.twelve_o_clock.includes('Animatronic'));
  assert.ok(fnaf.three_o_clock.includes('Pirate Cove') || fnaf.three_o_clock.includes('Kitchen'));

  // Garden of Joy
  const garden = getMapLandmarks('Garden of Joy', 'Withered Isle', 'hens333');
  assert.ok(garden.twelve_o_clock.includes('Manor') || garden.twelve_o_clock.includes('Colonial'));
  assert.ok(garden.three_o_clock.includes('Greenhouse'));
});

// ─── 3. Realm Fallback & Intelligent Resolution Tests ─────────────────────────
test('getMapLandmarks falls back to realm-level landmarks for unknown map names', () => {
  const customColdwind = getMapLandmarks('Unknown Barn Variant 7', 'Coldwind Farm', 'hens333');
  assert.ok(customColdwind.twelve_o_clock.includes('Farm Manor') || customColdwind.twelve_o_clock.includes('Slaughterhouse'));
  assert.ok(customColdwind.three_o_clock.includes('Cornfield') || customColdwind.three_o_clock.includes('Windmill'));

  const customYamaoka = getMapLandmarks('New Shrine Arena', 'Yamaoka Estate', 'hens333');
  assert.ok(customYamaoka.three_o_clock.includes('Bamboo') || customYamaoka.three_o_clock.includes('Torii'));

  const customMacMillan = getMapLandmarks('Custom Steel Mill', 'MacMillan Estate', 'hens333');
  assert.ok(customMacMillan.twelve_o_clock.includes('Industrial Brick Factory') || customMacMillan.twelve_o_clock.includes('Smelting'));
});

test('getMapLandmarks generates robust directional defaults for completely unknown input', () => {
  const unknown = getMapLandmarks('Completely Imaginary Map', 'Alien Dimension', 'hens333');
  assert.ok(unknown.twelve_o_clock.includes('North'));
  assert.ok(unknown.three_o_clock.includes('East'));
  assert.ok(unknown.six_o_clock.includes('South') || unknown.six_o_clock.includes('Shack'));
  assert.ok(unknown.nine_o_clock.includes('West'));
  assert.ok(unknown.center?.includes('Center'));
});

// ─── 4. Source Specific Conventions (Hens vs SamoelColt) ──────────────────────
test('getMapLandmarks handles SamoelColt and Hens source descriptions', () => {
  const hensCallouts = getMapLandmarks('Ironworks of Misery', 'The MacMillan Estate', 'hens333');
  assert.ok(hensCallouts.description?.includes('Ironworks') || hensCallouts.description?.includes('12-Clock'));

  const samoelCallouts = getMapLandmarks('Ironworks of Misery', 'The MacMillan Estate', 'samoelcolt');
  assert.ok(samoelCallouts.description?.includes('Isometric') || samoelCallouts.description?.includes('Ironworks'));
});

// ─── 5. MapLegendDrawer Integration Tests ─────────────────────────────────────
test('MapLegendDrawer resolves rich landmark callouts when clockSystem has generic placeholders', () => {
  const genericClockSystem = {
    twelve_o_clock: 'North Sector',
    three_o_clock: 'East Sector',
    six_o_clock: 'South Sector',
    nine_o_clock: 'West Sector',
  };

  const html = renderToStaticMarkup(
    React.createElement(MapLegendDrawer, {
      mapName: "Azarov's Resting Place",
      realmName: 'Autohaven Wreckers',
      clockSystem: genericClockSystem,
      source: 'samoelcolt',
      isOpen: true,
    })
  );

  // Sector titles
  assert.ok(html.includes('North Sector'));
  assert.ok(html.includes('East Sector'));
  assert.ok(html.includes('South Sector'));
  assert.ok(html.includes('West Sector'));

  // Resolved rich landmarks
  assert.ok(html.includes("Azarov&#x27;s Office") || html.includes("Azarov's Office"));
  assert.ok(html.includes('Killer Shack'));

  // Center Landmark Highlight
  assert.ok(html.includes('data-testid="map-legend-sector-center"'));
  assert.ok(html.includes('Center Landmark / Objective'));
  assert.ok(html.includes('Chokepoint') || html.includes('Spine'));
});

test('MapLegendDrawer resolves rich landmark callouts when clockSystem is omitted', () => {
  const html = renderToStaticMarkup(
    React.createElement(MapLegendDrawer, {
      mapName: 'Dead Dawg Saloon',
      realmName: 'Grave of Glennvale',
      source: 'hens333',
      isOpen: true,
    })
  );

  assert.ok(html.includes('12-Clock Callout System'));
  assert.ok(html.includes('Dead Dawg Saloon') || html.includes('Saloon'));
  assert.ok(html.includes('Gallows'));
  assert.ok(html.includes('Killer Shack'));
  assert.ok(html.includes('data-testid="map-legend-sector-center"'));
  assert.ok(html.includes('Sheriff Carriage') || html.includes('Main Street'));
});

test('MapLegendDrawer respects explicit custom non-generic clockSystem values', () => {
  const customClockSystem = {
    description: 'Custom tournament callout configuration',
    twelve_o_clock: 'Tournament Top Spawn A',
    three_o_clock: 'Tournament East Gen Cluster B',
    six_o_clock: 'Tournament Basement Shack C',
    nine_o_clock: 'Tournament West God Pallet D',
    center: 'Tournament Center Main Objective E',
  };

  const html = renderToStaticMarkup(
    React.createElement(MapLegendDrawer, {
      mapName: 'Coal Tower',
      realmName: 'The MacMillan Estate',
      clockSystem: customClockSystem,
      source: 'hens333',
      isOpen: true,
    })
  );

  assert.ok(html.includes('Tournament Top Spawn A'));
  assert.ok(html.includes('Tournament East Gen Cluster B'));
  assert.ok(html.includes('Tournament Basement Shack C'));
  assert.ok(html.includes('Tournament West God Pallet D'));
  assert.ok(html.includes('Tournament Center Main Objective E'));
  assert.ok(html.includes('Custom tournament callout configuration'));
});
