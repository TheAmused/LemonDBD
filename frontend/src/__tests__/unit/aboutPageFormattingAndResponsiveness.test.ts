// frontend/src/__tests__/unit/aboutPageFormattingAndResponsiveness.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RichText } from '@/components/common/RichText';

describe('RichText: Semantic Formatting & i18n Markup', () => {
  it('renders <brand> and [brand] tags with bold accent-red styling', () => {
    const html1 = renderToStaticMarkup(React.createElement(RichText, { text: 'Welcome to <brand>LemonDBD</brand> by <brand>LemonTeam</brand>!' }));
    assert.ok(html1.includes('text-accent-red') && html1.includes('font-extrabold'), 'Brand tag must have bold red styling');
    assert.ok(html1.includes('LemonDBD') && html1.includes('LemonTeam'), 'Brand name must be rendered');

    const html2 = renderToStaticMarkup(React.createElement(RichText, { text: 'Using [brand]LemonDBD[/brand]' }));
    assert.ok(html2.includes('text-accent-red'), 'BBCode brand tag must have red styling');
  });

  it('renders <b> and ** bold tags with primary text styling', () => {
    const html = renderToStaticMarkup(React.createElement(RichText, { text: 'Created by <b>TheAmused</b> and **PabloPicasso**.' }));
    assert.ok(html.includes('font-bold text-text-primary'), 'Bold tag must have primary bold styling');
    assert.ok(html.includes('TheAmused') && html.includes('PabloPicasso'), 'Author names must be preserved');
  });

  it('renders <i> and * italic tags for characters, roles, and game titles', () => {
    const html = renderToStaticMarkup(React.createElement(RichText, { text: 'Plays <i>killer</i> as a *Meghead* in <i>Dead by Daylight</i>.' }));
    assert.ok(html.includes('class="italic"') && !html.includes('font-medium'), 'Italic tags must render purely as cursive without overriding color or weight');
    assert.ok(html.includes('killer') && html.includes('Meghead') && html.includes('Dead by Daylight'));
  });

  it('handles null, undefined, or empty text without throwing', () => {
    assert.equal(renderToStaticMarkup(React.createElement(RichText, { text: null })), '');
    assert.equal(renderToStaticMarkup(React.createElement(RichText, { text: '' })), '');
  });
});

describe('Locale Dictionaries: Semantic Tag Consistency', () => {
  const locales = ['en', 'pl', 'de', 'es', 'ja'] as const;

  for (const loc of locales) {
    it(`locale ${loc}/about.ts contains semantic <brand>, <b>, and <i> formatting tags`, () => {
      const locPath = path.resolve(__dirname, `../../locales/${loc}/about.ts`);
      const content = fs.readFileSync(locPath, 'utf-8');

      assert.ok(
        content.includes('<brand>LemonDBD</brand>'),
        `${loc}/about.ts must wrap LemonDBD in <brand>`
      );
      assert.ok(
        content.includes('<brand>LemonTeam</brand>'),
        `${loc}/about.ts must wrap LemonTeam in <brand>`
      );
      assert.ok(
        content.includes('<b>TheAmused</b>') && content.includes('<b>PabloPicasso</b>'),
        `${loc}/about.ts must wrap author names in <b>`
      );
      assert.ok(
        content.includes('<i>Dead by Daylight</i>'),
        `${loc}/about.ts must wrap Dead by Daylight in <i>`
      );
      assert.ok(
        content.includes('<i>Meghead') || content.includes('<i>Megheadem'),
        `${loc}/about.ts must wrap Meghead in <i>`
      );
    });
  }
});

describe('About Page: Layout, Typography & LocalStorage', () => {
  const pagePath = path.resolve(__dirname, '../../app/[locale]/about/page.tsx');
  const source = fs.readFileSync(pagePath, 'utf-8');

  it('uses RichText component rather than hardcoded language-specific regexes in page component', () => {
    assert.ok(source.includes("import { RichText } from '@/components/common/RichText'"), 'Must import RichText');
    assert.ok(source.includes('<RichText text='), 'Must render paragraphs with RichText');
    assert.ok(!source.includes('CHARACTERS_AND_TERMS'), 'Page must not contain hardcoded vocabulary list');
  });

  it('centers card titles and highlights them in bold accent-red', () => {
    assert.ok(
      source.includes('text-accent-red') && source.includes('text-center'),
      'Card headings must be centered and colored with accent-red'
    );
    assert.ok(
      source.includes('font-extrabold') || source.includes('font-bold'),
      'Card headings must be bold'
    );
    assert.ok(
      source.includes('font-mono'),
      'Card headings must use font-mono consistent with application headers'
    );
  });

  it('justifies paragraph text in cards with hyphens-auto for mobile and desktop readability', () => {
    assert.ok(
      source.includes('text-justify'),
      'Paragraph text must be justified'
    );
    assert.ok(
      source.includes('hyphens-auto'),
      'Paragraph text must enable hyphens-auto to avoid word gaps on narrow screens'
    );
  });

  it('implements responsive 2:2:1 grid layout with aligned row heights and spanning credits', () => {
    assert.ok(
      source.includes('grid-cols-1 lg:grid-cols-2'),
      'Must use responsive 2-column grid on desktop'
    );
    assert.ok(
      source.includes('items-stretch'),
      'Must use items-stretch so cards in the same row match heights and stay aligned'
    );
    assert.ok(
      source.includes('lg:col-span-2'),
      'Credits card must span both columns in the 2:2:1 layout'
    );
    assert.ok(
      source.includes('max-w-5xl') || source.includes('max-w-6xl'),
      'Container must expand to max-w-5xl / max-w-6xl for 1440px+ viewports'
    );
  });

  it('persists card accordion expansion in LocalStorage via usePersistentDrawer', () => {
    assert.ok(
      source.includes('usePersistentDrawer'),
      'Must use usePersistentDrawer hook'
    );
    assert.ok(
      source.includes('lemondbd_drawer_about_'),
      'Must use scoped lemondbd_drawer_about_ storage key prefix'
    );
  });
});
