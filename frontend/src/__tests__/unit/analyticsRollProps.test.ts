// frontend/src/__tests__/unit/analyticsRollProps.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRollProps } from '@/components/generator/lib/rollTracking';

describe('buildRollProps', () => {
  it('describes a plain survivor roll', () => {
    assert.deepEqual(
      buildRollProps({
        mode: 'tarot',
        role: 'Survivor',
        blindMode: false,
        activeMutator: null,
        noRepeatPerks: true,
        audioEnabled: true,
      }),
      { mode: 'tarot', role: 'survivor', blind: false, curse: 'none', no_repeat: true, sound: 'on' }
    );
  });

  it('reports the active curse id, blind mode and sound off for a killer', () => {
    assert.deepEqual(
      buildRollProps({
        mode: 'wheel',
        role: 'Killer',
        blindMode: true,
        activeMutator: { id: 'hex_roulette' },
        noRepeatPerks: false,
        audioEnabled: false,
      }),
      { mode: 'wheel', role: 'killer', blind: true, curse: 'hex_roulette', no_repeat: false, sound: 'off' }
    );
  });
});
