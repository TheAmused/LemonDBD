// frontend/src/__tests__/guards/errorBoundaries.test.ts
//
// Every page ships the error boundaries, so they must exist as client components and stay light.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const APP = path.resolve(__dirname, '../../app');

describe('error boundaries', () => {
  it('both boundaries exist and are client components', () => {
    for (const file of ['[locale]/error.tsx', 'global-error.tsx']) {
      const text = fs.readFileSync(path.join(APP, file), 'utf8');
      assert.match(text, /^\s*['"]use client['"]/, `${file} must start with 'use client'`);
    }
  });

  it('nothing heavy is imported eagerly', () => {
    const boundary = fs.readFileSync(path.join(APP, '[locale]/error.tsx'), 'utf8');
    assert.match(boundary, /dynamic\(\(\) => import\('@\/components\/layout\/ErrorPage'\)/, 'ErrorPage is loaded on demand');
    assert.doesNotMatch(boundary, /^import .*ErrorPage/m);
    const doc = fs.readFileSync(path.resolve(APP, '../components/layout/GlobalErrorDocument.tsx'), 'utf8');
    assert.doesNotMatch(doc, /components\/common\/Button|utils\/cn/, 'no tailwind-merge in the global error document');
    const copy = fs.readFileSync(path.resolve(APP, '../i18n/errorPageCopy.ts'), 'utf8');
    assert.doesNotMatch(copy, /^import (?!type)\w+ from '\.\.\/locales\/(es|pl|de|ja)\//m, 'only English is bundled; the rest load on demand');
  });
});
