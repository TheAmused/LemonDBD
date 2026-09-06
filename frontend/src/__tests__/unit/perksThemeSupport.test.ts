// frontend/src/__tests__/unit/perksThemeSupport.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Pagination } from '@/components/Pagination';
import { PerkDescription } from '@/components/PerkDescription';
import { PerkCard } from '@/components/PerkCard';
import { PerkModal } from '@/components/PerkModal';
import { Perk } from '@/types/perks';

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
    assert.ok(
      html.includes('text-text-primary') || html.includes('dark:text-slate-100'),
      'Numbers must have dark:text-slate-100 or text-text-primary'
    );
    assert.ok(
      html.includes('text-text-primary') || html.includes('text-slate-900'),
      'Numbers must have text-slate-900 or text-text-primary'
    );
    assert.ok(
      html.includes('border-border-color') || html.includes('border-slate-200'),
      'Buttons must support themed border'
    );
  });

  it('Pagination with totalPages > 7 renders jump input and limit select with theme classes', () => {
    const html = renderToStaticMarkup(
      React.createElement(Pagination, {
        page: 1,
        totalPages: 10,
        totalResults: 150,
        limit: 15,
        onPageChange: () => {},
        onLimitChange: () => {},
      })
    );
    // Limit select classes
    assert.ok(
      html.includes('border-border-color') || html.includes('border-slate-200'),
      'Limit select must support themed border'
    );
    assert.ok(
      html.includes('border-border-color') || html.includes('dark:border-slate-800'),
      'Limit select must support dark border'
    );
    assert.ok(
      html.includes('bg-bg-elevated') || html.includes('bg-bg-surface') || html.includes('bg-white'),
      'Limit select must support themed bg'
    );
    assert.ok(
      html.includes('bg-bg-elevated') || html.includes('bg-bg-surface') || html.includes('dark:bg-slate-900'),
      'Limit select must support dark bg'
    );
    assert.ok(
      html.includes('text-text-primary') || html.includes('text-slate-900'),
      'Limit select must support themed text'
    );
    assert.ok(
      html.includes('text-text-primary') || html.includes('dark:text-slate-200'),
      'Limit select must support dark text'
    );

    // Jump input
    assert.ok(html.includes('id="jump-to-page"'), 'Must render jump to page input when safeTotalPages > 7');
    assert.ok(
      html.includes('text-text-primary') || html.includes('dark:text-slate-100'),
      'Jump input must have dark:text-slate-100 or text-text-primary'
    );
  });

  it('PerkCard in list view mode supports light and dark theme classes and coordinate contrast', () => {
    const samplePerk: Perk = {
      name: 'Sprint Burst',
      character: 'Meg Thomas',
      category: 'Survivor',
      description: 'When starting to run, break into a sprint.',
      icon_url: '/icons/sprint-burst.png',
      icon_local_path: '/icons/sprint-burst.png',
      is_owned: true,
    };
    const html = renderToStaticMarkup(
      React.createElement(PerkCard, {
        perk: samplePerk,
        viewMode: 'list',
        coordinate: { page: 1, slot: 1 },
        onSelect: () => {},
      })
    );
    assert.ok(
      html.includes('bg-bg-surface') || html.includes('bg-white dark:bg-slate-900/40'),
      'Must have list container themed backgrounds'
    );
    assert.ok(
      html.includes('text-text-primary') || html.includes('text-slate-900 dark:text-slate-100'),
      'Must have perk title themed text colors'
    );
    assert.ok(
      html.includes('text-accent-amber') || html.includes('text-amber-700 dark:text-amber-400/90'),
      'Coordinate label must have amber contrast'
    );
  });

  it('PerkModal renders with light and dark themes and high-contrast title and alias badge', () => {
    const samplePerk: Perk = {
      name: 'Adrenaline',
      alternate_name: 'Adrenaline Rush',
      character: 'Meg Thomas',
      category: 'Survivor',
      description: 'Instantly heal one health state and sprint when exit gates are powered.',
      icon_url: '/icons/adrenaline.png',
      icon_local_path: '/icons/adrenaline.png',
      is_owned: true,
    };
    const html = renderToStaticMarkup(
      React.createElement(PerkModal, {
        perk: samplePerk,
        onClose: () => {},
      })
    );
    assert.ok(
      html.includes('bg-bg-surface') || html.includes('bg-white dark:bg-[#0c121e]/95'),
      'Modal background must support themed background'
    );
    assert.ok(
      html.includes('text-accent-amber') || html.includes('text-amber-600 dark:text-amber-400'),
      'Title must have themed amber contrast'
    );
    assert.ok(
      html.includes('text-accent-amber') || html.includes('text-amber-700 dark:text-amber-300'),
      'Alias badge must have themed amber contrast'
    );
    assert.ok(
      html.includes('border-border-color') || html.includes('border-slate-200 dark:border-slate-800/80'),
      'Divider must support themed borders'
    );
    assert.ok(
      html.includes('scrollbar-track') || html.includes('scrollbar-track-slate-100 dark:scrollbar-track-slate-900'),
      'Scrollbar track must support light/dark modes'
    );
  });

  it('PerkDescription supports dark text in light mode and silver in dark mode, including child elements', () => {
    const html = renderToStaticMarkup(
      React.createElement(PerkDescription, {
        description: 'Grants a 3% Haste effect.',
      })
    );
    assert.ok(
      html.includes('text-text-secondary') || html.includes('text-slate-700') || html.includes('text-slate-800'),
      'Must have secondary text in light mode'
    );
    assert.ok(
      html.includes('text-text-secondary') || html.includes('dark:text-slate-300'),
      'Must have dark text support'
    );
    assert.ok(
      html.includes('[&amp;_p]:text-text-secondary') ||
      html.includes('[&_p]:text-text-secondary') ||
      html.includes('[&amp;_p]:text-slate-700') ||
      html.includes('[&_p]:text-slate-700'),
      'Must have child paragraph class override'
    );
    assert.ok(
      html.includes('dark:[&amp;_p]:text-slate-300') ||
      html.includes('dark:[&_p]:text-slate-300') ||
      html.includes('[&amp;_p]:text-text-secondary') ||
      html.includes('[&_p]:text-text-secondary'),
      'Must have child paragraph class override for dark mode'
    );
    assert.ok(
      html.includes('[&amp;_strong]:text-accent-amber') ||
      html.includes('[&_strong]:text-accent-amber') ||
      html.includes('[&amp;_strong]:text-amber-700') ||
      html.includes('[&_strong]:text-amber-700'),
      'Must have child strong tag override for highlighted values'
    );
  });
});
