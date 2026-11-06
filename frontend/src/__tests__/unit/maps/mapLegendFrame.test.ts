// frontend/src/__tests__/unit/maps/mapLegendFrame.test.ts
import '../../helpers/dom';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '../../helpers/dom';
import { MapLegendFrame } from '@/components/maps/MapLegendFrame';
import {
  MAP_LEGEND_STORAGE_KEY,
  clampLegendPosition,
  parseLegendState,
  serializeLegendState,
} from '@/hooks/useMapLegendState';

const frame = () =>
  React.createElement(MapLegendFrame, {
    title: 'Map Legend',
    toggleLabel: 'Toggle Map Legend',
    moveLabel: 'Move legend',
    children: React.createElement('p', null, 'Body'),
  });

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
});

test('a missing, broken or stale saved state is the default: open, in its place', () => {
  for (const raw of [null, '', 'nope', '[]', 'null', '{"x":"1","y":2}', '{"x":1}']) {
    assert.deepStrictEqual(parseLegendState(raw), { collapsed: false, position: null }, String(raw));
  }
});

test('the saved state round-trips, with whole-pixel positions', () => {
  const raw = serializeLegendState({ collapsed: true, position: { x: 10.4, y: 20.6 } });
  assert.deepStrictEqual(parseLegendState(raw), { collapsed: true, position: { x: 10, y: 21 } });
  assert.strictEqual(serializeLegendState({ collapsed: false, position: null }), '{"collapsed":false}');
});

test('a position is kept inside the map area, whatever the window did since it was saved', () => {
  const size = { width: 100, height: 50 };
  const bounds = { width: 400, height: 300 };
  assert.deepStrictEqual(clampLegendPosition({ x: -20, y: -5 }, size, bounds), { x: 0, y: 0 });
  assert.deepStrictEqual(clampLegendPosition({ x: 900, y: 900 }, size, bounds), { x: 300, y: 250 });
  assert.deepStrictEqual(clampLegendPosition({ x: 120, y: 80 }, size, bounds), { x: 120, y: 80 });
  assert.deepStrictEqual(clampLegendPosition({ x: 50, y: 50 }, { width: 500, height: 500 }, bounds), { x: 0, y: 0 });
});

test('folding the legend is remembered, and a fresh mount comes back folded', () => {
  render(frame());
  const toggle = screen.getByTestId('map-legend-toggle');
  assert.strictEqual(toggle.getAttribute('aria-expanded'), 'true');
  fireEvent.click(toggle);
  assert.strictEqual(screen.getByTestId('map-legend-toggle').getAttribute('aria-expanded'), 'false');
  assert.strictEqual(parseLegendState(window.localStorage.getItem(MAP_LEGEND_STORAGE_KEY)).collapsed, true);
  assert.ok(screen.getByText('Body').parentElement?.className.includes('hidden'), 'the body is hidden from sm up');

  cleanup();
  render(frame());
  assert.strictEqual(screen.getByTestId('map-legend-toggle').getAttribute('aria-expanded'), 'false');
  fireEvent.click(screen.getByTestId('map-legend-toggle'));
  assert.strictEqual(parseLegendState(window.localStorage.getItem(MAP_LEGEND_STORAGE_KEY)).collapsed, false);
});

test('the handle moves the legend with the arrow keys, Shift moves further, Home puts it back', () => {
  render(frame());
  const grip = screen.getByTestId('map-legend-grip');
  fireEvent.keyDown(grip, { key: 'ArrowRight' });
  assert.deepStrictEqual(parseLegendState(window.localStorage.getItem(MAP_LEGEND_STORAGE_KEY)).position, { x: 16, y: 0 });
  fireEvent.keyDown(screen.getByTestId('map-legend-grip'), { key: 'ArrowDown', shiftKey: true });
  assert.deepStrictEqual(parseLegendState(window.localStorage.getItem(MAP_LEGEND_STORAGE_KEY)).position, { x: 16, y: 64 });
  fireEvent.keyDown(screen.getByTestId('map-legend-grip'), { key: 'Home' });
  assert.strictEqual(parseLegendState(window.localStorage.getItem(MAP_LEGEND_STORAGE_KEY)).position, null);
});
