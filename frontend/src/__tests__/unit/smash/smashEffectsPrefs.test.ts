// frontend/src/__tests__/unit/smash/smashEffectsPrefs.test.ts
// Which effects/music choice wins and how it is stored. What the sound engine does with the choice is
// smashSound.test.ts.
import test from 'node:test';
import assert from 'node:assert';

test('SmashOrPass: effects and music choice', async (t) => {
  const { reconcilePrefs, readLocalPrefs, writeLocalPrefs } = await import('../../../components/smash-or-pass/prefs/smashPrefs');
  const older = { effects: true, sounds: true, music: true, chosenAt: 1000 };
  const newer = { effects: false, sounds: false, music: false, chosenAt: 2000 };

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
      const key = [...store.keys()][0];
      store.set(key, JSON.stringify({ effects: 'yes' }));
      assert.strictEqual(readLocalPrefs(), null);
      // Saved before sound effects had a switch of their own: they follow `effects`.
      store.set(key, JSON.stringify({ effects: false, music: true, chosenAt: 3 }));
      assert.deepStrictEqual(readLocalPrefs(), { effects: false, sounds: false, music: true, chosenAt: 3 });
    } finally {
      (globalThis as Record<string, unknown>).window = original;
      delete (globalThis as Record<string, unknown>).localStorage;
    }
  });
});
