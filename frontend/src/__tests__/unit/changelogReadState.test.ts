// frontend/src/__tests__/unit/changelogReadState.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { isUnreadPost, parseReadIds, type ChangelogReadState } from '@/components/changelog/changelogReadState';
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

const unreadIds = (posts: ChangelogPost[], state: ChangelogReadState) =>
  posts.filter((p) => isUnreadPost(p, state)).map((p) => p.id);

test('changelog read state', async (t) => {
  await t.test('every unread entry from after sign-up is new, older ones are history', () => {
    const posts = [post(1, '2026-01-01T00:00:00Z'), post(2, '2026-02-01T00:00:00Z'), post(3, '2026-03-01T00:00:00Z')];
    const state: ChangelogReadState = { baseline: '2026-01-15T00:00:00Z', read: [] };
    assert.deepStrictEqual(unreadIds(posts, state), [2, 3]);
  });

  await t.test('a brand new account sees nothing from before it existed', () => {
    const posts = [post(1, '2026-01-01T00:00:00Z'), post(2, '2026-02-01T00:00:00Z')];
    assert.deepStrictEqual(unreadIds(posts, { baseline: '2026-06-01T00:00:00Z', read: [] }), []);
  });

  await t.test('drafts are never new', () => {
    const draft = post(9, '2026-09-01T00:00:00Z', { is_published: false, published_at: null });
    assert.ok(!isUnreadPost(draft, { baseline: '2026-01-01T00:00:00Z', read: [] }));
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

  await t.test('parseReadIds tolerates missing and broken storage', () => {
    assert.deepStrictEqual(parseReadIds(null), []);
    assert.deepStrictEqual(parseReadIds('not json'), []);
    assert.deepStrictEqual(parseReadIds('{"baseline":1}'), []);
    assert.deepStrictEqual(parseReadIds('{"baseline":"2026-01-01","read":[1,"x",2]}'), [1, 2]);
  });
});
