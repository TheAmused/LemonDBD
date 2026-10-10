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
      assert.ok(fs.existsSync(path.join(SRC, 'app/[locale]', path.dirname(rel), 'loading.tsx')));
    });
  }

  it('the sidebar links to the hub', () => {
    const sidebar = read('components/Sidebar.tsx');
    assert.ok(sidebar.includes("id: 'tier-lists'"));
    assert.ok(sidebar.includes('href: `/${currentLocale}/tier-lists`'));
  });

  it('the page is viewport-locked and the pool keeps a reserved height so toggling it never moves its header', () => {
    const pool = read('components/tier-lists/TierPool.tsx');
    assert.ok(pool.includes('var(--pool-h)'));
    const board = read('components/tier-lists/TierListBoard.tsx');
    assert.ok(board.includes('--pool-h:'));
    assert.ok(board.includes('max-h-[calc(100%-var(--pool-h)'));
    assert.ok(read('app/[locale]/tier-lists/[slug]/page.tsx').includes('h-dvh overflow-hidden'));
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
