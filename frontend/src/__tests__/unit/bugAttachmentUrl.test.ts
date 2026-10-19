// frontend/src/__tests__/unit/bugAttachmentUrl.test.ts
// Bug-report screenshots load only when the server stored them; typed-in URLs are never fetched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bugAttachmentUrl } from '@/utils/api';

test('stored uploads resolve to a static URL', () => {
  // The base differs between the browser ('') and the server render, so only the path is pinned.
  assert.match(bugAttachmentUrl('/static/uploads/bug_reports/bug_0123456789ab.webp') ?? '', /\/static\/uploads\/bug_reports\/bug_0123456789ab\.webp$/);
  assert.match(bugAttachmentUrl('/static/uploads/bug_reports/bug_0123456789ab.png') ?? '', /\/static\/uploads\/bug_reports\/bug_0123456789ab\.png$/);
});

test('remote URLs, other paths and traversal are refused', () => {
  for (const value of ['https://evil.example/p.gif', '/static/avatars/x.webp', '/static/uploads/bug_reports/../x.png', '', null]) {
    assert.equal(bugAttachmentUrl(value), undefined, String(value));
  }
});
