// frontend/src/__tests__/unit/smash/hubAudioAndTooltips.test.ts
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, withAppProviders } from '../../helpers/dom';
import enSmash from '@/locales/en/smashOrPass';
import plSmash from '@/locales/pl/smashOrPass';
import deSmash from '@/locales/de/smashOrPass';
import esSmash from '@/locales/es/smashOrPass';
import jaSmash from '@/locales/ja/smashOrPass';
import { RosterCarouselCard } from '@/components/smash-or-pass/roster-select/RosterCarouselCard';
import type { RosterItem } from '@/types/smashOrPass';

const lockedRoster: RosterItem = {
  id: 'locked-roster',
  slug: 'locked-roster',
  name: 'Locked Roster',
  description: 'Test locked roster',
  theme_color: '#ffffff',
  category: 'official',
  is_nsfw: false,
  is_active: false,
  character_count: 10,
};

describe('Smash or Pass Hub Audio & Modal Polish', () => {
  describe('flipToDatingProfile locale strings', () => {
    it('uses "Flip card" for English and "Obróć kartę" for Polish', () => {
      assert.equal(enSmash.flipToDatingProfile, 'Flip card');
      assert.equal(plSmash.flipToDatingProfile, 'Obróć kartę');
    });

    it('has updated strings for German, Spanish, and Japanese', () => {
      assert.equal(deSmash.flipToDatingProfile, 'Karte umdrehen');
      assert.equal(esSmash.flipToDatingProfile, 'Voltear carta');
      assert.equal(jaSmash.flipToDatingProfile, 'カードを裏返す');
    });
  });

  describe('locked roster labels and badges', () => {
    it('does not contain "Draft" or "(Draft)" in aria-label or rendered badges', () => {
      const view = render(
        React.createElement(RosterCarouselCard, {
          roster: lockedRoster,
          visualOffset: 0,
          isDragging: false,
          isCurrentlyActive: false,
          onJump: () => undefined,
          onCommit: () => undefined,
        }),
        { wrapper: withAppProviders().wrapper }
      );

      const button = view.container.querySelector('[data-roster-card]');
      assert.ok(button, 'roster card button should exist');

      const ariaLabel = button.getAttribute('aria-label') ?? '';
      assert.equal(
        /draft/i.test(ariaLabel),
        false,
        `aria-label "${ariaLabel}" should not contain "Draft" or "(Draft)"`
      );

      // Verify no badge containing "Draft" is rendered in the card container
      const cardText = view.container.textContent ?? '';
      assert.equal(
        /draft/i.test(cardText),
        false,
        `card text "${cardText}" should not contain "Draft"`
      );
    });
  });
});
