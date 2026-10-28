// frontend/src/__tests__/unit/settings/preferencesPromptFlow.test.tsx
//
// The first-visit preferences prompt: either keep the defaults or go to /settings; both mark the
// site as configured so the prompt does not come back. In smash-or-pass the main action enters the
// trial and the entry is remembered.
import { fireEvent, render, screen, withNextApp } from '../../helpers/dom';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import { PreferencesPromptModal, SMASH_ENTRY_ACK_KEY } from '@/components/common/PreferencesPromptModal';
import { PreferencesProvider, PREFERENCES_CONFIGURED_KEY } from '@/context/PreferencesContext';

const text = en.smashOrPass.effectsPrefs;
beforeEach(() => localStorage.clear());

function open(mode: 'general' | 'smash') {
  let closed = 0;
  const app = withNextApp({ pathname: '/en/tier-lists' });
  render(
    <PreferencesProvider>
      <PreferencesPromptModal isOpen mode={mode} onClose={() => void (closed += 1)} />
    </PreferencesProvider>,
    { wrapper: app.wrapper }
  );
  return { closed: () => closed, pushes: app.router.pushes };
}

describe('preferences prompt', () => {
  it('keeping the defaults closes the prompt and remembers the choice', () => {
    const prompt = open('general');
    fireEvent.click(screen.getByRole('button', { name: text.continueDefaults }));
    assert.equal(prompt.closed(), 1);
    assert.equal(localStorage.getItem(PREFERENCES_CONFIGURED_KEY), 'true');
    assert.deepEqual(prompt.pushes, []);
  });

  it('"go to settings" opens /settings in the current language', () => {
    const prompt = open('general');
    fireEvent.click(screen.getByRole('button', { name: text.goToSettings }));
    assert.deepEqual(prompt.pushes, ['/en/settings']);
    assert.equal(localStorage.getItem(PREFERENCES_CONFIGURED_KEY), 'true');
  });

  it('in smash or pass, entering the trial keeps the defaults and remembers the entry', () => {
    const prompt = open('smash');
    fireEvent.click(screen.getByRole('button', { name: text.enterTrial }));
    assert.equal(prompt.closed(), 1);
    assert.equal(localStorage.getItem(SMASH_ENTRY_ACK_KEY), 'true');
  });

  it('it has no X: the visitor has to choose', () => {
    open('general');
    assert.ok(!screen.queryByRole('button', { name: en.modal.close }));
  });
});
