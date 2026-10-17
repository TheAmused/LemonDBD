// frontend/src/__tests__/unit/sharedBuildingBlocks.test.tsx
//
// The shared pieces the admin panel is built from: one table, one panel tone, one field label, one pager
// variant, one icon tile, and the named sizes in tokens.css that replace typed-in numbers.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Table, TableBody, TableHead, TableRow, Td, Th } from '@/components/common/Table';
import { Surface, surfaceClassName } from '@/components/common/Surface';
import { FieldLabel, FormField, Input } from '@/components/common/Field';
import { IconTile } from '@/components/common/IconTile';
import { Pagination } from '@/components/common/Pagination';
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE, DENSE_PAGE_SIZE } from '@/constants/pagination';
import { renderWithDictionary } from '../helpers/renderWithDictionary';

const h = React.createElement;
const TOKENS_CSS = fs.readFileSync(path.resolve(__dirname, '../../app/styles/tokens.css'), 'utf8');

describe('Table', () => {
  const render = (props: React.ComponentProps<typeof Table> = {}) =>
    renderWithDictionary(
      h(Table, props,
        h(TableHead, null, h('tr', null, h(Th, null, 'Name'))),
        h(TableBody, null, h(TableRow, null, h(Td, null, 'Ada')))
      )
    );

  it('scrolls sideways on its own and gives every heading a column scope', () => {
    const html = render();
    assert.match(html, /<div class="overflow-x-auto/);
    assert.match(html, /<th scope="col"/);
  });

  it('pads cells by density, for headings and cells alike', () => {
    assert.match(render(), /<th[^>]*class="px-4 py-2\.5"/);
    assert.match(render({ density: 'sm' }), /<td[^>]*class="px-3 py-2"/);
  });

  it('draws the frame only when asked', () => {
    assert.ok(!render().includes('border-border-color rounded'));
    assert.match(render({ framed: true }), /rounded-card border border-border-color/);
  });
});

describe('Surface', () => {
  it('has a bordered well tone, usable on any element through surfaceClassName', () => {
    const html = renderWithDictionary(h(Surface, { tone: 'well', padding: 'sm' }, 'x'));
    assert.match(html, /border border-border-subtle bg-bg-primary/);
    assert.match(html, /p-3/);
    assert.equal(surfaceClassName('well', 'none', 'chip').includes('rounded-chip'), true);
  });
});

describe('Field labels', () => {
  it('FieldLabel is the one small-caps label; FormField ties it to its control', () => {
    const html = renderWithDictionary(h(FormField, { label: 'Login', htmlFor: 'x', children: h(Input, { id: 'x' }) }));
    assert.match(html, /<label class="block type-label-xs text-text-secondary mb-1" for="x">Login<\/label>/);
    assert.match(renderWithDictionary(h(FieldLabel, { as: 'span' }, 'Role')), /^<span class="block type-label-xs/);
  });
});

describe('IconTile', () => {
  it('has a neutral tone and an xs size with control corners', () => {
    const html = renderWithDictionary(h(IconTile, { size: 'xs', tone: 'neutral' }, 'i'));
    assert.match(html, /h-9 w-9 rounded-control/);
    assert.match(html, /bg-bg-elevated/);
  });
});

describe('Pagination', () => {
  const render = (variant?: 'page' | 'embedded') =>
    renderWithDictionary(h(Pagination, { page: 1, totalPages: 3, totalResults: 40, limit: DEFAULT_PAGE_SIZE, onPageChange: () => {}, onLimitChange: () => {}, variant }));

  it('is a page footer by default and a ruled-off panel row when embedded', () => {
    assert.match(render(), /mt-4/);
    const embedded = render('embedded');
    assert.match(embedded, /border-t border-border-color/);
    assert.ok(!embedded.includes('mt-4'));
  });

  it('offers exactly the shared page sizes, through the shared Select', () => {
    const html = render();
    for (const size of PAGE_SIZE_OPTIONS) assert.ok(html.includes(`<option value="${size}"`), String(size));
    assert.match(html, /<select[^>]*class="[^"]*rounded-control[^"]*"/);
  });

  it('every list default is one of the offered sizes', () => {
    assert.ok((PAGE_SIZE_OPTIONS as readonly number[]).includes(DEFAULT_PAGE_SIZE));
    assert.ok((PAGE_SIZE_OPTIONS as readonly number[]).includes(DENSE_PAGE_SIZE));
  });
});

describe('named sizes', () => {
  it('tokens.css defines every size name the admin panel uses', () => {
    for (const name of ['--container-menu', '--container-field-sm', '--container-field', '--container-field-lg', '--container-cell', '--container-cell-lg', '--breakpoint-phone']) {
      assert.ok(TOKENS_CSS.includes(`${name}:`), name);
    }
    for (const util of ['icon-2xs', 'icon-xs', 'icon-sm', 'icon-md', 'icon-lg', 'max-h-list', 'max-h-roster', 'min-h-skeleton-tab', 'min-h-skeleton-page', 'grid-cols-field-suffix', 'grid-cols-label-wide', 'grid-cols-label-control', 'no-spinner']) {
      assert.ok(TOKENS_CSS.includes(`@utility ${util} `), util);
    }
  });
});
