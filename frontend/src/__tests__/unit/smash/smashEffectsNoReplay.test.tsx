// frontend/src/__tests__/unit/smash/smashEffectsNoReplay.test.tsx
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, withDictionary } from '../../helpers/dom';
import enDict from '@/locales/en';
import { SmashAnimations } from '@/components/smash-or-pass/SmashAnimations';
import { nextBurst } from '@/components/smash-or-pass/dragBackgroundScene';

const SMASH_LABEL = enDict.smashOrPass.controls.smash;

describe('switching effects back on does not replay the last vote', () => {
  it('the vote overlay ignores a vote that was already there when it mounted', () => {
    const view = render(<SmashAnimations triggerType="smash" triggerKey={3} />, { wrapper: withDictionary() });
    assert.equal(view.queryByText(SMASH_LABEL), null);
  });

  it('the vote overlay still plays the next vote', () => {
    const view = render(<SmashAnimations triggerType="smash" triggerKey={3} />, { wrapper: withDictionary() });
    view.rerender(<SmashAnimations triggerType="smash" triggerKey={4} />);
    assert.ok(view.queryByText(SMASH_LABEL));
  });

  it('the background spawns a burst for a new vote', () => {
    assert.deepEqual(nextBurst({ actionTrigger: 'smash', triggerKey: 5 }, 4), { handledKey: 5, action: 'smash' });
  });

  it('the background spawns nothing for a vote it has handled', () => {
    assert.deepEqual(nextBurst({ actionTrigger: 'smash', triggerKey: 5 }, 5), { handledKey: 5, action: null });
  });

  it('the background marks a vote cast with effects off as handled without a burst', () => {
    assert.deepEqual(nextBurst({ actionTrigger: null, triggerKey: 6 }, 5), { handledKey: 6, action: null });
    // Effects come back on with that same vote still showing: nothing to replay.
    assert.deepEqual(nextBurst({ actionTrigger: 'smash', triggerKey: 6 }, 6), { handledKey: 6, action: null });
  });
});
