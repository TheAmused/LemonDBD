// frontend/src/__tests__/unit/tier-lists/tierListsResponsiveAndSkeletons.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { TierListSkeleton } from '@/components/tier-lists/TierListSkeleton';
import { TierItemTile } from '@/components/tier-lists/TierItemTile';
import { OfficialTierListCard, CustomTierListCard } from '@/components/tier-lists/TierListCards';
import { tierColorProps } from '@/components/tier-lists/tierColor';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import enDict from '@/locales/en';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';


describe('Tier lists: skeleton', () => {
  it('renders role="status", aria-busy and the DBD skill-check spinner', () => {
    const html = renderWithDictionary(React.createElement(TierListSkeleton, {}));
    assert.ok(html.includes('<output'));
    assert.ok(html.includes('aria-busy="true"'));
    assert.ok(html.includes('viewBox="0 0 160 160"'), 'must render the DBD Skill Check SVG');
    assert.ok(html.includes(enDict.tierLists.loading));
  });
});

describe('Tier lists: tiles and colors', () => {
  it('falls back to initials when an item has no image, and never renders an empty src', () => {
    const html = renderWithDictionary(
      React.createElement(TierItemTile, { item: { key: 'x', name: 'Dwight Fairfield', image: null } })
    );
    assert.ok(html.includes('>DF<'));
    assert.ok(!html.includes('<img'));
    assert.ok(html.includes('aria-label="Dwight Fairfield"'));
  });

  it('custom hex colors use an inline background with a contrasting ink class', () => {
    assert.deepEqual(tierColorProps('s'), { className: 'bg-tier-s text-tier-ink' });
    assert.deepEqual(tierColorProps('#101030'), {
      className: 'text-text-inverted',
      style: { backgroundColor: '#101030' },
    });
  });
});

describe('Tier lists: banner assets', () => {
  it('all 5 official and 3 default custom banner graphics exist in backend/app/static/tier-lists/ (single source of truth)', () => {
    const banners = [
      'banner_survivor_perks.webp',
      'banner_killer_perks.webp',
      'banner_survivors.webp',
      'banner_killers.webp',
      'banner_maps.webp',
      'banner_custom_default_1.webp',
      'banner_custom_default_2.webp',
      'banner_custom_default_3.webp',
    ];
    const bannerDir = path.resolve(__dirname, '../../../../../backend/app/static/tier-lists');
    assert.ok(!fs.existsSync(path.resolve(__dirname, '../../../../public/images/tier-lists/banner_maps.webp')), 'Banners must not be duplicated in the frontend');
    for (const file of banners) {
      const fullPath = path.join(bannerDir, file);
      assert.ok(fs.existsSync(fullPath), `Missing banner: ${file}`);
      const stats = fs.statSync(fullPath);
      assert.ok(stats.size > 1024, `Banner too small: ${file} (${stats.size} bytes)`);
    }
  });
});

describe('Tier lists: OfficialTierListCard', () => {
  it('falls back to DEFAULT_OFFICIAL_COVERS when cover_image_url is empty and renders hero banner', () => {
    const html = renderWithDictionary(
      React.createElement(OfficialTierListCard, {
        list: {
          id: 1,
          slug: 'survivor-perks',
          kind: 'survivor_perks',
          title: 'Survivor Perks',
          description: 'Rank every survivor perk',
          item_count: 240,
          tier_count: 5,
          has_default_placements: true,
          cover_image_url: '',
          is_featured: true,
          sort_order: 10,
          updated_at: '2026-10-13T00:00:00Z',
        },
        rankedCount: 15,
        locale: 'en',
      })
    );
    assert.ok(html.includes('/static/tier-lists/banner_survivor_perks.webp'), 'Must fallback to default official banner');
    assert.ok(html.includes('Survivor Perks'), 'Must render title');
    assert.ok(html.includes('Rank every survivor perk'), 'Must render description snippet');
    assert.ok(html.includes('Ranked: 15/240'), 'Must render ranked X/Y chip');
    assert.ok(html.indexOf('Ranked: 15/240') < html.indexOf('Rank every survivor perk'), 'Ranked chip must sit in the banner, above the text');
  });

  it('renders /static/... cover_image_url via staticUrl', () => {
    const html = renderWithDictionary(
      React.createElement(OfficialTierListCard, {
        list: {
          id: 1,
          slug: 'survivor-perks',
          kind: 'survivor_perks',
          title: 'Survivor Perks',
          description: 'Rank every survivor perk',
          item_count: 240,
          tier_count: 5,
          has_default_placements: true,
          cover_image_url: '/static/tier-lists/banner_survivor_perks.webp',
          is_featured: true,
          sort_order: 10,
          updated_at: '2026-10-13T00:00:00Z',
        },
        rankedCount: 15,
        locale: 'en',
      })
    );
    assert.ok(html.includes('src="/static/tier-lists/banner_survivor_perks.webp"'), 'Must serve the banner from backend static');
    assert.ok(!html.includes('/static/static/'), 'Must not double-prefix /static/');
  });
});

