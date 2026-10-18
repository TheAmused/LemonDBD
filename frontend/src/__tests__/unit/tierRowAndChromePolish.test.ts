// frontend/src/__tests__/unit/tierRowAndChromePolish.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { DndContext } from '@dnd-kit/core';
import { renderWithDictionary } from '../helpers/renderWithDictionary';
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
    let clearedTierId: string | null = null;
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
          onEdit: () => {},
          canEdit: true,
          onClearRow: (id: string) => {
            clearedTierId = id;
          },
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
          onEdit: () => {},
          canEdit: true,
          onClearRow: () => {},
        })
      )
    );

    assert.ok(!html.includes(expectedLabel), 'Empty TierRow must not render clear button aria-label');
    assert.ok(!html.includes('lucide-eraser'), 'Empty TierRow must not render Eraser icon');
  });

  it('Test 3: TierEditModal does not render clear tier button', () => {
    const modalPath = path.resolve(__dirname, '../../components/tier-lists/TierEditModal.tsx');
    const modalSource = fs.readFileSync(modalPath, 'utf-8');

    assert.ok(!modalSource.includes('t.clearTier'), 'TierEditModal must not reference t.clearTier');
    assert.ok(!modalSource.includes('onClear('), 'TierEditModal must not call onClear');
    assert.ok(
      !modalSource.includes("import { Check, Eraser") && !modalSource.includes(", Eraser"),
      'TierEditModal must not import Eraser icon'
    );
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

  it('Test 5: Description text in cards includes group-has-[[aria-expanded=true]]:opacity-0', () => {
    const officialList: TierListSummary = {
      id: 2,
      slug: 'survivor-perks',
      kind: 'survivor_perks',
      title: 'Survivor Perks',
      description: 'Detailed description of survivor perks ranking tier list.',
      cover_image_url: '',
      is_featured: false,
      sort_order: 1,
      item_count: 100,
      tier_count: 5,
      has_default_placements: true,
      updated_at: null,
    };

    const officialHtml = renderWithDictionary(
      React.createElement(OfficialTierListCard, {
        list: officialList,
        rankedCount: 0,
        locale: 'en',
      })
    );

    assert.ok(
      officialHtml.includes('group-has-[[aria-expanded=true]]:opacity-0'),
      'Official card description must include group-has-[[aria-expanded=true]]:opacity-0'
    );
    assert.ok(
      officialHtml.includes('group-has-[[aria-expanded=true]]:pointer-events-none'),
      'Official card description must include group-has-[[aria-expanded=true]]:pointer-events-none'
    );

    const customList: StoredCustomList = {
      id: 'custom-1',
      title: 'My Custom List',
      description: 'Detailed description of custom ranking tier list.',
      items: [],
      tiers: [],
      placements: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const customHtml = renderWithDictionary(
      React.createElement(CustomTierListCard, {
        list: customList,
        locale: 'en',
        disabled: true,
      })
    );

    assert.ok(
      customHtml.includes('group-has-[[aria-expanded=true]]:opacity-0'),
      'Custom card description must include group-has-[[aria-expanded=true]]:opacity-0'
    );
    assert.ok(
      customHtml.includes('group-has-[[aria-expanded=true]]:pointer-events-none'),
      'Custom card description must include group-has-[[aria-expanded=true]]:pointer-events-none'
    );
  });
});
