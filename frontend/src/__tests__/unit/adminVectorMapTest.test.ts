import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderWithDictionary } from '@/__tests__/helpers/renderWithDictionary';
import { AdminToolsSection } from '@/components/admin/AdminToolsSection';
import { VectorMapTestModal } from '@/components/admin/VectorMapTestModal';
import type { MapLayout, MapRealm } from '@/types/map';

test('AdminToolsSection renders the Vector Map Engine tool row in the Testing card', () => {
  const html = renderWithDictionary(
    React.createElement(AdminToolsSection, {
      refreshKey: 0,
      notify: () => {},
      onDataChanged: () => {},
    })
  );

  assert.ok(html.includes('Vector Map Engine'));
  assert.ok(html.includes('Inspect interactive SVG vector layouts'));
});

test('VectorMapTestModal renders closed without throwing', () => {
  const html = renderWithDictionary(
    React.createElement(VectorMapTestModal, {
      isOpen: false,
      onClose: () => {},
    })
  );

  assert.equal(html, '');
});

test('VectorMapTestModal renders when open with title and selector', () => {
  const html = renderWithDictionary(
    React.createElement(VectorMapTestModal, {
      isOpen: true,
      onClose: () => {},
    })
  );

  assert.ok(html.includes('Vector Map Engine'));
  assert.ok(html.includes('data-testid="vector-map-test-modal"'));
  assert.ok(html.includes('Select a map'));
});
