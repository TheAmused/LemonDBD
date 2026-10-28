// frontend/src/__tests__/unit/legal/aboutPageFormattingAndResponsiveness.test.ts
// RichText's inline markup, the about copy that uses it in every locale, and the /about shell.
// (How the page looks is checked rendered, in every theme, by `npm run check:rendered`.)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';
import { RichText } from '@/components/common/RichText';
import { matchShell } from '@/components/layout/shellRoutes';
import { en, pl, de, es, ja } from '@/locales';

describe('RichText: Semantic Formatting & i18n Markup', () => {
  it('renders <brand> and [brand] tags with bold accent-red styling', () => {
    const html1 = renderWithDictionary(React.createElement(RichText, { text: 'Welcome to <brand>LemonDBD</brand> by <brand>LemonTeam</brand>!' }));
    assert.ok(html1.includes('text-accent-red') && html1.includes('font-extrabold'), 'Brand tag must have bold red styling');
    assert.ok(html1.includes('LemonDBD') && html1.includes('LemonTeam'), 'Brand name must be rendered');

    const html2 = renderWithDictionary(React.createElement(RichText, { text: 'Using [brand]LemonDBD[/brand]' }));
    assert.ok(html2.includes('text-accent-red'), 'BBCode brand tag must have red styling');
  });

  it('renders <b> and ** bold tags with primary text styling', () => {
    const html = renderWithDictionary(React.createElement(RichText, { text: 'Created by <b>TheAmused</b> and **PabloPicasso**.' }));
    assert.ok(html.includes('font-bold text-text-primary'), 'Bold tag must have primary bold styling');
    assert.ok(html.includes('TheAmused') && html.includes('PabloPicasso'), 'Author names must be preserved');
  });

  it('renders <i> and * italic tags for characters, roles, and game titles', () => {
    const html = renderWithDictionary(React.createElement(RichText, { text: 'Plays <i>killer</i> as a *Meghead* in <i>Dead by Daylight</i>.' }));
    assert.ok(html.includes('class="italic"') && !html.includes('font-medium'), 'Italic tags must render purely as cursive without overriding color or weight');
    assert.ok(html.includes('killer') && html.includes('Meghead') && html.includes('Dead by Daylight'));
  });

  it('handles null, undefined, or empty text without throwing', () => {
    assert.equal(renderWithDictionary(React.createElement(RichText, { text: null })), '');
    assert.equal(renderWithDictionary(React.createElement(RichText, { text: '' })), '');
  });
});

describe('Locale Dictionaries: Semantic Tag Consistency', () => {
  for (const [loc, dict] of Object.entries({ en, pl, de, es, ja })) {
    it(`${loc} about copy marks the brand, the authors and the game`, () => {
      const about = JSON.stringify(dict.about);
      assert.ok(about.includes('<brand>LemonDBD</brand>'), `${loc}: LemonDBD in <brand>`);
      assert.ok(about.includes('<brand>LemonTeam</brand>'), `${loc}: LemonTeam in <brand>`);
      assert.ok(about.includes('<b>TheAmused</b>') && about.includes('<b>PabloPicasso</b>'), `${loc}: authors in <b>`);
      assert.ok(about.includes('<i>Dead by Daylight</i>'), `${loc}: game title in <i>`);
      assert.ok(about.includes('<i>Meghead'), `${loc}: Meghead in <i>`);
    });
  }
});

describe('About page shell', () => {
  it('centres the page within the shell', () => {
    const main = matchShell(['about']).shell;
    assert.ok(main && main.mainClassName?.includes('items-center') && main.mainClassName.includes('justify-center'));
  });
});
