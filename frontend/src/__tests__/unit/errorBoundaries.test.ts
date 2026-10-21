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
import { errorPageCopy, localeOfPath } from '@/i18n/errorPageCopy';
import { i18n } from '@/i18n/config';

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
    const copy = errorPageCopy('en');
    assert.match(html, /^<html lang="en">/);
    assert.ok(html.includes(copy.error.title));
    assert.ok(html.includes(copy.error.retry));
    assert.ok(html.includes('abc123'));
    assert.ok(!html.includes('boom'), 'the error message itself is never shown to visitors');
  });

  it('every locale has the error-page copy', () => {
    for (const locale of i18n.locales) {
      const { error } = errorPageCopy(locale);
      for (const key of ['code', 'title', 'text', 'retry', 'reference'] as const) {
        assert.ok(error[key].trim(), `${locale}: errorPages.error.${key} is empty`);
      }
    }
  });

  it('picks the locale from the path prefix', () => {
    assert.equal(localeOfPath('/pl/perks'), 'pl');
    assert.equal(localeOfPath('/ja'), 'ja');
    assert.equal(localeOfPath('/xx/perks'), i18n.defaultLocale);
    assert.equal(localeOfPath('/'), i18n.defaultLocale);
  });
});
