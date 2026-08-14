import test from 'node:test';
import assert from 'node:assert';
import { matchVoiceQuery, getVariantsForMap, MAP_VARIANT_GROUPS } from '../mapVoiceMatcher';
import { VoiceCommandBanner } from '../../components/maps/VoiceCommandBanner';
import { VoiceNavButton } from '../../components/maps/VoiceNavButton';
import { MapExplorer } from '../../components/maps/MapExplorer';
import { FullscreenMapEngine } from '../../components/maps/FullscreenMapEngine';

test('VoiceCommandBanner, VoiceNavButton, MapExplorer, and FullscreenMapEngine are properly exported functions/components', () => {
  assert.strictEqual(typeof VoiceCommandBanner, 'function');
  assert.strictEqual(typeof VoiceNavButton, 'function');
  assert.strictEqual(typeof MapExplorer, 'function');
  assert.strictEqual(typeof FullscreenMapEngine, 'function');
});

test('VoiceCommandBanner props interface and match handling integration', () => {
  const mockMaps = [
    { id: 'hens_azarovs_resting_place', name: "Azarov's Resting Place", realm: 'Autohaven Wreckers', source: 'hens333' },
    { id: 'samoel_dead_dawg', name: 'Dead Dawg Saloon', realm: 'Grave of Glennvale', source: 'samoelcolt' },
  ];

  // Test map matching flow
  const mapResult = matchVoiceQuery("Azarov's", 'hens333', mockMaps);
  assert.ok(mapResult);
  assert.strictEqual(mapResult.matchedMapName, "Azarov's Resting Place");
  assert.strictEqual(mapResult.matchedMapId, 'hens_azarovs_resting_place');

  // Test source switching flow
  const sourceResult = matchVoiceQuery('switch to samoel', 'hens333');
  assert.ok(sourceResult);
  assert.strictEqual(sourceResult.action, 'switch_source');
  assert.strictEqual(sourceResult.actionPayload, 'samoelcolt');

  // Test action commands flow
  const zoomInResult = matchVoiceQuery('zoom in');
  assert.ok(zoomInResult);
  assert.strictEqual(zoomInResult.action, 'zoom_in');

  const fullscreenResult = matchVoiceQuery('fullscreen');
  assert.ok(fullscreenResult);
  assert.strictEqual(fullscreenResult.action, 'fullscreen');

  const closeResult = matchVoiceQuery('close');
  assert.ok(closeResult);
  assert.strictEqual(closeResult.action, 'close');

  // Test variant disambiguation pills resolution
  const badhamVariants = getVariantsForMap('Preschool I');
  assert.ok(Array.isArray(badhamVariants));
  assert.strictEqual(badhamVariants.length, 5);
  assert.ok(badhamVariants.includes('Preschool II'));

  const rpdVariants = getVariantsForMap('Police Station East Wing');
  assert.ok(Array.isArray(rpdVariants));
  assert.strictEqual(rpdVariants.length, 2);
  assert.ok(rpdVariants.includes('Police Station West Wing'));
});

test('Variant disambiguation covers all DBD map families for MapExplorer switcher', () => {
  // Coal Tower
  const coalVariants = getVariantsForMap('Coal Tower');
  assert.strictEqual(coalVariants.length, 2);
  assert.ok(coalVariants.includes('Coal Tower II'));

  // Groaning Storehouse
  const storehouseVariants = getVariantsForMap('Groaning Storehouse II');
  assert.strictEqual(storehouseVariants.length, 2);
  assert.ok(storehouseVariants.includes('Groaning Storehouse'));

  // Ironworks of Misery
  const ironworksVariants = getVariantsForMap('Ironworks Of Misery');
  assert.strictEqual(ironworksVariants.length, 2);
  assert.ok(ironworksVariants.includes('Ironworks Of Misery II'));

  // Shelter Woods
  const shelterVariants = getVariantsForMap('Shelter Woods II');
  assert.strictEqual(shelterVariants.length, 2);
  assert.ok(shelterVariants.includes('Shelter Woods'));

  // Suffocation Pit
  const suffocationVariants = getVariantsForMap('Suffocation Pit');
  assert.strictEqual(suffocationVariants.length, 2);
  assert.ok(suffocationVariants.includes('Suffocation Pit II'));

  // Family Residence
  const familyVariants = getVariantsForMap('Family Residence II');
  assert.strictEqual(familyVariants.length, 2);
  assert.ok(familyVariants.includes('Family Residence'));

  // Sanctum of Wrath
  const sanctumVariants = getVariantsForMap('Sanctum of Wrath');
  assert.strictEqual(sanctumVariants.length, 2);
  assert.ok(sanctumVariants.includes('Sanctum of Wrath II'));

  // Mount Ormond
  const ormondVariants = getVariantsForMap('Mount Ormond Resort III');
  assert.strictEqual(ormondVariants.length, 3);
  assert.ok(ormondVariants.includes('Mount Ormond Resort'));
  assert.ok(ormondVariants.includes('Mount Ormond Resort II'));

  // Non-variant map returns empty array
  const singleMapVariants = getVariantsForMap('The Game');
  assert.deepStrictEqual(singleMapVariants, []);
});

