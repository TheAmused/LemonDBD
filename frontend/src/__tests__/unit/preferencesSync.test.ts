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
});
