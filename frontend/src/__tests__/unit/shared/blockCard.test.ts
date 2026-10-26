// frontend/src/__tests__/unit/shared/blockCard.test.ts
// (That About, Privacy, Terms and Rules all use this card is a rule: guards/sharedPrimitivesSource.)
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlockCard, BlockCardPair } from '@/components/common/BlockCard';

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




