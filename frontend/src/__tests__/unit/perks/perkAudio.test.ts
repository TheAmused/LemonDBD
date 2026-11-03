// frontend/src/__tests__/unit/perks/perkAudio.test.ts
// frontend/src/utils/__tests__/perkAudio.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  getAudioEnabled,
  playReelTick,
  playReelThud,
  playCardFlip,
  playFanfare,
  playCurseSound,
  playClick,
} from '@/utils/perkAudio';

test('perkAudio: audio state defaults to true outside a browser', () => {
  // In node environment without window, should safely return true
  assert.strictEqual(getAudioEnabled(), true);
});

test('perkAudio: audio triggers execute without crashing in non-browser environments', () => {
  assert.doesNotThrow(() => playReelTick());
  assert.doesNotThrow(() => playReelThud());
  assert.doesNotThrow(() => playCardFlip());
  assert.doesNotThrow(() => playFanfare());
  assert.doesNotThrow(() => playCurseSound());
  assert.doesNotThrow(() => playClick());
});
