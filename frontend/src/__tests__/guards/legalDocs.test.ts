// frontend/src/__tests__/guards/legalDocs.test.ts
//
// One renderer for the legal documents: the Terms and Rules pages and the preview dialog all render
// <LegalSections>, and none of them reads section text itself, so the page and the dialog cannot
// drift apart.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
/** Source without comment lines, so a comment cannot trip a pattern check. */
const code = (rel: string) => read(rel).split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');

test('legal documents are rendered by LegalSections only', () => {
  assert.ok(read('components/legal/LegalDocPage.tsx').includes('<LegalSections doc={doc} variant="page" />'));
  assert.ok(read('components/legal/LegalDocModal.tsx').includes('<LegalSections doc={shown} variant="modal" />'));
  assert.match(read('app/[locale]/rules/page.tsx'), /<LegalDocPage doc="rules" \/>/);
  assert.match(read('app/[locale]/terms-of-service/page.tsx'), /<LegalDocPage doc="terms" \/>/);
  for (const rel of ['app/[locale]/rules/page.tsx', 'app/[locale]/terms-of-service/page.tsx', 'components/legal/LegalDocPage.tsx', 'components/legal/LegalDocModal.tsx']) {
    assert.ok(!/\.sections\b/.test(code(rel)), `${rel}: section text is only read by LegalSections`);
  }
});
