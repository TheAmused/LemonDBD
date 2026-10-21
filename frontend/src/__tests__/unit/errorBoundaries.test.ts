// frontend/src/__tests__/unit/errorBoundaries.test.ts
//
// A render error must land on an error page, never Next's bare default screen: every page under
// /[locale] has app/[locale]/error.tsx, and a crash in the locale layout itself has
// app/global-error.tsx (which has to work without any provider).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalErrorDocument } from '@/components/layout/GlobalErrorDocument';
import { DEFAULT_ERROR_PAGE_COPY, loadErrorPageCopy, localeOfPath } from '@/i18n/errorPageCopy';
import { i18n } from '@/i18n/config';
import { buttonClassName } from '@/components/common/Button';
import { GLOBAL_ERROR_HOME_BUTTON, GLOBAL_ERROR_RETRY_BUTTON } from '@/components/layout/errorPageClasses';

const APP = path.resolve(__dirname, '../../app');

describe('error boundaries', () => {
  it('both boundaries exist and are client components', () => {
    for (const file of ['[locale]/error.tsx', 'global-error.tsx']) {
      const text = fs.readFileSync(path.join(APP, file), 'utf8');
      assert.match(text, /^\s*['"]use client['"]/, `${file} must start with 'use client'`);
    }
  });

  it('the global-error document renders a whole document with the copy and the error reference', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' });
    const html = renderToStaticMarkup(React.createElement(GlobalErrorDocument, { error, reset: () => {} }));
    const copy = DEFAULT_ERROR_PAGE_COPY;
    assert.match(html, /^<html lang="en">/);
    assert.ok(html.includes(copy.error.title));
    assert.ok(html.includes(copy.error.retry));
    assert.ok(html.includes('abc123'));
    assert.ok(!html.includes('boom'), 'the error message itself is never shown to visitors');
  });

  it('every locale has the error-page copy', async () => {
    for (const locale of i18n.locales) {
      const { error } = await loadErrorPageCopy(locale);
      for (const key of ['code', 'title', 'text', 'retry', 'reference'] as const) {
        assert.ok(error[key].trim(), `${locale}: errorPages.error.${key} is empty`);
      }
    }
  });

  it('stay light: every page ships them, so nothing heavy is imported eagerly', () => {
    const boundary = fs.readFileSync(path.join(APP, '[locale]/error.tsx'), 'utf8');
    assert.match(boundary, /dynamic\(\(\) => import\('@\/components\/layout\/ErrorPage'\)/, 'ErrorPage is loaded on demand');
    assert.doesNotMatch(boundary, /^import .*ErrorPage/m);
    const doc = fs.readFileSync(path.resolve(APP, '../components/layout/GlobalErrorDocument.tsx'), 'utf8');
    assert.doesNotMatch(doc, /components\/common\/Button|utils\/cn/, 'no tailwind-merge in the global error document');
    const copy = fs.readFileSync(path.resolve(APP, '../i18n/errorPageCopy.ts'), 'utf8');
    assert.doesNotMatch(copy, /^import (?!type)\w+ from '\.\.\/locales\/(es|pl|de|ja)\//m, 'only English is bundled; the rest load on demand');
  });

  it('the global-error button classes match buttonClassName', () => {
    assert.equal(GLOBAL_ERROR_RETRY_BUTTON, buttonClassName('secondary', 'lg'));
    assert.equal(GLOBAL_ERROR_HOME_BUTTON, buttonClassName('primary', 'lg'));
  });

  it('picks the locale from the path prefix', () => {
    assert.equal(localeOfPath('/pl/perks'), 'pl');
    assert.equal(localeOfPath('/ja'), 'ja');
    assert.equal(localeOfPath('/xx/perks'), i18n.defaultLocale);
    assert.equal(localeOfPath('/'), i18n.defaultLocale);
  });
});
