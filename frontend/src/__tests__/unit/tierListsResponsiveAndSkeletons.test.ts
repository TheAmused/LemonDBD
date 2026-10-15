// frontend/src/__tests__/unit/tierListsResponsiveAndSkeletons.test.ts
import { placeholderNames } from '@/utils/i18nFormat';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readGlobalCss } from '../../../scripts/lib/globalCss';
import React from 'react';
import { TierListSkeleton } from '@/components/tier-lists/TierListSkeleton';
import { TierItemTile } from '@/components/tier-lists/TierItemTile';
import { OfficialTierListCard, CustomTierListCard } from '@/components/tier-lists/TierListCards';
import { tierColorProps } from '@/components/tier-lists/tierColor';
import { TIER_COLOR_TOKENS, TIER_TOKEN_BG_CLASSES } from '@/utils/tierLists/constants';
import enDict from '@/locales/en';
import deDict from '@/locales/de';
import esDict from '@/locales/es';
import jaDict from '@/locales/ja';
import plDict from '@/locales/pl';
import { renderWithDictionary } from '../helpers/renderWithDictionary';

const SRC = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

describe('Tier lists: skeleton', () => {
  it('renders role="status", aria-busy and the DBD skill-check spinner', () => {
    const html = renderWithDictionary(React.createElement(TierListSkeleton, {}));
    assert.ok(html.includes('role="status"'));
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

  it('tiles are 48px on the smallest phones (w-12/h-12) and 56px from 480px up, above the 44px touch minimum', () => {
    const source = read('components/tier-lists/TierItemTile.tsx');
    assert.match(source, /square: 'w-12 min-\[480px\]:w-14 /);
    assert.match(source, /square: 'h-12 min-\[480px\]:h-14 /);
  });

  it('size breakpoints never let an sm..xl rule shadow a wide*/wide-2k rule on the same property', () => {
    // Tailwind emits the px-based `wide`/`wide-2k` breakpoints before sm..xl (rem), so in
    // "lg:w-20 wide-2k:w-24" the lg rule wins even at 4K. Within one class string, any
    // property that has a wide* variant must cap its smaller breakpoints (lg:max-wide-2k:w-20).
    const files = ['TierItemTile.tsx', 'TierRow.tsx', 'TierListBoard.tsx', 'TierListHub.tsx', 'TierListEditor.tsx', 'creator/TierListCreator.tsx'];
    for (const file of files) {
      const source = read(`components/tier-lists/${file}`);
      for (const [literal] of source.matchAll(/'[^'\n]*'|"[^"\n]*"/g)) {
        const tokens = literal.slice(1, -1).split(/\s+/).map((tok) => {
          const parts = tok.split(':');
          const utility = parts.pop() ?? '';
          return { tok, variants: parts, prop: utility.replace(/-(\[.*\]|[^-]+)$/, '') };
        });
        const wideProps = new Set(tokens.filter((x) => x.variants.some((v) => /^wide/.test(v))).map((x) => x.prop));
        for (const x of tokens) {
          const openEnded = x.variants.some((v) => /^(sm|md|lg|xl)$/.test(v)) && !x.variants.some((v) => v.startsWith('max-'));
          assert.ok(!(openEnded && wideProps.has(x.prop)), `${file}: "${x.tok}" shadows a wide* ${x.prop} rule`);
        }
      }
    }
  });

  it('every token color has a literal Tailwind class backed by a --color-tier-* theme token in all 3 themes', () => {
    const css = readGlobalCss(path.resolve(__dirname, '../../app/globals.css'));

    // `@media (prefers-color-scheme: dark) { :root:not(.light, .light-lemon,
    // .dark) {...} }` is a deliberate, byte-for-byte mirror of `.dark` (see
    // the comment above it in globals.css): it only closes the FOUC gap
    // before next-themes' script picks a real class, so it is not a fourth
    // theme. It's stripped out before counting the three real ones, and
    // checked separately below for staying in sync with `.dark`.
    const mediaStart = css.indexOf('@media (prefers-color-scheme: dark)');
    assert.ok(mediaStart >= 0, 'expected the documented OS-dark gap-frame fallback block');
    const braceStart = css.indexOf('{', mediaStart);
    let depth = 0;
    let mediaEnd = braceStart;
    for (let i = braceStart; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          mediaEnd = i + 1;
          break;
        }
      }
    }
    const fallbackBlock = css.slice(mediaStart, mediaEnd);
    const withoutFallback = css.slice(0, mediaStart) + css.slice(mediaEnd);

    for (const token of TIER_COLOR_TOKENS) {
      assert.equal(TIER_TOKEN_BG_CLASSES[token], `bg-tier-${token}`);
      assert.ok(withoutFallback.includes(`--color-tier-${token}: var(--tier-${token});`), `missing @theme mapping for ${token}`);
      const definitions = withoutFallback.match(new RegExp(`--tier-${token}: #[0-9a-f]{6};`, 'g')) ?? [];
      assert.equal(definitions.length, 3, `--tier-${token} must be defined for light, light-lemon and dark`);

      const darkMatch = withoutFallback.match(new RegExp(`\\.dark \\{[\\s\\S]*?--tier-${token}: (#[0-9a-f]{6});`));
      const fallbackMatch = fallbackBlock.match(new RegExp(`--tier-${token}: (#[0-9a-f]{6});`));
      assert.ok(darkMatch && fallbackMatch, `expected --tier-${token} in both .dark and the OS-dark fallback`);
      assert.equal(fallbackMatch[1], darkMatch[1], `OS-dark fallback --tier-${token} has drifted from .dark`);
    }
  });

  it('custom hex colors use an inline background with a contrasting ink class', () => {
    assert.deepEqual(tierColorProps('s'), { className: 'bg-tier-s text-tier-ink' });
    assert.deepEqual(tierColorProps('#101030'), {
      className: 'text-text-inverted',
      style: { backgroundColor: '#101030' },
    });
  });
});

describe('Tier lists: pages and navigation', () => {
  const pages = ['tier-lists/page.tsx', 'tier-lists/[slug]/page.tsx', 'tier-lists/custom/[id]/page.tsx'];

  for (const rel of pages) {
    it(`${rel} renders through <PageShell> and has a loading.tsx`, () => {
      const source = read(`app/[locale]/${rel}`);
      assert.ok(source.includes('<PageShell'));
      assert.ok(source.includes('activeCategory="tier-lists"'));
      assert.ok(
        fs.existsSync(path.join(SRC, 'app/[locale]', path.dirname(rel), 'loading.tsx')) ||
        fs.existsSync(path.join(SRC, 'app/[locale]/tier-lists/loading.tsx'))
      );
    });
  }

  it('the sidebar links to the hub', () => {
    const sidebar = read('components/Sidebar.tsx');
    assert.ok(sidebar.includes("id: 'tier-lists'"));
    assert.ok(sidebar.includes('href: `/${currentLocale}/tier-lists`'));
  });

  it('the page scrolls naturally and the board sizes tiles from useBoardFit', () => {
    const board = read('components/tier-lists/TierListBoard.tsx');
    assert.ok(board.includes('useBoardFit(') && board.includes('--tile'), 'tile size comes from the fit hook');
    assert.ok(!board.includes('--pool-h'), 'no fixed pool reserve any more');
    const pool = read('components/tier-lists/TierPool.tsx');
    assert.ok(pool.includes('--pool-min-total'));
    assert.ok(!read('app/[locale]/tier-lists/[slug]/page.tsx').includes('h-dvh overflow-hidden'));
    assert.ok(board.includes('SidewaysPointerSensor') && board.includes('KeyboardSensor'), 'touch and keyboard dragging');
  });
});

describe('Tier lists: i18n parity across all 5 locales', () => {
  const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, string> =>
    Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
      if (v && typeof v === 'object') Object.assign(acc, flatten(v as Record<string, unknown>, `${prefix}${k}.`));
      else acc[`${prefix}${k}`] = String(v);
      return acc;
    }, {});
  const placeholders = (s: string) => placeholderNames(s).join(',');

  const en = flatten(enDict.tierLists as unknown as Record<string, unknown>);
  const others = { de: deDict, es: esDict, ja: jaDict, pl: plDict };

  for (const [code, dict] of Object.entries(others)) {
    it(`'${code}' has every tierLists key, non-empty, with the same placeholders`, () => {
      const loc = flatten(dict.tierLists as unknown as Record<string, unknown>);
      assert.deepEqual(Object.keys(loc).sort(), Object.keys(en).sort());
      for (const [key, value] of Object.entries(loc)) {
        assert.ok(value.trim().length > 0, `${code}.tierLists.${key} is empty`);
        assert.equal(placeholders(value), placeholders(en[key]), `${code}.tierLists.${key} placeholders differ`);
      }
      assert.ok(typeof dict.sidebar.tierLists === 'string' && dict.sidebar.tierLists.length > 0);
    });
  }
});

