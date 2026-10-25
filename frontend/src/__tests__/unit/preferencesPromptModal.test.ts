// frontend/src/__tests__/unit/preferencesPromptModal.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('PreferencesPromptModal & Hub Cleanup', () => {
  const modalPath = path.resolve(__dirname, '../../components/common/PreferencesPromptModal.tsx');
  const smashPath = path.resolve(__dirname, '../../components/smash-or-pass/SmashOrPassHub.tsx');
  const tierPath = path.resolve(__dirname, '../../components/tier-lists/TierListHub.tsx');
  const miniPath = path.resolve(__dirname, '../../components/minigames/MinigamesHub.tsx');

  it('PreferencesPromptModal uses shared Modal with backdrop="blur"', () => {
    const src = fs.readFileSync(modalPath, 'utf8');
    assert.ok(src.includes('backdrop="blur"'), 'must use blur backdrop');
    assert.ok(src.includes('/settings'), 'must link to /settings');
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
});
