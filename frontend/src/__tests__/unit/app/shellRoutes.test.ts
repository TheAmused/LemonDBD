// frontend/src/__tests__/unit/app/shellRoutes.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_SHELL_OUTER_CLASSNAME,
  ERROR_SHELL,
  ROUTE_SHELLS,
  SHELL_PADDING_CLASSES,
  matchShell,
  segmentsAfterLocale,
  shellClasses,
  shellForPathname,
  type ShellSpec,
} from '@/components/layout/shellRoutes';

const APP_DIR = path.resolve(__dirname, '../../../app/[locale]');

/** Route segments of every page.tsx under app/[locale]; a dynamic folder ([slug]) becomes the placeholder "x". */
function pageRoutes(dir: string, segments: string[] = []): string[][] {
  const routes: string[][] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const next = entry.name.startsWith('[') ? 'x' : entry.name;
      routes.push(...pageRoutes(path.join(dir, entry.name), [...segments, next]));
    } else if (entry.name === 'page.tsx') {
      routes.push(segments);
    }
  }
  return routes;
}

const spec = (segments: string[]): ShellSpec => {
  const { shell } = matchShell(segments);
  assert.ok(shell, `/${segments.join('/')} should have a shell`);
  return shell;
};

describe('matchShell', () => {
  it('every page in app/[locale] has an entry in ROUTE_SHELLS (new pages must choose a shell)', () => {
    for (const route of pageRoutes(APP_DIR)) {
      if (route[0] === 'x' && route.length === 1) continue; // the [...rest] 404 catch-all renders notFound()
      assert.ok(matchShell(route).listed, `/${route.join('/')} has no ROUTE_SHELLS entry`);
    }
  });

  it('every route in ROUTE_SHELLS leads to a page that exists (no stale lines)', () => {
    const pages = pageRoutes(APP_DIR).map((r) => r.join('/'));
    for (const { prefix } of ROUTE_SHELLS) {
      const path = prefix.join('/');
      assert.ok(pages.some((p) => p === path || p.startsWith(`${path}/`)), `/${path} is listed but no page lives at or beneath it`);
    }
  });

  it('the home entry matches only the home page', () => {
    assert.deepEqual(spec([]), ROUTE_SHELLS.find((r) => r.prefix.length === 0)!.shell);
    assert.equal(matchShell(['nope']).listed, false);
  });

  it('the longest matching prefix wins, and a dynamic page inherits its parent', () => {
    assert.equal(spec(['characters', 'dwight_fairfield']), spec(['characters']));
    assert.equal(spec(['smash-or-pass', 'create']).padding, 'tight');
    assert.equal(spec(['smash-or-pass']).padding, undefined);
    assert.equal(spec(['streaks', 'killer', 'page-streak', 'x']), spec(['streaks']));
  });

  it('the tier-list hub is exact: it is comfortable, while every page beneath it is a tight workspace', () => {
    assert.equal(spec(['tier-lists']).padding, undefined);
    for (const route of [['tier-lists', 'survivors'], ['tier-lists', 'new'], ['tier-lists', 'custom', 'abc']]) {
      assert.equal(spec(route).padding, 'tight', `/${route.join('/')}`);
    }
  });

  it('pages that own the whole screen have no shell', () => {
    assert.equal(matchShell(['welcome']).shell, false);
    assert.equal(matchShell(['reset-password']).shell, false);
  });

  it('an unlisted path (the 404 page) gets the centred error shell', () => {
    const match = matchShell(['definitely', 'not', 'a', 'page']);
    assert.equal(match.listed, false);
    assert.equal(match.shell, ERROR_SHELL);
    assert.equal(spec(['blocked']), ERROR_SHELL);
    assert.equal(spec(['forbidden']), ERROR_SHELL);
  });

  it('perks keeps its fixed-viewport outer wrapper and streaks keeps its fog-free one', () => {
    assert.ok(spec(['perks']).outerClassName?.includes('h-dvh'));
    assert.ok(!spec(['streaks']).outerClassName?.includes('dbd-fog-overlay'));
  });
});

describe('segmentsAfterLocale / shellForPathname', () => {
  it('drops a leading locale and nothing else', () => {
    assert.deepEqual(segmentsAfterLocale('/en/tier-lists/x'), ['tier-lists', 'x']);
    assert.deepEqual(segmentsAfterLocale('/pl'), []);
    assert.deepEqual(segmentsAfterLocale('/'), []);
    assert.deepEqual(segmentsAfterLocale('/perks'), ['perks']);
  });

  it('resolves a full pathname', () => {
    assert.equal(shellForPathname('/de/maps').shell, spec(['maps']));
    assert.equal(shellForPathname('/ja/welcome').shell, false);
  });
});

describe('shellClasses', () => {
  it('defaults to the comfortable scale and the shared outer wrapper', () => {
    const c = shellClasses({});
    assert.equal(c.outer, DEFAULT_SHELL_OUTER_CLASSNAME);
    assert.ok(c.main.includes(SHELL_PADDING_CLASSES.comfortable));
    assert.ok(c.main.includes('lemon-shell-main'));
    assert.ok(!c.main.includes('lemon-shell-main--flush'));
  });

  it('flush has no padding classes and its own margin variant', () => {
    assert.equal(SHELL_PADDING_CLASSES.flush, '');
    assert.ok(shellClasses({ padding: 'flush' }).main.includes('lemon-shell-main--flush'));
  });

  it('customPadding replaces the named scale; mainClassName and mainId pass through', () => {
    const c = shellClasses({ padding: 'tight', customPadding: 'p-9', mainClassName: 'extra', mainId: 'main-x' });
    assert.ok(c.main.includes('p-9') && !c.main.includes(SHELL_PADDING_CLASSES.tight) && c.main.endsWith('extra'));
    assert.equal(c.mainId, 'main-x');
  });

  it('an outerClassName override replaces the default outer wrapper', () => {
    assert.equal(shellClasses({ outerClassName: 'custom-outer' }).outer, 'custom-outer');
  });
});
