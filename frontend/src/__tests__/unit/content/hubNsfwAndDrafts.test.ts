// frontend/src/__tests__/unit/content/hubNsfwAndDrafts.test.ts
// Hub cards: NSFW covers stay blurred behind a reveal button, drafts are badged. (The admin delete
// flow of a list is tested on the editor itself: tier-lists/tierListEditor.test.tsx.)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';
import { OfficialTierListCard } from '@/components/tier-lists/TierListCards';
import { RosterCarouselCard } from '@/components/smash-or-pass/roster-select/RosterCarouselCard';
import type { TierListSummary } from '@/types/tierList';
import type { RosterItem } from '@/types/smashOrPass';
import en from '@/locales/en';
import { setGlobalNsfwPreference } from '@/utils/nsfwAck';

function createMockLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  };
}

(globalThis as unknown as { localStorage: unknown }).localStorage = createMockLocalStorage();

const mockTierList: TierListSummary = {
  id: 1,
  slug: 'test-tier-list',
  kind: 'survivors',
  title: 'Test Tier List',
  description: 'A test tier list',
  cover_image_url: 'https://cdn.example.com/cover.webp',
  is_featured: false,
  is_nsfw: true,
  is_active: true,
  sort_order: 1,
  item_count: 10,
  tier_count: 5,
  has_default_placements: false,
  updated_at: '2026-10-18T10:00:00Z',
};

const mockRoster: RosterItem = {
  id: 'test-roster',
  slug: 'test-roster',
  name: 'Test Roster',
  description: 'Test roster description',
  theme_color: '#ff0000',
  category: 'custom',
  is_nsfw: true,
  is_active: true,
  character_count: 10,
};

describe('Hub NSFW Blurring & Admin Draft/Delete UX', () => {
  it('OfficialTierListCard blurs cover and renders reveal button when list.is_nsfw && !showNsfw', () => {
    const html = renderWithDictionary(
      React.createElement(OfficialTierListCard, {
        list: { ...mockTierList, is_nsfw: true },
        rankedCount: 0,
        locale: 'en',
        showNsfw: false,
      })
    );

    assert.ok(/class="(?:[^"]*\s)?blur-md[\s"]/.test(html), 'the cover is blurred while NSFW is not shown');
    assert.ok(html.includes(en.tierLists.nsfw.reveal), 'reveal button should be rendered');
  });

  it('OfficialTierListCard unblurs cover when showNsfw=true', () => {
    const html = renderWithDictionary(
      React.createElement(OfficialTierListCard, {
        list: { ...mockTierList, is_nsfw: true },
        rankedCount: 0,
        locale: 'en',
        showNsfw: true,
      })
    );

    assert.ok(!/class="(?:[^"]*\s)?blur-md[\s"]/.test(html), 'the cover is not blurred when showNsfw is true');
    assert.ok(!html.includes(en.tierLists.nsfw.reveal), 'reveal button should NOT be rendered when showNsfw is true');
  });

  it('OfficialTierListCard renders Draft badge when list.is_active === false', () => {
    const html = renderWithDictionary(
      React.createElement(OfficialTierListCard, {
        list: { ...mockTierList, is_active: false },
        rankedCount: 0,
        locale: 'en',
        showNsfw: true,
      })
    );

    assert.ok(html.includes(en.tierLists.draft), 'draft badge should be rendered for inactive list');
  });

  it('OfficialTierListCard covers cannot be dragged out or saved with a right-click', () => {
    const html = renderWithDictionary(
      React.createElement(OfficialTierListCard, { list: mockTierList, rankedCount: 0, locale: 'en', showNsfw: true })
    );
    assert.match(html, /<img[^>]*draggable="false"/);
  });

  it('RosterCarouselCard applies blur when r.is_nsfw && !globalNsfw', () => {
    setGlobalNsfwPreference(false);
    const html = renderWithDictionary(
      React.createElement(RosterCarouselCard, {
        roster: { ...mockRoster, is_nsfw: true },
        visualOffset: 0,
        isDragging: false,
        isCurrentlyActive: false,
        onJump: () => {},
        onCommit: () => {},
      })
    );

    assert.ok(html.includes('blur-md'), 'roster cover should have blur-md class when NSFW is not globally acknowledged');
  });

  it('RosterCarouselCard renders Draft badge when r.is_active === false', () => {
    const html = renderWithDictionary(
      React.createElement(RosterCarouselCard, {
        roster: { ...mockRoster, is_active: false },
        visualOffset: 0,
        isDragging: false,
        isCurrentlyActive: false,
        onJump: () => {},
        onCommit: () => {},
      })
    );

    assert.ok(html.includes(en.tierLists.draft), 'draft badge should be rendered for inactive roster');
  });

  it('TierListCreatorParts readDraft preserves is_active status', async () => {
    const { readDraft, DRAFT_KEY } = await import('@/components/tier-lists/creator/TierListCreatorParts');
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        title: 'Draft List',
        tiers: [{ id: 't1', label: 'S', color: 's' }],
        items: [{ id: 'i1', name: 'Item 1' }],
        is_active: false,
      })
    );
    const draft = readDraft();
    assert.strictEqual(draft?.is_active, false);
    localStorage.removeItem(DRAFT_KEY);
  });
});
