// frontend/src/__tests__/unit/settings/preferencesPromptModal.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultPreferences,
  writeLocalPreferences,
  readLocalPreferences,
  PREFERENCES_STORAGE_KEY,
  PREFERENCES_CONFIGURED_KEY,
} from '@/context/PreferencesContext';
import {
  isSmashEntryAcknowledged,
  markSmashEntryAcknowledged,
  SMASH_ENTRY_ACK_KEY,
} from '@/components/common/PreferencesPromptModal';

describe('PreferencesPromptModal storage', () => {
  it('tracks smash entry acknowledgment in localStorage independently', () => {
    const store = new Map<string, string>();
    const originalWindow = (globalThis as Record<string, unknown>).window;
    const originalLocalStorage = (globalThis as Record<string, unknown>).localStorage;
    (globalThis as Record<string, unknown>).window = {
      dispatchEvent: () => true,
    };
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };

    try {
      assert.equal(isSmashEntryAcknowledged(), false);
      markSmashEntryAcknowledged();
      assert.equal(store.get(SMASH_ENTRY_ACK_KEY), 'true');
      assert.equal(isSmashEntryAcknowledged(), true);
    } finally {
      if (originalWindow) {
        (globalThis as Record<string, unknown>).window = originalWindow;
      } else {
        delete (globalThis as Record<string, unknown>).window;
      }
      if (originalLocalStorage) {
        (globalThis as Record<string, unknown>).localStorage = originalLocalStorage;
      } else {
        delete (globalThis as Record<string, unknown>).localStorage;
      }
    }
  });

  it('calling markConfigured populates storage with default preferences and marks configured', () => {
    const store = new Map<string, string>();
    const originalWindow = (globalThis as Record<string, unknown>).window;
    const originalLocalStorage = (globalThis as Record<string, unknown>).localStorage;
    (globalThis as Record<string, unknown>).window = {
      dispatchEvent: () => true,
    };
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };

    try {
      const defaults = defaultPreferences();
      writeLocalPreferences(defaults);

      // Verify PREFERENCES_CONFIGURED_KEY is set to 'true'
      assert.equal(store.get(PREFERENCES_CONFIGURED_KEY), 'true');
      assert.equal(store.get('lemondbd_nsfw_onboarded'), 'true');

      // Verify PREFERENCES_STORAGE_KEY is populated with valid JSON matching defaults
      const rawPrefs = store.get(PREFERENCES_STORAGE_KEY);
      assert.ok(rawPrefs, 'preferences v2 must be stored');
      const parsed = JSON.parse(rawPrefs!);
      assert.equal(parsed.effects, defaults.effects);
      assert.equal(parsed.sounds, defaults.sounds);
      assert.equal(parsed.music, defaults.music);

      // Verify legacy lemondbd_smash_prefs_v1 is populated to keep sound engine active
      const rawSmash = store.get('lemondbd_smash_prefs_v1');
      assert.ok(rawSmash, 'smash prefs v1 must be populated');
      const parsedSmash = JSON.parse(rawSmash!);
      assert.equal(parsedSmash.effects, defaults.effects);
      assert.equal(parsedSmash.sounds, defaults.sounds);
      assert.equal(parsedSmash.music, defaults.music);

      // Verify readLocalPreferences retrieves the populated preferences
      const retrieved = readLocalPreferences();
      assert.ok(retrieved !== null, 'readLocalPreferences must return non-null preferences');
      assert.equal(retrieved?.effects, defaults.effects);
    } finally {
      (globalThis as Record<string, unknown>).window = originalWindow;
      if (originalLocalStorage) {
        (globalThis as Record<string, unknown>).localStorage = originalLocalStorage;
      } else {
        delete (globalThis as Record<string, unknown>).localStorage;
      }
    }
  });

});
