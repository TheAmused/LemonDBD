// frontend/src/__tests__/unit/backgroundEffects.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  backgroundEffectForSegments,
  DEFAULT_BACKGROUND_EFFECT,
  ROUTE_BACKGROUND_EFFECTS,
} from '@/components/layout/backgroundEffects';

const APP_DIR = path.resolve(__dirname, '../../app/[locale]');

/** Static route segments of every page.tsx under app/[locale] (dynamic folders dropped). */
function pageRoutes(dir: string, segments: string[] = []): string[][] {
  const routes: string[][] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const dynamic = entry.name.startsWith('[');
      routes.push(...pageRoutes(path.join(dir, entry.name), dynamic ? segments : [...segments, entry.name]));
    } else if (entry.name === 'page.tsx') {
      routes.push(segments);
    }
  }
  return routes;
}

describe('backgroundEffectForSegments', () => {
  it('the default is campfire and every route uses it today', () => {
    assert.equal(DEFAULT_BACKGROUND_EFFECT, 'campfire');
    for (const p of [[], ['perks'], ['minigames', 'play'], ['tier-lists', 'custom', 'x'], ['admin'], ['nope']]) {
      assert.equal(backgroundEffectForSegments(p), 'campfire');
    }
  });

  it('every page in app/[locale] has its own explicit entry in the route table', () => {
    const listed = new Set(ROUTE_BACKGROUND_EFFECTS.map((r) => r.prefix.join('/')));
    for (const route of pageRoutes(APP_DIR)) {
      if (route[0] === '...rest') continue;
      assert.ok(listed.has(route.join('/')), `/${route.join('/')} has no ROUTE_BACKGROUND_EFFECTS entry`);
    }
  });

  it('the longest matching prefix wins', () => {
    assert.equal(backgroundEffectForSegments(['streaks', 'killer', 'page-streak', 'x']), 'campfire');
  });
});
