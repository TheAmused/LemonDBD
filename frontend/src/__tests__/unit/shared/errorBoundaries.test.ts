// frontend/src/__tests__/unit/shared/errorBoundaries.test.ts
//
// A render error must land on an error page, never Next's bare default screen: every page under
// /[locale] has app/[locale]/error.tsx, and a crash in the locale layout itself has
// app/global-error.tsx (which has to work without any provider).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalErrorDocument } from '@/components/layout/GlobalErrorDocument';
import { DEFAULT_ERROR_PAGE_COPY, loadErrorPageCopy, localeOfPath } from '@/i18n/errorPageCopy';
import { i18n } from '@/i18n/config';
import { buttonClassName } from '@/components/common/Button';
import { GLOBAL_ERROR_HOME_BUTTON, GLOBAL_ERROR_RETRY_BUTTON } from '@/components/layout/errorPageClasses';

describe('error boundaries', () => {
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
