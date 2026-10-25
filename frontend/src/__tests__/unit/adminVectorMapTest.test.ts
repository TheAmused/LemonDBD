import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderWithDictionary } from '@/__tests__/helpers/renderWithDictionary';
import { AdminToolsSection } from '@/components/admin/AdminToolsSection';
import { VectorMapTestModal, VectorMapTestBody } from '@/components/admin/VectorMapTestModal';
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

test('VectorMapTestModal renders without throwing', () => {
  const html = renderWithDictionary(
    React.createElement(VectorMapTestModal, {
      isOpen: false,
      onClose: () => {},
    })
  );

  assert.equal(html, '');
});

test('VectorMapTestBody renders with title, selector, and controls', () => {
  const dummyMaps: MapRealm[] = [
    {
      id: 1,
      name: 'Coal Tower',
      slug: 'coal-tower',
      realm_slug: 'the-macmillan-estate',
      source: 'lemondbd',
      realm: 'The MacMillan Estate',
      size_sq_tiles: 128,
      size_sq_meters: 8192,
    },
  ];

  const dummyLayout: MapLayout = {
    v: 1,
    cell_m: 8,
    width_m: 128,
    height_m: 128,
    floors: [
      {
        label: null,
        outline: [
          [
            [0, 0],
            [128, 0],
            [128, 128],
            [0, 128],
          ],
        ],
        blocked: [],
        area_m2: 16384,
        landmarks: [],
      },
    ],
  };

  const html = renderWithDictionary(
    React.createElement(VectorMapTestBody, {
      maps: dummyMaps,
      selectedMapId: 1,
      onSelectMapId: () => {},
      layout: dummyLayout,
      floorIndex: 0,
      onSelectFloorIndex: () => {},
      isLegendOpen: false,
      onToggleLegend: () => {},
      onCloseLegend: () => {},
      loadingMaps: false,
      loadingLayout: false,
      error: null,
    })
  );

  assert.ok(html.includes('Inspect interactive SVG vector layouts'));
  assert.ok(html.includes('data-testid="vector-map-test-modal"'));
  assert.ok(html.includes('Coal Tower'));
  assert.ok(html.includes('Select a map'));
});
