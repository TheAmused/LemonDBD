import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { en, es, pl, de, ja } from '../../locales';

const locales = { en, es, pl, de, ja } as const;
const pageSrc = fs.readFileSync(
  path.resolve(__dirname, '../../app/[locale]/privacy-policy/page.tsx'),
  'utf-8'
);

test('privacy policy: every section key rendered by the page exists, with text, in all locales', () => {
  const order = /PRIVACY_SECTION_ORDER = \[([\s\S]*?)\] as const/.exec(pageSrc)?.[1] ?? '';
  const keys = [...order.matchAll(/'(\w+)'/g)].map((m) => m[1]);
  assert.ok(keys.length >= 10, 'page lists its sections');
  for (const [loc, dict] of Object.entries(locales)) {
    const sections = dict.privacy.sections as Record<string, { heading: string; paragraphs: string[]; items: string[] }>;
    assert.deepEqual(Object.keys(sections).sort(), [...keys].sort(), `${loc}: sections match the page`);
    for (const key of keys) {
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

test('about page links a Privacy Policy pill to the localized /privacy-policy slug', () => {
  const about = fs.readFileSync(path.resolve(__dirname, '../../app/[locale]/about/page.tsx'), 'utf-8');
  assert.ok(about.includes('/privacy-policy`'), 'about links to the privacy-policy slug');
  assert.ok(about.includes('dict.privacy.heading'), 'pill label comes from the dictionary');
});
