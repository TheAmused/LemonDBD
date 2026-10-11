// frontend/src/__tests__/unit/blockCard.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlockCard, BlockCardPair } from '@/components/common/BlockCard';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

const item = (id: string, title: string) => ({ id, storageKey: `test_${id}`, title, children: React.createElement('p', null, `${id} body`) });

test('BlockCardPair: each card carries one inert, invisible copy of its neighbour, so both stay one height', () => {
  const html = renderToStaticMarkup(React.createElement(BlockCardPair, { a: item('a', 'Alpha'), b: item('b', 'Beta') }));
  assert.equal(count(html, '>Alpha<'), 2, 'Alpha: its own title + the copy in Beta');
  assert.equal(count(html, '>Beta<'), 2, 'Beta: its own title + the copy in Alpha');
  assert.equal(count(html, 'inert=""'), 2, 'both copies are inert');
  assert.equal(count(html, 'aria-hidden="true" inert=""'), 2, 'both copies are hidden from assistive tech');
  assert.equal(count(html, 'id="a-title"'), 1, 'the copy does not duplicate heading ids');
});

test('BlockCard: a lone card (Privacy Policy) carries no copy', () => {
  const html = renderToStaticMarkup(React.createElement(BlockCard, item('solo', 'Solo')));
  assert.equal(count(html, '>Solo<'), 1);
  assert.ok(!html.includes('inert'));
});

test('BlockCard: the box never switches between stretched and fit-content, which is what made cards snap open', () => {
  const source = read('components/common/BlockCard.tsx')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
  assert.ok(source.includes('self-start'), 'cards size to their own content');
  assert.ok(!/self-stretch|h-fit|h-full/.test(source), 'no height switching');
  assert.ok(source.includes('grid-rows-[0fr]') && source.includes('grid-rows-[1fr]'), 'height changes are 0fr <-> 1fr transitions');
  assert.ok(source.includes('transition-[grid-template-rows'), 'the row change is transitioned');
});

test('About, Privacy Policy, Terms and Rules all use the shared card instead of their own copies', () => {
  assert.ok(read('app/[locale]/about/page.tsx').includes('BlockCardPair'));
  assert.ok(read('app/[locale]/privacy-policy/page.tsx').includes('BlockCard'));
  assert.ok(read('components/legal/LegalSections.tsx').includes('BlockCardPair'));
  for (const rel of ['app/[locale]/about/page.tsx', 'app/[locale]/privacy-policy/page.tsx', 'components/legal/LegalSections.tsx']) {
    assert.ok(!read(rel).includes('usePersistentDrawer'), `${rel} leaves drawer state to BlockCard`);
  }
});
