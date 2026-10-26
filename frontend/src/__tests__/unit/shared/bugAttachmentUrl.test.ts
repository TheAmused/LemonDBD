// frontend/src/__tests__/unit/shared/bugAttachmentUrl.test.ts
// Bug-report screenshots load only when the server stored them, always through the private
// attachment route; typed-in URLs are never fetched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bugAttachmentUrl } from '@/utils/api';

test('stored uploads resolve to the attachment route, whichever path shape the report holds', () => {
  // The base differs between the browser ('') and the server render, so only the path is pinned.
  const route = /\/api\/v1\/bug-reports\/attachments\/bug_0123456789ab\.webp$/;
  assert.match(bugAttachmentUrl('/api/v1/bug-reports/attachments/bug_0123456789ab.webp') ?? '', route);
  assert.match(bugAttachmentUrl('/static/uploads/bug_reports/bug_0123456789ab.webp') ?? '', route);
  assert.match(bugAttachmentUrl('/static/uploads/bug_reports/bug_0123456789ab.png') ?? '', /\/api\/v1\/bug-reports\/attachments\/bug_0123456789ab\.png$/);
});

test('remote URLs, other paths and traversal are refused', () => {
  for (const value of [
    'https://evil.example/p.gif',
    '/static/avatars/x.webp',
    '/static/uploads/bug_reports/../x.png',
    '/api/v1/bug-reports/attachments/../../admin.webp',
    '',
    null,
  ]) {
    assert.equal(bugAttachmentUrl(value), undefined, String(value));
  }
});
