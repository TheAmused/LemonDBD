// frontend/src/__tests__/guards/tierListStyles.test.ts
//
// Two styling rules with a reason behind them:
// - Tailwind emits the px-based `wide`/`wide-2k` breakpoints before sm..xl (rem), so in
//   "lg:w-20 wide-2k:w-24" the lg rule wins even at 4K: any property with a wide* variant must cap
//   its smaller breakpoints (lg:max-wide-2k:w-20).
// - Tier colours are theme tokens defined for all three themes, and the OS-dark fallback block
//   stays a copy of .dark.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readGlobalCss } from '../../../scripts/lib/globalCss';
import { TIER_COLOR_TOKENS, TIER_TOKEN_BG_CLASSES } from '@/utils/tierLists/constants';

const SRC = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

describe('tier list styles', () => {
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
});
