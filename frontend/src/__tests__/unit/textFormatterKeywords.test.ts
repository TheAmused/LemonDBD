import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOKEN_REGEX,
  KEYWORD_TOKEN_REGEX,
  VALUE_TOKEN_REGEX,
  DBD_KEYWORDS,
} from '@/utils/textFormatter';

/** The single token the tokenizer pulls out of `text`, or null. */
function tokenOf(text: string): string | null {
  const parts = `${text}`.split(TOKEN_REGEX);
  return parts.length > 1 ? parts[1] : null;
}

test('textFormatter: keywords match their inflected forms, not just the lemma', () => {
  // German nouns inflect; the list only ever held the lemma.
  assert.equal(tokenOf('Generatoren'), 'Generatoren');
  assert.equal(tokenOf('Paletten'), 'Paletten');
  // Polish declension and participles.
  assert.equal(tokenOf('generatorów'), 'generatorów');
  assert.equal(tokenOf('zwiększający'), 'zwiększający');
  // Spanish verb forms.
  assert.equal(tokenOf('revelarán'), 'revelarán');
  // English.
  assert.equal(tokenOf('Hooked'), 'Hooked');
});

test('textFormatter: a keyword never highlights only part of a word', () => {
  for (const w of ['generatorów', 'Generatoren', 'Paletten', 'revelarán']) {
    assert.equal(tokenOf(w), w, `${w} was highlighted only in part`);
  }
});

test('textFormatter: inflection stays inside its own language', () => {
  // "tormenta" is Spanish for a storm - it must not read as the Torment effect,
  // which is why endings are applied per language rather than globally.
  assert.equal(tokenOf('tormenta'), null);
  // "Flucht" is German for escape, not the Hex keyword "Fluch".
  assert.equal(tokenOf('Flucht'), null);
});

test('textFormatter: Japanese terms match without Latin word boundaries', () => {
  // CJK has no spaces, so letter-boundary guards would never be satisfied.
  assert.equal(tokenOf('オーラ'), 'オーラ');
  assert.equal(tokenOf('スキルチェック'), 'スキルチェック');
});

test('textFormatter: tokenizer and validator agree on every keyword', () => {
  // Drift between the two is what previously left inflected tokens unstyled.
  for (const k of DBD_KEYWORDS) {
    assert.ok(KEYWORD_TOKEN_REGEX.test(k), `validator rejects listed keyword: ${k}`);
  }
});

test('textFormatter: dash ranges are values (Bardic Inspiration d20 bands)', () => {
  assert.ok(VALUE_TOKEN_REGEX.test('2-10'));
  assert.ok(VALUE_TOKEN_REGEX.test('11-19'));
  assert.equal(tokenOf('2-10'), '2-10');
  // A digit is required on both sides, so hyphenated names are left alone.
  assert.equal(tokenOf('4-Coil'), null);
});

test('textFormatter: keyword list is still exported flat for consumers', () => {
  assert.ok(DBD_KEYWORDS.length > 50);
  assert.ok(DBD_KEYWORDS.includes('Exhausted'));
  assert.ok(DBD_KEYWORDS.includes('Hex:'));
});
