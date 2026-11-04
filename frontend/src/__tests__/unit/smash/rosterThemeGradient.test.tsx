// frontend/src/__tests__/unit/smash/rosterThemeGradient.test.tsx
//
// A roster's theme colour is one colour or a gradient. A gradient paints the edge of the candidate card
// (both faces) and of the four lore cards; a single colour leaves them as they are.
import '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, withDictionary } from '../../helpers/dom';
import { FloatingLoreScattered } from '@/components/smash-or-pass/FloatingLoreScattered';
import { encodeThemeColor, themeGradientOf, themedEdgeStyle } from '@/utils/smashOrPass/badgeGradient';
import type { EntityItem } from '@/types/smashOrPass';

const sable = {
  id: 'e1', roster_id: 'r1', slug: 'sable_ward', name: 'Sable Ward', role: 'Survivor', gender: 'female',
  metadata: { turn_on: 'Candlelit basements', dealbreaker: 'Sunlight' },
} as unknown as EntityItem;

const edges = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('.lore-ash-card')).map((el) => el.style.backgroundImage);

describe('theme colour as text', () => {
  it('a single colour is a pair with equal ends and goes back to one colour', () => {
    assert.deepEqual(themeGradientOf('#ec4899'), { from: '#ec4899', to: '#ec4899' });
    assert.equal(encodeThemeColor({ from: '#ec4899', to: '#ec4899' }), '#ec4899');
  });

  it('two colours are a custom gradient and round-trip', () => {
    const text = encodeThemeColor({ from: '#112233', to: '#445566' });
    assert.equal(text, 'custom:#112233,#445566');
    assert.deepEqual(themeGradientOf(text), { from: '#112233', to: '#445566' });
  });

  it('only a gradient repaints an edge', () => {
    assert.equal(themedEdgeStyle('#ec4899', 'var(--bg-primary)'), undefined);
    assert.match(
      themedEdgeStyle('custom:#112233,#445566', 'var(--bg-primary)')?.backgroundImage ?? '',
      /linear-gradient\(155deg, #112233, #445566\)/
    );
  });
});

describe('lore cards', () => {
  it('all four get the roster gradient as their edge', () => {
    const view = render(<FloatingLoreScattered character={sable} themeColor="custom:#112233,#445566" />, { wrapper: withDictionary() });
    const found = edges(view.container);
    assert.equal(found.length, 4);
    for (const image of found) assert.match(image, /#112233/);
  });

  it('a single-colour theme leaves them as they are', () => {
    const view = render(<FloatingLoreScattered character={sable} themeColor="#ec4899" />, { wrapper: withDictionary() });
    for (const image of edges(view.container)) assert.equal(image, '');
  });
});
