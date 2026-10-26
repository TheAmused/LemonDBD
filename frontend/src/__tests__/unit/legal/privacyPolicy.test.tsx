// frontend/src/__tests__/unit/legal/privacyPolicy.test.tsx
import { render, screen, withNextApp } from '../../helpers/dom';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { en, es, pl, de, ja } from '@/locales';
import { PRIVACY_SECTION_ORDER } from '@/components/legal/PrivacyPolicyClient';
import { AboutClient } from '@/components/about/AboutClient';

const locales = { en, es, pl, de, ja } as const;

test('privacy policy: every section the page renders exists, with text, in all locales', () => {
  assert.ok(PRIVACY_SECTION_ORDER.length >= 10, 'page lists its sections');
  for (const [loc, dict] of Object.entries(locales)) {
    const sections = dict.privacy.sections as Record<string, { heading: string; paragraphs: string[]; items: string[] }>;
    assert.deepEqual(Object.keys(sections).sort(), [...PRIVACY_SECTION_ORDER].sort(), `${loc}: sections match the page`);
    for (const key of PRIVACY_SECTION_ORDER) {
      assert.ok(sections[key].heading.length > 0, `${loc}.${key}.heading`);
      assert.ok(Array.isArray(sections[key].items), `${loc}.${key}.items is an array`);
      assert.ok(sections[key].paragraphs.length > 0, `${loc}.${key}.paragraphs`);
    }
  }
});

test('privacy policy: locales share the same list sizes as English', () => {
  for (const [loc, dict] of Object.entries(locales)) {
    assert.equal(dict.privacy.summary.length, en.privacy.summary.length, `${loc}.summary`);
    for (const key of Object.keys(en.privacy.sections) as (keyof typeof en.privacy.sections)[]) {
      const a = en.privacy.sections[key];
      const b = dict.privacy.sections[key];
      assert.equal(b.items.length, a.items.length, `${loc}.${key}.items`);
      assert.equal(b.paragraphs.length, a.paragraphs.length, `${loc}.${key}.paragraphs`);
    }
  }
});

test('the about page links to the privacy policy in the current language', () => {
  render(<AboutClient />, { wrapper: withNextApp({ pathname: '/pl/about', dict: pl as never, locale: 'pl' }).wrapper });
  const link = screen.getByRole('link', { name: new RegExp(pl.privacy.heading) });
  assert.equal(link.getAttribute('href'), '/pl/privacy-policy');
});
