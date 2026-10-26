// frontend/src/__tests__/unit/preferencesPromptModal.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

describe('PreferencesPromptModal & Hub Cleanup', () => {
  const modalPath = path.resolve(__dirname, '../../components/common/PreferencesPromptModal.tsx');
  const smashPath = path.resolve(__dirname, '../../components/smash-or-pass/SmashOrPassHub.tsx');
  const tierPath = path.resolve(__dirname, '../../components/tier-lists/TierListHub.tsx');
  const miniPath = path.resolve(__dirname, '../../components/minigames/MinigamesHub.tsx');

  it('PreferencesPromptModal component renders with backdrop="blur" and dialog variant', () => {
    const src = fs.readFileSync(modalPath, 'utf8');
    assert.ok(src.includes('backdrop="blur"'), 'must use blur backdrop');
    assert.ok(src.includes('variant="dialog"'), 'must use dialog variant');
    assert.ok(src.includes('size="md"'), 'must use md size');
    assert.ok(src.includes('closeButton="none"'), 'must use closeButton="none"');
    assert.ok(src.includes('testId="preferences-prompt-modal"'), 'must set testId');
    assert.ok(src.includes('/settings'), 'must link to /settings');
    assert.ok(src.includes('handleContinueDefaults'), 'must handle continue with defaults');
    assert.ok(src.includes('updatePreferences(preferences)'), 'must update preferences on continue defaults');
  });

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

  it('Hubs link directly to /settings and do not mount multi-switch onboarding modals directly', () => {
    const smashSrc = fs.readFileSync(smashPath, 'utf8');
    const tierSrc = fs.readFileSync(tierPath, 'utf8');
    const miniSrc = fs.readFileSync(miniPath, 'utf8');

    assert.ok(!smashSrc.includes('<EffectsPreferenceModal'), 'SmashOrPassHub must remove EffectsPreferenceModal');
    assert.ok(!tierSrc.includes('<NsfwOnboardingModal'), 'TierListHub must remove NsfwOnboardingModal');
    assert.ok(!miniSrc.includes('<NsfwOnboardingModal'), 'MinigamesHub must remove NsfwOnboardingModal');

    assert.ok(smashSrc.includes('<PreferencesPromptModal'), 'SmashOrPassHub must include PreferencesPromptModal');
    assert.ok(tierSrc.includes('<PreferencesPromptModal'), 'TierListHub must include PreferencesPromptModal');
    assert.ok(miniSrc.includes('<PreferencesPromptModal'), 'MinigamesHub must include PreferencesPromptModal');

    assert.ok(smashSrc.includes('/settings'), 'SmashOrPassHub toolbar must navigate to /settings');
    assert.ok(tierSrc.includes('/settings'), 'TierListHub toolbar must navigate to /settings');
    assert.ok(miniSrc.includes('/settings'), 'MinigamesHub toolbar must navigate to /settings');
  });

  it('SmashOrPassHub passes isPromptOpen to useHubOverlays and does not hold prefs.isOpen', () => {
    const smashSrc = fs.readFileSync(smashPath, 'utf8');
    assert.ok(smashSrc.includes('useHubOverlays(isPromptOpen)'), 'SmashOrPassHub must use useHubOverlays(isPromptOpen)');
    assert.ok(!smashSrc.includes('useHubOverlays(prefs.isOpen || isPromptOpen)'), 'must not pass prefs.isOpen to useHubOverlays');
  });
});
