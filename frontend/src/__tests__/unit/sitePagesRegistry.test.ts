// frontend/src/__tests__/unit/sitePagesRegistry.test.ts
//
// The page registry is generated from the route folders. These tests are the "don't forget" net:
// they fail, with the fix in the message, when the committed registry no longer matches the folders.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_PAGE_IDS, RESERVED_SEGMENTS } from '@/utils/sitePages';
import { PAGE_NAV } from '@/generated/pageNav.generated';

const FRONTEND = path.resolve(__dirname, '../../..');

describe('generated page registry', () => {
  it('matches the route folders (run `npm run generate:pages` if this fails)', () => {
    execFileSync(process.execPath, [path.join(FRONTEND, 'scripts/generate-site-pages.mjs'), '--check'], {
      cwd: FRONTEND,
      stdio: 'pipe',
    });
  });

  it('never lists a reserved route as switchable', () => {
    for (const id of SITE_PAGE_IDS) assert.ok(!(RESERVED_SEGMENTS as readonly string[]).includes(id), id);
    for (const id of ['admin', 'user', 'privacy-policy', 'blocked', 'forbidden']) {
      assert.ok((RESERVED_SEGMENTS as readonly string[]).includes(id), id);
    }
  });

  it('gives every sidebar entry a unique order and a label', () => {
    const orders = Object.values(PAGE_NAV).map((nav) => nav?.order);
    assert.equal(new Set(orders).size, orders.length);
    for (const nav of Object.values(PAGE_NAV)) assert.ok(nav && nav.label(undefined).length > 0);
  });

  it('keeps nav.ts files next to real pages only', () => {
    for (const id of Object.keys(PAGE_NAV)) {
      assert.ok(fs.existsSync(path.join(FRONTEND, 'src/app/[locale]', id, 'nav.ts')), id);
    }
  });
});
