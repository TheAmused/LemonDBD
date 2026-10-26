// frontend/src/__tests__/unit/smash/smashSound.test.ts
//
// The smash-or-pass sound engine obeys the viewer's choice and nothing else: no effect plays while
// sound effects are off, music only runs while music is on, and leaving the page stops the music
// without forgetting the choice (coming back starts it again).
import '../../helpers/domGlobals';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SmashSoundBase } from '@/components/smash-or-pass/SmashSoundBase';
import { MusicEngine } from '@/components/smash-or-pass/sound/MusicEngine';

// The music loop itself (a scheduler of oscillators) is not under test here: only whether it runs.
MusicEngine.prototype.start = function start() {};
MusicEngine.prototype.stop = function stop() {};

/** A Web Audio stand-in: every node and parameter accepts any call. */
function audioStub(): unknown {
  const fn = () => proxy;
  const proxy: unknown = new Proxy(fn, {
    get: (_t, prop) => (prop === 'then' ? undefined : prop === Symbol.toPrimitive ? () => 0 : proxy),
    set: () => true,
    apply: () => proxy,
  });
  return proxy;
}
class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = audioStub();
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  constructor() {
    return new Proxy(this, {
      get: (target, prop) => (prop in target ? (target as Record<string | symbol, unknown>)[prop] : () => audioStub()),
    });
  }
}

class Sounds extends SmashSoundBase {
  playSmashSound(): void {}
  effectTarget() {
    return this.sfxTarget();
  }
  get musicPlaying(): boolean {
    return (this as unknown as { music: unknown }).music !== null;
  }
}

beforeEach(() => {
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

describe('smash sound engine', () => {
  it('stays silent until a choice is applied', () => {
    const sounds = new Sounds();
    sounds.handleUserInteraction();
    assert.equal(sounds.effectTarget(), null);
    assert.equal(sounds.musicPlaying, false);
  });

  it('plays effects only while sound effects are on', () => {
    const sounds = new Sounds();
    sounds.applyPreferences({ sounds: true, music: false });
    assert.notEqual(sounds.effectTarget(), null);
    sounds.applyPreferences({ sounds: false, music: false });
    assert.equal(sounds.effectTarget(), null);
  });

  it('runs music only while music is on', () => {
    const sounds = new Sounds();
    sounds.handleUserInteraction();
    sounds.applyPreferences({ sounds: false, music: true });
    assert.equal(sounds.musicPlaying, true);
    sounds.applyPreferences({ sounds: false, music: false });
    assert.equal(sounds.musicPlaying, false);
    sounds.startBgm();
    assert.equal(sounds.musicPlaying, false, 'cannot be started behind the choice');
  });

  it('leaving the page stops the music but keeps the choice', () => {
    const sounds = new Sounds();
    sounds.handleUserInteraction();
    sounds.applyPreferences({ sounds: true, music: true });
    sounds.pauseBgm();
    assert.equal(sounds.musicPlaying, false);
    sounds.handleUserInteraction();
    assert.equal(sounds.musicPlaying, true, 'the next interaction resumes it');
    assert.notEqual(sounds.effectTarget(), null, 'effects untouched');
  });
});