describe('Tier lists: banner assets', () => {
  it('all 6 official and default custom banner graphics exist in backend/app/static/tier-lists/ (single source of truth)', () => {
    const banners = [
      'banner_survivor_perks.webp',
      'banner_killer_perks.webp',
      'banner_survivors.webp',
      'banner_killers.webp',
      'banner_maps.webp',
      'banner_custom_default.webp',
    ];
    const bannerDir = path.resolve(__dirname, '../../../../backend/app/static/tier-lists');
    assert.ok(!fs.existsSync(path.resolve(__dirname, '../../../public/images/tier-lists/banner_maps.webp')), 'Banners must not be duplicated in the frontend');
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
    assert.ok(html.includes('banner_custom_default.webp'), 'Must fallback to default custom banner');
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

describe('Tier lists: Hub drawer counts', () => {
  it('Hub contains count badges for official and custom sections', () => {
    const source = read('components/tier-lists/TierListHub.tsx');
    assert.match(source, /lists\.length\s*>\s*0\s*&&\s*\(/);
    assert.match(source, /customCount/);
  });
});


describe('Tier lists: description limit and peek', () => {
  it('caps creator descriptions at 200 chars (longest seeded text is 147)', () => {
    assert.match(read('utils/tierLists/constants.ts'), /maxDescription:\s*200/);
  });

  it('cards reveal clamped descriptions in the banner instead of growing', () => {
    const source = read('components/tier-lists/TierListCards.tsx');
    assert.match(source, /function DescriptionPeek/);
    assert.equal((source.match(/<DescriptionPeek/g) ?? []).length, 2, 'Both official and custom cards use the peek');
  });
});
