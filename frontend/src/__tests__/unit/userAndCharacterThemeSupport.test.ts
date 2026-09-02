import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UserProfileForm } from '@/components/user/UserProfileForm';
import { UserMetricsGrid } from '@/components/user/UserMetricsGrid';
import { UserBugReportsList } from '@/components/user/UserBugReportsList';
import { KillerDetailView } from '@/components/character-detail/KillerDetailView';
import { SurvivorDetailView } from '@/components/character-detail/SurvivorDetailView';

describe('User Profile Theme Support', () => {
  it('UserProfileForm container supports light theme card and text', () => {
    const html = renderToStaticMarkup(
      React.createElement(UserProfileForm, {
        initialEmail: 'test@example.com',
        onRefreshUser: async () => {},
      })
    );
    assert.ok(html.includes('border-slate-200'), 'Card must have border-slate-200');
    assert.ok(html.includes('dark:border-slate-800'), 'Card must have dark:border-slate-800');
    assert.ok(html.includes('text-slate-900'), 'Title must have text-slate-900');
    assert.ok(html.includes('dark:text-slate-100'), 'Title must have dark:text-slate-100');
    assert.ok(html.includes('text-slate-600'), 'Labels must have text-slate-600');
    assert.ok(html.includes('dark:text-slate-400'), 'Labels must have dark:text-slate-400');
    assert.ok(html.includes('bg-slate-50'), 'Inputs must have bg-slate-50');
    assert.ok(html.includes('dark:bg-slate-950/80'), 'Inputs must have dark:bg-slate-950/80');
  });

  it('UserMetricsGrid cards use light-compatible border and background', () => {
    const html = renderToStaticMarkup(
      React.createElement(UserMetricsGrid, {
        ownership: {
          survivors: { owned: 10, total: 54, percentage: 18 },
          killers: { owned: 5, total: 44, percentage: 11 },
          perks: { unlocked: 30, total: 321, percentage: 9 },
        },
      })
    );
    assert.ok(html.includes('border-slate-200'), 'Metrics cards must have border-slate-200');
    assert.ok(html.includes('dark:border-slate-800'), 'Metrics cards must have dark:border-slate-800');
    assert.ok(html.includes('bg-white'), 'Metrics cards must have bg-white');
    assert.ok(html.includes('dark:bg-slate-900/60'), 'Metrics cards must have dark:bg-slate-900/60');
    assert.ok(html.includes('bg-slate-200'), 'Progress track must have bg-slate-200');
    assert.ok(html.includes('dark:bg-slate-800'), 'Progress track must have dark:bg-slate-800');
  });

  it('UserBugReportsList renders empty state and reports with light/dark theme classes', () => {
    // Empty state
    const emptyHtml = renderToStaticMarkup(
      React.createElement(UserBugReportsList, {
        reports: [],
        loading: false,
        onOpenReportModal: () => {},
      })
    );
    assert.ok(emptyHtml.includes('border-slate-200'), 'Empty state card must have border-slate-200');
    assert.ok(emptyHtml.includes('dark:border-slate-800'), 'Empty state card must have dark:border-slate-800');
    assert.ok(emptyHtml.includes('bg-white'), 'Empty state card must have bg-white');

    // With reports
    const reportHtml = renderToStaticMarkup(
      React.createElement(UserBugReportsList, {
        reports: [
          {
            id: 42,
            title: 'Perk typo in description',
            message: 'Incorrect calculation on Sprint Burst tier 3.',
            category: 'Perk Bug',
            images: [],
            status: 'pending',
            created_at: '2026-02-15T12:00:00Z',
          },
        ],
        loading: false,
        onOpenReportModal: () => {},
      })
    );
    assert.ok(reportHtml.includes('border-slate-200'), 'Report card must have border-slate-200');
    assert.ok(reportHtml.includes('dark:border-slate-800'), 'Report card must have dark:border-slate-800');
    assert.ok(reportHtml.includes('bg-white'), 'Report card must have bg-white');
    assert.ok(reportHtml.includes('text-slate-600'), 'Message must have text-slate-600');
    assert.ok(reportHtml.includes('dark:text-slate-300'), 'Message must have dark:text-slate-300');
    assert.ok(reportHtml.includes('bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'), 'Category badge must support light/dark');
  });

  it('UserBugReportsList status badges provide WCAG AA contrast in light and dark mode', () => {
    for (const status of ['pending', 'in_progress', 'resolved', 'rejected'] as const) {
      const html = renderToStaticMarkup(
        React.createElement(UserBugReportsList, {
          reports: [
            {
              id: 1,
              title: `Report ${status}`,
              message: 'Testing status contrast',
              category: 'UI',
              images: [],
              status,
              created_at: '2026-02-15T12:00:00Z',
            },
          ],
          loading: false,
          onOpenReportModal: () => {},
        })
      );
      if (status === 'pending') {
        assert.ok(html.includes('text-rose-600 dark:text-rose-400'), 'Pending badge must have contrast text');
      } else if (status === 'in_progress') {
        assert.ok(html.includes('text-amber-600 dark:text-amber-400'), 'In progress badge must have contrast text');
      } else if (status === 'resolved') {
        assert.ok(html.includes('text-emerald-600 dark:text-emerald-400'), 'Resolved badge must have contrast text');
      } else if (status === 'rejected') {
        assert.ok(html.includes('text-slate-600 dark:text-slate-400'), 'Closed badge must have contrast text');
      }
    }
  });

  it('KillerDetailView and SurvivorDetailView support light and dark theme hero title and real name', () => {
    const killerHtml = renderToStaticMarkup(
      React.createElement(KillerDetailView, {
        currentLocale: 'en',
        detailData: {
          character: {
            id: 1,
            name: 'The Trapper',
            real_name: 'Evan MacMillan',
            category: 'Killer',
          },
          perks: [],
          addons: [],
        },
      })
    );
    assert.ok(killerHtml.includes('text-slate-900 dark:text-slate-100 font-mono'), 'Killer title must have theme classes');
    assert.ok(killerHtml.includes('text-slate-700 dark:text-slate-200'), 'Killer real name must have theme classes');

    const survivorHtml = renderToStaticMarkup(
      React.createElement(SurvivorDetailView, {
        currentLocale: 'en',
        detailData: {
          character: {
            id: 2,
            name: 'Dwight Fairfield',
            real_name: 'Dwight Fairfield Sr.',
            category: 'Survivor',
          },
          perks: [],
          addons: [],
        },
      })
    );
    assert.ok(survivorHtml.includes('text-slate-900 dark:text-slate-100 font-mono'), 'Survivor title must have theme classes');
    assert.ok(survivorHtml.includes('text-slate-700 dark:text-slate-200'), 'Survivor real name must have theme classes');
  });

  it('CharactersHub ownership button and save bar contain light and dark theme classes', () => {
    const hubPath = path.resolve(__dirname, '../../components/CharactersHub.tsx');
    const source = fs.readFileSync(hubPath, 'utf-8');
    assert.ok(source.includes('border-slate-200'), 'CharactersHub must contain border-slate-200');
    assert.ok(source.includes('dark:border-slate-800'), 'CharactersHub must contain dark:border-slate-800');
    assert.ok(source.includes('bg-white'), 'CharactersHub must contain bg-white');
    assert.ok(source.includes('dark:bg-slate-900'), 'CharactersHub must contain dark:bg-slate-900');
  });

  it('user/page.tsx unauthenticated prompt and avatar reset button support light and dark theme classes', () => {
    const userPagePath = path.resolve(__dirname, '../../app/[locale]/user/page.tsx');
    const source = fs.readFileSync(userPagePath, 'utf-8');
    assert.ok(
      source.includes('border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 text-slate-900 dark:text-slate-100'),
      'Unauthenticated card must support light and dark theme'
    );
    assert.ok(
      source.includes('bg-rose-50 dark:bg-rose-950/40') &&
      source.includes('text-rose-600 dark:text-rose-400') &&
      source.includes('hover:bg-rose-100 dark:hover:bg-rose-900/60'),
      'Avatar reset button must support light and dark theme contrast'
    );
  });
});
