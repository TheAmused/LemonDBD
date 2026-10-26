import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultPreferences,
  reconcileWithDatabase,
  fromRemote,
  PREFERENCES_STORAGE_KEY,
  PREFERENCES_CONFIGURED_KEY,
  type SitePreferences,
} from '@/context/PreferencesContext';
import type { RemoteUserPreferences } from '@/services/userPreferencesApi';

describe('Preferences synchronization and database precedence', () => {
  const local: SitePreferences = {
    effects: true,
    sounds: false,
    music: true,
    nsfw: false,
    backgroundAnimation: 'on',
    chosenAt: 1000,
  };

  const remote: SitePreferences = {
    effects: false,
    sounds: true,
    music: false,
    nsfw: true,
    backgroundAnimation: 'eco',
    chosenAt: 2000,
  };

  it('database preferences override local preferences on login', () => {
    const result = reconcileWithDatabase(local, remote);
    assert.deepEqual(result.preferences, remote);
    assert.equal(result.pushToAccount, false);
  });

  it('pushes local preferences to database if account has no saved preferences', () => {
    const result = reconcileWithDatabase(local, null);
    assert.deepEqual(result.preferences, local);
    assert.equal(result.pushToAccount, true);
  });

  it('computes default preferences respecting reduced motion', () => {
    const defaults = defaultPreferences(false);
    assert.equal(defaults.effects, true);
    assert.equal(defaults.backgroundAnimation, 'on');

    const reducedDefaults = defaultPreferences(true);
    assert.equal(reducedDefaults.effects, false);
    assert.equal(reducedDefaults.backgroundAnimation, 'eco');
  });

  it('exports valid localStorage keys for preferences and configured status', () => {
    assert.equal(PREFERENCES_STORAGE_KEY, 'lemondbd_preferences_v2');
    assert.equal(PREFERENCES_CONFIGURED_KEY, 'lemondbd_preferences_configured_v2');
  });

  it('fromRemote correctly converts snake_case RemoteUserPreferences to camelCase SitePreferences', () => {
    const remoteInput: RemoteUserPreferences = {
      effects: false,
      sounds: true,
      music: false,
      nsfw: true,
      background_animation: 'eco',
      chosen_at: 1700000000,
    };

    const converted = fromRemote(remoteInput);
    assert.deepEqual(converted, {
      effects: false,
      sounds: true,
      music: false,
      nsfw: true,
      backgroundAnimation: 'eco',
      chosenAt: 1700000000,
    });
  });

  it('writeLocalPreferences dispatches nsfw-pref-change and preferences-changed with real EventTarget without unbounded loops', () => {
    const store = new Map<string, string>();
    const originalWindow = (globalThis as Record<string, unknown>).window;
    const originalLocalStorage = (globalThis as Record<string, unknown>).localStorage;

    const eventTarget = new EventTarget();
    let nsfwEventFired = 0;
    let prefsEventFired = 0;

    eventTarget.addEventListener('nsfw-pref-change', () => {
      nsfwEventFired++;
    });
    eventTarget.addEventListener('preferences-changed', () => {
      prefsEventFired++;
    });

    (globalThis as Record<string, unknown>).window = {
      dispatchEvent: (e: Event) => eventTarget.dispatchEvent(e),
      addEventListener: eventTarget.addEventListener.bind(eventTarget),
      removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
    };
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };

    try {
      const { writeLocalPreferences } = require('@/context/PreferencesContext');
      writeLocalPreferences(local);
      assert.equal(store.get(PREFERENCES_CONFIGURED_KEY), 'true');
      assert.equal(nsfwEventFired, 1, 'nsfw-pref-change should fire exactly once');
      assert.equal(prefsEventFired, 1, 'preferences-changed should fire exactly once');
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
