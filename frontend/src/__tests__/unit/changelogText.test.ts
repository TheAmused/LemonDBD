// frontend/src/__tests__/unit/changelogText.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { htmlToPlainText } from '@/components/changelog/changelogText';

test('htmlToPlainText: collapsed-entry preview text', async (t) => {
  await t.test('strips tags and keeps the text', () => {
    assert.strictEqual(htmlToPlainText('<p>Hello <b>world</b></p>'), 'Hello world');
  });

  await t.test('block boundaries and line breaks become spaces', () => {
    assert.strictEqual(htmlToPlainText('<ul><li>one</li><li>two</li></ul><p>a<br>b</p>'), 'one two a b');
  });

  await t.test('decodes the common entities', () => {
    assert.strictEqual(htmlToPlainText('<p>Tom &amp; Jerry &lt;3 &quot;x&quot;&nbsp;y</p>'), 'Tom & Jerry <3 "x" y');
  });

  await t.test('collapses runs of whitespace and trims', () => {
    assert.strictEqual(htmlToPlainText('  <p>a</p>\n\n<p>  b  </p>  '), 'a b');
  });

  await t.test('empty html gives an empty string', () => {
    assert.strictEqual(htmlToPlainText(''), '');
  });
});
