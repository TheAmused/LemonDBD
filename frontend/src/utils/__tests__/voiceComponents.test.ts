import test from 'node:test';
import assert from 'node:assert';
import { matchVoiceQuery, getVariantsForMap } from '../mapVoiceMatcher';
import { VoiceCommandBanner } from '../../components/maps/VoiceCommandBanner';
import { VoiceNavButton } from '../../components/maps/VoiceNavButton';

test('VoiceCommandBanner and VoiceNavButton are properly exported functions/components', () => {
  assert.strictEqual(typeof VoiceCommandBanner, 'function');
  assert.strictEqual(typeof VoiceNavButton, 'function');
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
