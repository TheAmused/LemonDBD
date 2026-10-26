// frontend/src/__tests__/unit/tier-lists/tierRowAndChromePolish.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { DndContext } from '@dnd-kit/core';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';
import { TierRow } from '@/components/tier-lists/TierRow';
import { OfficialTierListCard, CustomTierListCard } from '@/components/tier-lists/TierListCards';
import type { TierDefinition, TierItem, TierListSummary, StoredCustomList } from '@/types/tierList';
import en from '@/locales/en';
import { formatMessage } from '@/utils/i18nFormat';

const sampleTier: TierDefinition = { id: 's', label: 'S', color: 's' };
const sampleItem: TierItem = { key: 'perk:1', name: 'Sprint Burst', image: '/images/sprint.png' };
const itemsByKey = new Map<string, TierItem>([['perk:1', sampleItem]]);

describe('Tier Row Clear Button & Chrome Polish', () => {
  it('Test 1: TierRow renders Eraser clear button when keys.length > 0 and onClearRow is provided', () => {
    const expectedLabel = formatMessage((en.tierLists as any).clearTierAria, { label: sampleTier.label });

    const html = renderWithDictionary(
      React.createElement(
        DndContext,
        null,
        React.createElement(TierRow as any, {
          tier: sampleTier,
          keys: ['perk:1'],
          itemsByKey,
          shape: 'square',
          showNames: false,
          selectedKey: null,
          onSelect: () => {},
          onPreview: () => {},
          onMoveSelectedHere: () => {},
          onClearRow: () => {},
        })
      )
    );

    assert.ok(html.includes(expectedLabel), 'TierRow must render clear button with localized clearTierAria label');
    assert.ok(html.includes('lucide-eraser'), 'TierRow clear button must render Eraser icon');
  });

  it('Test 2: TierRow does not render Eraser clear button when keys.length === 0', () => {
    const expectedLabel = (en.tierLists as any).clearTierAria
      ? formatMessage((en.tierLists as any).clearTierAria, { label: sampleTier.label })
      : 'Clear tier';

    const html = renderWithDictionary(
      React.createElement(
        DndContext,
        null,
        React.createElement(TierRow as any, {
          tier: sampleTier,
          keys: [],
          itemsByKey,
          shape: 'square',
          showNames: false,
          selectedKey: null,
          onSelect: () => {},
          onPreview: () => {},
          onMoveSelectedHere: () => {},
          onClearRow: () => {},
        })
      )
    );

    assert.ok(!html.includes(expectedLabel), 'Empty TierRow must not render clear button aria-label');
    assert.ok(!html.includes('lucide-eraser'), 'Empty TierRow must not render Eraser icon');
  });

  it('Test 4: OfficialTierListCard hides "Custom" badge when list.kind === "custom"', () => {
    const customList: TierListSummary = {
      id: 1,
      slug: 'official-custom-list',
      kind: 'custom',
      title: 'Competitive Roster',
      description: 'An official list of custom items',
      cover_image_url: '',
      is_featured: false,
      sort_order: 1,
      item_count: 10,
      tier_count: 5,
      has_default_placements: true,
      updated_at: null,
    };

    const html = renderWithDictionary(
      React.createElement(OfficialTierListCard, {
        list: customList,
        rankedCount: 0,
        locale: 'en',
      })
    );

    // Official card with kind !== 'custom' should show kind badge, but kind === 'custom' should suppress it
    assert.ok(!html.includes(`>${en.tierLists.kinds.custom}<`), 'Official card with kind=custom must not show Custom badge');
  });

});
