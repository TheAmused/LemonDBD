import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Pagination } from '@/components/Pagination';
import { PerkDescription } from '@/components/PerkDescription';

describe('Perks Vault Theme Support', () => {
  it('Pagination numbers do not use hardcoded text-slate-100 without dark variant', () => {
    const html = renderToStaticMarkup(
      React.createElement(Pagination, {
        page: 1,
        totalPages: 5,
        totalResults: 75,
        limit: 15,
        onPageChange: () => {},
        onLimitChange: () => {},
      })
    );
    assert.ok(html.includes('dark:text-slate-100'), 'Numbers must have dark:text-slate-100');
    assert.ok(html.includes('text-slate-900'), 'Numbers must have text-slate-900 for light mode');
    assert.ok(html.includes('border-slate-200'), 'Buttons must support border-slate-200');
  });

  it('PerkDescription supports dark text in light mode and silver in dark mode', () => {
    const html = renderToStaticMarkup(
      React.createElement(PerkDescription, {
        description: 'Grants a 3% Haste effect.',
      })
    );
    assert.ok(html.includes('text-slate-700') || html.includes('text-slate-800'), 'Must have dark text in light mode');
    assert.ok(html.includes('dark:text-slate-300'), 'Must have dark:text-slate-300');
  });
});
