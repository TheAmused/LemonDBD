// frontend/src/__tests__/unit/smashEffectsPrefs.test.ts
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../components/smash-or-pass');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

test('SmashOrPass: effects and music choice', async (t) => {
  const { reconcilePrefs, readLocalPrefs, writeLocalPrefs } = await import('../../components/smash-or-pass/prefs/smashPrefs');
  const older = { effects: true, music: true, chosenAt: 1000 };
  const newer = { effects: false, music: false, chosenAt: 2000 };

  await t.test('no choice on either side stays unchosen', () => {
    assert.deepStrictEqual(reconcilePrefs(null, null), { prefs: null, pushToAccount: false });
  });

  await t.test('a choice made before signing in is kept and sent to the account', () => {
    assert.deepStrictEqual(reconcilePrefs(older, null), { prefs: older, pushToAccount: true });
  });

  await t.test('a new device picks up the account choice without sending anything', () => {
    assert.deepStrictEqual(reconcilePrefs(null, older), { prefs: older, pushToAccount: false });
  });

  await t.test('the later of two choices wins', () => {
    assert.deepStrictEqual(reconcilePrefs(older, newer), { prefs: newer, pushToAccount: false });
    assert.deepStrictEqual(reconcilePrefs(newer, older), { prefs: newer, pushToAccount: true });
  });

  await t.test('storage reads back what was written, and nothing malformed', () => {
    const store = new Map<string, string>();
    const original = (globalThis as Record<string, unknown>).window;
    (globalThis as Record<string, unknown>).window = {};
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    try {
      assert.strictEqual(readLocalPrefs(), null);
      writeLocalPrefs(newer);
      assert.deepStrictEqual(readLocalPrefs(), newer);
      store.set([...store.keys()][0], JSON.stringify({ effects: 'yes' }));
      assert.strictEqual(readLocalPrefs(), null);
    } finally {
      (globalThis as Record<string, unknown>).window = original;
      delete (globalThis as Record<string, unknown>).localStorage;
    }
  });

  await t.test('the hub shows the warning in the global Modal and keeps it open until a choice is made', () => {
    const modal = read('prefs/EffectsPreferenceModal.tsx');
    assert.match(modal, /from '@\/components\/common\/Modal'/);
    assert.match(modal, /closeOnEscape=\{!mandatory\}/);
    assert.match(modal, /closeOnBackdropClick=\{!mandatory\}/);
    const hub = read('SmashOrPassHub.tsx');
    assert.match(hub, /mandatory=\{prefs\.needsChoice\}/);
    assert.match(hub, /useHubOverlays\(prefs\.needsChoice \|\| prefs\.isSettingsOpen\)/);
  });

  await t.test('with effects off the vote particle layer and the card fling are gone, the ambient embers stay', () => {
    const hub = read('SmashOrPassHub.tsx');
    assert.doesNotMatch(hub, /\{effectsEnabled && \(\s*<Suspense fallback=\{null\}>\s*<InteractiveDragBackground/);
    assert.match(hub, /<InteractiveDragBackground[^>]*actionTrigger=\{effectsEnabled \? animTrigger\.type : null\}/);
    assert.match(hub, /\{effectsEnabled && \(\s*<Suspense fallback=\{null\}>\s*<SmashAnimations/);
    const card = read('CharacterCard.tsx');
    assert.match(card, /\{effects && isExiting && exitType && \(/);
  });

  await t.test('with effects off a vote still shows a heart or skull, only fading', () => {
    assert.match(read('SmashOrPassHub.tsx'), /\{!effectsEnabled && <CalmVoteMark/);
    const mark = read('hub/CalmVoteMark.tsx');
    assert.match(mark, /Heart/);
    assert.match(mark, /Skull/);
    assert.doesNotMatch(mark, /animate-|drop-shadow|shadow-|blur|scale-|translate/);
  });

  await t.test('sound effects and music each obey the choice', () => {
    const base = read('SmashSoundBase.ts');
    assert.match(base, /this\.isMuted \|\| !this\.effectsAllowed/);
    assert.match(base, /if \(!this\.musicAllowed\) return;/);
  });
});
