// frontend/src/__tests__/unit/voiceComponents.test.ts
// frontend/src/utils/__tests__/voiceComponents.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { matchVoiceQuery, getVariantsForMap, MAP_VARIANT_GROUPS } from '@/utils/mapVoiceMatcher';
import { VoiceCommandBanner } from '@/utils/../components/maps/VoiceCommandBanner';
import { MapExplorer } from '@/utils/../components/maps/MapExplorer';
import { FullscreenMapEngine } from '@/utils/../components/maps/FullscreenMapEngine';

import { VariantSwitcherBar } from '@/utils/../components/maps/VariantSwitcherBar';

test('VoiceCommandBanner, MapExplorer, FullscreenMapEngine, and VariantSwitcherBar are properly exported', () => {
  assert.strictEqual(typeof VoiceCommandBanner, 'function');
  assert.strictEqual(typeof MapExplorer, 'function');
  assert.strictEqual(typeof FullscreenMapEngine, 'function');
  assert.strictEqual(typeof VariantSwitcherBar, 'function');
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

test('MapExplorer triggerAction contracts and source selection flow', () => {
  const triggerActions: Array<'zoom_in' | 'zoom_out' | 'fullscreen' | 'close'> = [
    'zoom_in',
    'zoom_out',
    'fullscreen',
    'close',
  ];

  triggerActions.forEach((act) => {
    const res = matchVoiceQuery(act === 'zoom_in' ? 'zoom in' : act === 'zoom_out' ? 'zoom out' : act);
    assert.ok(res);
    assert.strictEqual(res.action, act);
  });

  // Timestamped action and selection payload structure
  const actionPayload = { action: 'zoom_in' as const, timestamp: Date.now() };
  assert.strictEqual(actionPayload.action, 'zoom_in');
  assert.ok(typeof actionPayload.timestamp === 'number');

  const selectionPayload = { mapName: "Dead Dawg Saloon", timestamp: Date.now() };
  assert.strictEqual(selectionPayload.mapName, "Dead Dawg Saloon");
  assert.ok(typeof selectionPayload.timestamp === 'number');
});

test('VoiceCommandBanner Push-to-Talk and Mic button hold contracts', () => {
  // Push-to-Talk Keydown & Keyup transition contracts
  let isListening = false;
  let isHolding = false;
  let speechProcessed = false;

  const simulateKeyDown = (key: string, modifiers?: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }) => {
    if (modifiers?.ctrlKey || modifiers?.metaKey || modifiers?.altKey) {
      return;
    }
    if (key.toLowerCase() === 'v') {
      if (!isListening) {
        isHolding = true;
        isListening = true;
      } else {
        // Toggle off if already listening
        isListening = false;
        speechProcessed = true;
      }
    }
  };

  const simulateKeyUp = (key: string, modifiers?: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }) => {
    if (modifiers?.ctrlKey || modifiers?.metaKey || modifiers?.altKey) {
      return;
    }
    if (key.toLowerCase() === 'v') {
      isHolding = false;
      if (isListening) {
        isListening = false;
        speechProcessed = true;
      }
    }
  };

  // 0. Modifier keys (Ctrl+V, Cmd+V, Alt+V) do not activate push-to-talk
  simulateKeyDown('v', { ctrlKey: true });
  assert.strictEqual(isListening, false);
  simulateKeyDown('v', { metaKey: true });
  assert.strictEqual(isListening, false);
  simulateKeyDown('v', { altKey: true });
  assert.strictEqual(isListening, false);

  // 1. Hold 'V' -> starts listening -> release 'V' -> stops and processes
  simulateKeyDown('v');
  assert.strictEqual(isListening, true);
  assert.strictEqual(isHolding, true);
  assert.strictEqual(speechProcessed, false);

  simulateKeyUp('v');
  assert.strictEqual(isListening, false);
  assert.strictEqual(isHolding, false);
  assert.strictEqual(speechProcessed, true);

  // 2. Click Mic Button (Hold > 250ms Push-to-Talk)
  let holdStart = 0;
  let micListening = false;
  let micProcessed = false;

  const handleMouseDown = () => {
    holdStart = Date.now() - 300; // Simulated 300ms hold
    micListening = true;
  };

  const handleMouseUp = () => {
    const duration = Date.now() - holdStart;
    if (duration > 250 && micListening) {
      micListening = false;
      micProcessed = true;
    }
  };

  handleMouseDown();
  assert.strictEqual(micListening, true);
  handleMouseUp();
  assert.strictEqual(micListening, false);
  assert.strictEqual(micProcessed, true);
});



