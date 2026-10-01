// frontend/src/__tests__/unit/richText.test.ts
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RichText, STYLE_TOKENS } from '@/components/common/RichText';

const html = (text: string, props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(React.createElement(RichText, { text, ...props }));

test('RichText: markdown inline, bullets, quotes and notices in block mode', () => {
  const out = html('Gain **10/12/14s** of *Haste*.\n• one\n• two\n> “Quote” -Someone\n!! THIS ITEM IS NO LONGER AVAILABLE', {
    block: true,
    variant: 'game',
  });
  assert.match(out, /<strong[^>]*>10\/12\/14s<\/strong>/);
  assert.match(out, /<em[^>]*>Haste<\/em>/);
  assert.strictEqual((out.match(/<li/g) || []).length, 2);
  assert.match(out, /<blockquote/);
  assert.match(out, /Notice/);
});

test('RichText: backticks are input buttons in the game variant', () => {
  const out = html('Press `Active Ability Button 1`.', { variant: 'game' });
  assert.match(out, /<code[^>]*border-accent-amber[^>]*>Active Ability Button 1<\/code>/);
});

test('RichText: colour spans accept style tokens and css colours', () => {
  assert.match(html('{red|danger}'), new RegExp(`class="${STYLE_TOKENS.red}"`));
  assert.match(html('{#c33|custom}'), /style="color:#c33"/);
  assert.doesNotMatch(html('{0}% stays literal'), /<span/);
});

test('RichText: html subset is sanitised', () => {
  const out = html('<b>ok</b><script>alert(1)</script><a href="javascript:alert(1)">x</a>');
  assert.match(out, /<strong/);
  assert.doesNotMatch(out, /<script|javascript:/);
});

test('RichText: legacy tags and style tokens', () => {
  assert.match(html('[brand]LemonDBD[/brand]'), /font-extrabold/);
  assert.match(html('<amber>x</amber>'), /text-accent-amber/);
});

test('seed descriptions are markup-free (no leaked html)', () => {
  const dir = path.resolve(__dirname, '../../../../backend/app/seeds/data/content');
  if (!fs.existsSync(dir)) return;
  for (const f of ['perks.json', 'items.json', 'offerings.json', 'killers.json']) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
    assert.doesNotMatch(raw, /"(?:description|power_description)": "[^"]*<(?:br|b|i|li|ul|p|span)\b/, f);
  }
});
