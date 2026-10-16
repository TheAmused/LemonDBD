// frontend/src/__tests__/unit/changelogReadState.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  firstVisitBaseline,
  isUnreadPost,
  parseReadState,
  type ChangelogReadState,
} from '@/components/changelog/changelogReadState';
import type { ChangelogPost } from '@/types/changelog';

const post = (id: number, date: string, overrides: Partial<ChangelogPost> = {}): ChangelogPost => ({
  id,
  title: `Post ${id}`,
  content_html: '<p>x</p>',
  is_published: true,
  position: 0,
  created_at: date,
  updated_at: date,
  published_at: date,
  discord_announced_at: null,
  ...overrides,
});

test('changelog read state', async (t) => {
  await t.test('a first-time reader only sees the newest published entry as new', () => {
    const posts = [post(1, '2026-01-01T00:00:00Z'), post(2, '2026-02-01T00:00:00Z'), post(3, '2026-03-01T00:00:00Z')];
    const state: ChangelogReadState = { baseline: firstVisitBaseline(posts), read: [] };
    assert.deepStrictEqual(posts.filter((p) => isUnreadPost(p, state)).map((p) => p.id), [3]);
  });

  await t.test('with a single published entry that entry is new', () => {
    const posts = [post(1, '2026-01-01T00:00:00Z')];
    assert.ok(isUnreadPost(posts[0], { baseline: firstVisitBaseline(posts), read: [] }));
  });

  await t.test('drafts are never new and do not move the baseline', () => {
    const draft = post(9, '2026-09-01T00:00:00Z', { is_published: false, published_at: null });
    const posts = [post(1, '2026-01-01T00:00:00Z'), post(2, '2026-02-01T00:00:00Z'), draft];
    const state: ChangelogReadState = { baseline: firstVisitBaseline(posts), read: [] };
    assert.ok(!isUnreadPost(draft, state));
    assert.deepStrictEqual(posts.filter((p) => isUnreadPost(p, state)).map((p) => p.id), [2]);
  });

  await t.test('an opened entry stops being new, a later one is new again', () => {
    const state: ChangelogReadState = { baseline: '2026-01-01T00:00:00Z', read: [2] };
    assert.ok(!isUnreadPost(post(2, '2026-02-01T00:00:00Z'), state));
    assert.ok(isUnreadPost(post(3, '2026-03-01T00:00:00Z'), state));
  });

  await t.test('no state means no tracking', () => {
    assert.ok(!isUnreadPost(post(1, '2026-01-01T00:00:00Z'), undefined));
    assert.ok(!isUnreadPost(post(1, '2026-01-01T00:00:00Z'), null));
  });

  await t.test('parseReadState tolerates missing and broken storage', () => {
    assert.strictEqual(parseReadState(null), null);
    assert.strictEqual(parseReadState('not json'), null);
    assert.strictEqual(parseReadState('{"baseline":1}'), null);
    assert.deepStrictEqual(parseReadState('{"baseline":"2026-01-01","read":[1,"x",2]}'), {
      baseline: '2026-01-01',
      read: [1, 2],
    });
  });
});
