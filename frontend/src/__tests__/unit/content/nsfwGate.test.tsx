// frontend/src/__tests__/unit/content/nsfwGate.test.tsx
//
// What a viewer meets with NSFW-flagged tier lists and minigames: the gate in front of a flagged
// item, the badge on its card, and the flag in an exported file.
import { act, render, renderHook, screen, withNextApp } from '../../helpers/dom';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { useNsfwGate } from '@/hooks/useNsfwGate';
import { acknowledgeNsfwContent, setGlobalNsfwPreference } from '@/utils/nsfwAck';
import { exportChallengeToJson } from '@/utils/minigames/jsonExportImport';
import { CustomTierListCard, OfficialTierListCard } from '@/components/tier-lists/TierListCards';
import { CustomTrialCard } from '@/components/minigames/MinigamesHubCards';
import type { ChallengeDefinition } from '@/types/minigame';
import type { TierListSummary } from '@/types/tierList';

beforeEach(() => {
  localStorage.clear();
  setGlobalNsfwPreference(false);
});

describe('useNsfwGate', () => {
  it('a flagged item is gated until the viewer confirms; confirming turns the global switch on', () => {
    const { result } = renderHook(() => useNsfwGate('tier_list', 'spicy', true));
    assert.equal(result.current.gated, true);
    act(() => result.current.confirm());
    assert.equal(result.current.gated, false);
    const other = renderHook(() => useNsfwGate('minigame', 'another', true));
    assert.equal(other.result.current.gated, false, 'the switch is global, not per item');
  });

  it('an unflagged item is never gated', () => {
    assert.equal(renderHook(() => useNsfwGate('tier_list', 'plain', false)).result.current.gated, false);
  });

  it('the author is not asked about the item they just saved', () => {
    acknowledgeNsfwContent('minigame', 'mine');
    assert.equal(renderHook(() => useNsfwGate('minigame', 'mine', true)).result.current.gated, false);
    assert.equal(renderHook(() => useNsfwGate('minigame', 'someone-elses', true)).result.current.gated, true);
  });
});

const summary: TierListSummary = {
  id: 1, slug: 's', kind: 'survivors', title: 'Spicy', description: '', cover_image_url: null, is_featured: false,
  is_nsfw: true, is_active: true, sort_order: 1, item_count: 3, tier_count: 3, has_default_placements: false, updated_at: '2026-10-18T10:00:00Z',
} as unknown as TierListSummary;
const badges = () => screen.queryAllByTestId('nsfw-badge').length;

describe('NSFW badges on cards', () => {
  it('official and custom tier list cards show the badge only for flagged lists', () => {
    const { wrapper } = withNextApp();
    const { unmount } = render(<OfficialTierListCard list={summary} rankedCount={0} locale="en" showNsfw />, { wrapper });
    assert.equal(badges(), 1);
    unmount();
    render(<OfficialTierListCard list={{ ...summary, is_nsfw: false }} rankedCount={0} locale="en" showNsfw />, { wrapper });
    assert.equal(badges(), 0);
  });

  it('a custom tier list card shows the badge', () => {
    const custom = { id: 'c1', title: 'Mine', tiers: [], items: [], placements: {}, is_nsfw: true, updated_at: '2026-10-18T10:00:00Z' };
    render(<CustomTierListCard list={custom as never} locale="en" onDelete={() => {}} showNsfw />, { wrapper: withNextApp().wrapper });
    assert.equal(badges(), 1);
  });

  it('a flagged minigame trial card shows the badge', () => {
    const trial = { id: 't1', title: 'Spicy trial', description: '', game_mode: 'custom', rounds: [], is_nsfw: true } as unknown as ChallengeDefinition;
    render(
      <CustomTrialCard trial={trial} locale="en" showNsfw onRevealNsfw={() => {}} isShareLoading={false} isCopied={false} onShare={() => {}} onExport={() => {}} onDelete={() => {}} />,
      { wrapper: withNextApp().wrapper }
    );
    assert.equal(badges(), 1);
  });
});

describe('minigame export file', () => {
  async function exported(trial: ChallengeDefinition): Promise<{ challenge: Record<string, unknown> }> {
    let blob: Blob | null = null;
    const real = URL.createObjectURL;
    URL.createObjectURL = (b: Blob) => {
      blob = b;
      return 'blob:test';
    };
    try {
      exportChallengeToJson(trial);
    } finally {
      URL.createObjectURL = real;
    }
    assert.ok(blob, 'a file was downloaded');
    return JSON.parse(await (blob as Blob).text());
  }
  const trial: ChallengeDefinition = {
    title: 'Spicy trial',
    description: '',
    game_mode: 'custom',
    rounds: [{ round_number: 1, mode: 'classic_character', target_id: 3, target_type: 'killer', max_attempts: 6 }],
  };

  it('carries the flag when set, and no key when not', async () => {
    assert.equal((await exported({ ...trial, is_nsfw: true })).challenge.is_nsfw, true);
    assert.equal('is_nsfw' in (await exported(trial)).challenge, false);
  });
});
