// frontend/src/__tests__/unit/smash/smashSoundStreaks.test.ts
//
// Quick votes and quick roster picks must not sound like a combo in a game: a smash right after
// another rings a lighter chime (or nothing at all when it is a button mash), the pitch never
// climbs, and choosing a roster has a soft note of its own that never touches the smash streak.
import '../../helpers/domGlobals';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SmashSounds } from '@/components/smash-or-pass/SmashSoundEffects';

function audioStub(): unknown {
  const fn = () => proxy;
  const proxy: unknown = new Proxy(fn, {
    get: (_t, prop) => (prop === 'then' ? undefined : prop === Symbol.toPrimitive ? () => 0 : proxy),
    set: () => true,
    apply: () => proxy,
  });
  return proxy;
}

/** Counts every oscillator a sound starts, and lets the test move the clock. */
let oscillators = 0;
let clock = 0;
class CountingAudioContext {
  state = 'running';
  destination = audioStub();
  get currentTime() {
    return clock;
  }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  createOscillator() {
    oscillators += 1;
    return audioStub();
  }
  constructor() {
    return new Proxy(this, {
      get: (target, prop) => (prop in target ? (target as unknown as Record<string | symbol, unknown>)[prop] : () => audioStub()),
    });
  }
}

/** The oscillators one call starts. */
function started(play: () => void): number {
  const before = oscillators;
  play();
  return oscillators - before;
}

beforeEach(() => {
  (window as unknown as { AudioContext: unknown }).AudioContext = CountingAudioContext;
  SmashSounds.applyPreferences({ sounds: true, music: false });
  // A pass resets the streak, so every test starts from a rested engine.
  clock += 60;
  SmashSounds.playPassSound();
  clock += 60;
});

describe('smash sound streaks', () => {
  it('rings the same chord at any pace of rested smashes, with no pitch climb', () => {
    const first = started(() => SmashSounds.playSmashSound());
    clock += 5;
    const second = started(() => SmashSounds.playSmashSound());
    clock += 5;
    const third = started(() => SmashSounds.playSmashSound());
    assert.ok(first >= 6, 'the full chord');
    assert.equal(second, first);
    assert.equal(third, first);
  });

  it('answers a smash soon after another with a lighter chime', () => {
    const full = started(() => SmashSounds.playSmashSound());
    clock += 0.6;
    const light = started(() => SmashSounds.playSmashSound());
    assert.ok(light > 0, 'still heard');
    assert.ok(light < full / 2, `light (${light}) is much smaller than full (${full})`);
  });

  it('stays silent for a button mash and recovers afterwards', () => {
    started(() => SmashSounds.playSmashSound());
    clock += 0.2;
    assert.equal(started(() => SmashSounds.playSmashSound()), 0);
    clock += 0.2;
    assert.equal(started(() => SmashSounds.playSmashSound()), 0, 'the mash is measured from the last vote');
    clock += 5;
    assert.ok(started(() => SmashSounds.playSmashSound()) >= 6);
  });

  it('gives a roster pick one soft note, ignoring a repeat within 0.4 seconds', () => {
    const first = started(() => SmashSounds.playSelectSound());
    assert.ok(first >= 1 && first <= 3, `one note (${first})`);
    clock += 0.2;
    assert.equal(started(() => SmashSounds.playSelectSound()), 0);
    clock += 0.5;
    assert.equal(started(() => SmashSounds.playSelectSound()), first);
  });

  it('keeps a roster pick out of the smash streak', () => {
    const full = started(() => SmashSounds.playSmashSound());
    clock += 10;
    started(() => SmashSounds.playSelectSound());
    clock += 0.1;
    // 10.1s after the last smash: a rested smash again, whatever picks happened in between.
    assert.equal(started(() => SmashSounds.playSmashSound()), full);
  });

  it('plays nothing while sound effects are off', () => {
    SmashSounds.applyPreferences({ sounds: false, music: false });
    assert.equal(started(() => SmashSounds.playSelectSound()), 0);
    assert.equal(started(() => SmashSounds.playSmashSound()), 0);
  });
});
