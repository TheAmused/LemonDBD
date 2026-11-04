// frontend/src/__tests__/unit/smash/hubHeaderLeaderboard.test.tsx
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, withDictionary } from '../../helpers/dom';
import enDict from '@/locales/en';
import { HubHeader } from '@/components/smash-or-pass/hub/HubHeader';
import type { RosterItem } from '@/types/smashOrPass';

const roster = (slug: string): RosterItem => ({
  id: slug,
  slug,
  name: slug,
  description: '',
  theme_color: '#ffffff',
  category: 'official',
  is_nsfw: false,
  is_active: true,
});

function header(slug: string) {
  const noop = () => undefined;
  return (
    <HubHeader
      activeRoster={roster(slug)}
      rosterName={slug}
      rosterBadgeCount={0}
      remainingInDeck={10}
      sessionSmashes={0}
      sessionPasses={0}
      sessionSmashRate={0}
      isFilterActive={false}
      isFilterDrawerOpen={false}
      onOpenRosters={noop}
      onToggleFilters={noop}
      onOpenEffects={noop}
      onOpenPersona={noop}
      onOpenLeaderboard={noop}
      onShuffle={noop}
      onReset={noop}
      onOpenHowToPlay={noop}
    />
  );
}

const LEADERBOARD = enDict.smashOrPass.tooltips.leaderboard;

describe('the Hall of Fame button', () => {
  it('is in the dock for an official roster', () => {
    const view = render(header('canon'), { wrapper: withDictionary() });
    assert.ok(view.queryAllByLabelText(LEADERBOARD).length > 0);
  });

  it('is not there for a custom roster', () => {
    const view = render(header('local:abc123'), { wrapper: withDictionary() });
    assert.equal(view.queryAllByLabelText(LEADERBOARD).length, 0);
  });
});
