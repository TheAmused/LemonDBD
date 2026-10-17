// frontend/src/__tests__/unit/sharedFormPrimitives.test.ts
import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderWithDictionary } from '../helpers/renderWithDictionary';
import { Alert } from '@/components/common/Alert';
import { Badge } from '@/components/common/Badge';
import { FormField } from '@/components/common/Field';

const render = (node: React.ReactElement) => renderWithDictionary(node);

test('FormField: required adds a red asterisk and the label uses the small caps style', () => {
  const out = render(
    React.createElement(FormField, {
      label: 'Title',
      htmlFor: 't',
      required: true,
      children: React.createElement('input', { id: 't' }),
    })
  );
  assert.match(out, /<label[^>]*type-label-xs[^>]*for="t"/);
  assert.match(out, /text-accent-red"> \*<\/span>/);
});

test('FormField: without required there is no asterisk', () => {
  const out = render(React.createElement(FormField, { label: 'Title', children: React.createElement('input') }));
  assert.doesNotMatch(out, /\*/);
});

test('Alert: an announced error box with an optional dismiss button', () => {
  const plain = render(React.createElement(Alert, { children: 'Could not save' }));
  assert.match(plain, /role="alert"/);
  assert.match(plain, /Could not save/);
  assert.doesNotMatch(plain, /<button/);

  const dismissible = render(React.createElement(Alert, { onDismiss: () => {}, dismissLabel: 'Close', children: 'Could not save' }));
  assert.match(dismissible, /<button[^>]*aria-label="Close"/);
});

test('Badge: redSolid is the filled "New" marker', () => {
  const out = render(React.createElement(Badge, { tone: 'redSolid', children: 'New' }));
  assert.match(out, /bg-accent-red[^"]*text-text-inverted/);
});
