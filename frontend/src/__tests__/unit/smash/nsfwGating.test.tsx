// frontend/src/__tests__/unit/smash/nsfwGating.test.tsx
//
// NSFW gating on Smash or Pass, as the viewer meets it. The global NSFW switch is the only
// acknowledgment (a per-roster one made the hub's switch lie): NSFW rosters are not even listed
// until it is on, a flagged roster shows the gate instead of its cards, and confirming the gate
// turns the switch on.
import { act, render, renderHook, screen, stubFetch, waitFor, withDictionary, fireEvent } from '../../helpers/dom';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import * as nsfwAck from '@/utils/nsfwAck';
import { getGlobalNsfwPreference, setGlobalNsfwPreference } from '@/utils/nsfwAck';
import { useSmashRosters } from '@/components/smash-or-pass/hub/useSmashRosters';
import { CardArena } from '@/components/smash-or-pass/hub/CardArena';
import { RosterCarouselCard } from '@/components/smash-or-pass/roster-select/RosterCarouselCard';
import type { EntityItem, RosterItem } from '@/types/smashOrPass';

const spicy: RosterItem = { id: 'spicy', slug: 'spicy', name: 'Spicy', description: '', theme_color: '#ff0055', category: 'custom', is_nsfw: true, is_active: true };
const meg: EntityItem = { id: 'e1', roster_id: 'spicy', slug: 'meg', name: 'Meg Thomas', role: 'Survivor', gender: 'female' };

let api: ReturnType<typeof stubFetch> | null = null;
beforeEach(() => {
  localStorage.clear();
  setGlobalNsfwPreference(false);
});
afterEach(() => api?.restore());

describe('the switch is the only acknowledgment', () => {
  it('there is no per-roster acknowledgment', () => {
    assert.equal((nsfwAck as Record<string, unknown>).acknowledgeNsfwRoster, undefined);
    assert.equal((nsfwAck as Record<string, unknown>).hasAcknowledgedNsfwRoster, undefined);
  });

  it('NSFW rosters are requested only once the switch is on, and confirming turns it on', async () => {
    api = stubFetch(() => [spicy]);
    const { result } = renderHook(() => useSmashRosters('en'));
    await waitFor(() => assert.ok(api!.calls.length >= 1));
    assert.ok(!api.calls[0].url.includes('include_nsfw'), 'not asked for while the switch is off');
    assert.equal(result.current.nsfwAcknowledged, false);

    act(() => result.current.handleAcknowledgeNsfw());
    assert.equal(getGlobalNsfwPreference(), true);
    assert.equal(result.current.nsfwAcknowledged, true);
    await waitFor(() => assert.ok(api!.calls.some((c) => c.url.includes('include_nsfw=true'))));
  });
});

describe('the gate in the arena', () => {
  function arena(nsfwAcknowledged: boolean, onAcknowledgeNsfw = () => {}) {
    return render(
      <CardArena
        activeRoster={spicy}
        selectedRosterSlug="spicy"
        nsfwAcknowledged={nsfwAcknowledged}
        loading={false}
        currentCharacter={meg}
        nextCharacter={null}
        thirdCharacter={null}
        currentIndex={0}
        locale="en"
        dragPhysics={{ x: 0, y: 0, isDragging: false }}
        isExiting={false}
        exitVote={null}
        exitOffset={undefined}
        effectsEnabled={false}
        sessionSmashes={0}
        sessionPasses={0}
        onAcknowledgeNsfw={onAcknowledgeNsfw}
        onVote={() => {}}
        onDragUpdate={() => {}}
        onOpenPersona={() => {}}
        onReset={() => {}}
      />,
      { wrapper: withDictionary() }
    );
  }

  it('a flagged roster shows the gate, not its first card, until confirmed', () => {
    let confirmed = 0;
    arena(false, () => void (confirmed += 1));
    assert.ok(screen.getByText(en.smashOrPass.nsfw.title));
    assert.ok(!screen.queryByText('Meg Thomas'), 'no card behind the gate');
    fireEvent.click(screen.getByRole('button', { name: en.smashOrPass.nsfw.confirm }));
    assert.equal(confirmed, 1);
  });

  it('once acknowledged, the cards are shown', () => {
    arena(true);
    assert.ok(!screen.queryByText(en.smashOrPass.nsfw.title));
    assert.ok(screen.getAllByText('Meg Thomas').length > 0);
  });
});

describe('the roster picker marks NSFW rosters', () => {
  it('with a badge and in the accessible name', () => {
    render(<RosterCarouselCard roster={spicy} visualOffset={0} isDragging={false} isCurrentlyActive={false} onJump={() => {}} onCommit={() => {}} />, {
      wrapper: withDictionary(),
    });
    assert.ok(screen.getByTestId('roster-nsfw-badge'));
    assert.ok(screen.getAllByRole('button').some((b) => (b.getAttribute('aria-label') ?? '').endsWith('(NSFW)')));
  });
});