describe('Tier lists: CustomTierListCard', () => {
  it('renders a squareish delete button (h-8 w-8 rounded-control) and item showcase with overflow badge', () => {
    const customList = {
      id: 'test-custom',
      title: 'My Custom Tier List',
      description: 'Custom description',
      tiers: [
        { id: 's', label: 'S', color: 'tier-s' },
        { id: 'a', label: 'A', color: 'tier-a' },
      ],
      items: [
        { id: '1', name: 'Item 1', image: '/static/icons/1.png' },
        { id: '2', name: 'Item 2', image: '/static/icons/2.png' },
        { id: '3', name: 'Item 3', image: '/static/icons/3.png' },
        { id: '4', name: 'Item 4', image: '/static/icons/4.png' },
        { id: '5', name: 'Item 5', image: '/static/icons/5.png' },
      ],
      placements: { s: ['1', '2'] },
      createdAt: 1000,
      updatedAt: 2000,
    };
    const html = renderWithDictionary(
      React.createElement(CustomTierListCard, {
        list: customList,
        locale: 'en',
        onDelete: () => {},
      })
    );
    assert.ok(html.includes('h-8 w-8 rounded-control'), 'Delete button must be squareish (rounded-control)');
    assert.ok(!html.includes('p-1.5 rounded-full'), 'Must not use circular rounded-full on delete button');
    assert.ok(html.includes('+1'), 'Must render +1 overflow badge for 5th item');
    assert.ok(html.includes('Items: 2/5'), 'Must render Items X/Y chip');
    assert.ok(!html.includes('Custom<'), 'Must not render redundant CUSTOM label');
    assert.ok(html.includes('absolute top-3 right-3'), 'Delete button sits in the banner top-right');
    assert.ok(html.includes('Updated '), 'Updated label must render');
    assert.ok(html.indexOf('aria-label="Delete') < html.indexOf('Updated '), 'Updated label stays in the footer, below the banner');
    // One of the three default covers, picked from the list id (164cd92c).
    assert.match(html, /banner_custom_default_[123]\.webp/, 'Must fallback to a default custom banner');
  });

  it('renders correctly in disabled mode without navigation link or delete button', () => {
    const customList = {
      id: 'preview',
      title: 'Preview List',
      description: '',
      tiers: [{ id: 's', label: 'S', color: 'tier-s' }],
      items: [{ id: '1', name: 'Item 1', image: '/static/icons/1.png' }],
      placements: {},
      createdAt: 1000,
      updatedAt: 1000,
    };
    const html = renderWithDictionary(
      React.createElement(CustomTierListCard, {
        list: customList,
        locale: 'en',
        disabled: true,
      })
    );
    assert.ok(html.includes('aria-disabled="true"'));
    assert.ok(!html.includes('href="/en/tier-lists/custom/preview"'));
    assert.ok(html.includes('Preview List'));
  });

  it('has no tier ladder pips, caps the strip at 4 thumbnails and falls back to initials', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: String(i), name: `Name ${i}`, ...(i === 0 ? {} : { image: `/static/icons/${i}.png` }) }));
    const html = renderWithDictionary(
      React.createElement(CustomTierListCard, {
        list: {
          id: 'big',
          title: 'Big',
          description: '',
          tiers: [{ id: 's', label: 'S', color: '#ff3366' }],
          items,
          placements: {},
          createdAt: 1000,
          updatedAt: 2000,
        },
        locale: 'en',
      })
    );
    assert.ok(!html.includes('#ff3366'), 'Mini tier pips must be gone');
    assert.ok(html.includes('+96'), 'Must show +96 overflow for 100 items');
    assert.equal((html.match(/<img/g) ?? []).length, 1 + 3, 'Banner + 3 thumbnails (first item has no image -> initial)');
    assert.ok(html.includes('>N<'), 'Imageless item must render an initial placeholder');
  });
});

describe('Tier lists: description limit', () => {
  it('every official list description fits the creator limit', () => {
    const lists = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../../backend/app/seeds/data/content/tier_lists.json'), 'utf8'));
    const rows: Array<{ description?: string | null }> = Array.isArray(lists) ? lists : lists.tier_lists ?? lists.data ?? [];
    assert.ok(rows.length > 0, 'seeded lists found');
    for (const row of rows) assert.ok((row.description ?? '').length <= TIER_LIST_LIMITS.maxDescription, row.description ?? '');
  });
});
