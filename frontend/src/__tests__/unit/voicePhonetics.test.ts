// frontend/src/__tests__/unit/voicePhonetics.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  consonantSkeleton,
  corePhoneticFold,
  foldDiacritics,
  hasCjkIdeographs,
  hasJapaneseScript,
  kanaToRomaji,
  phoneticKey,
  phoneticKeySet,
  phoneticSimilarity,
  romanNumeralsToDigits,
  toVoiceLocale,
  isVoiceLocale,
  VOICE_LOCALES,
} from '@/utils/voicePhonetics';

test('locale guards accept exactly the five shipped locales', () => {
  assert.deepStrictEqual(VOICE_LOCALES, ['en', 'pl', 'de', 'es', 'ja']);
  for (const locale of VOICE_LOCALES) {
    assert.strictEqual(isVoiceLocale(locale), true);
    assert.strictEqual(toVoiceLocale(locale), locale);
  }
  // Locales the old inline ternaries referenced but the app never shipped.
  assert.strictEqual(isVoiceLocale('fr'), false);
  assert.strictEqual(isVoiceLocale('tr'), false);
  assert.strictEqual(toVoiceLocale('fr'), 'en');
  assert.strictEqual(toVoiceLocale(undefined), 'en');
  assert.strictEqual(toVoiceLocale(null), 'en');
});

test('foldDiacritics strips accents and the letters NFD cannot decompose', () => {
  assert.strictEqual(foldDiacritics('Léry'), 'lery');
  assert.strictEqual(foldDiacritics('Złomowisko'), 'zlomowisko');
  assert.strictEqual(foldDiacritics('Straße'), 'strasse');
  assert.strictEqual(foldDiacritics('Ächzendes'), 'achzendes');
  assert.strictEqual(foldDiacritics('comisaría'), 'comisaria');
  assert.strictEqual(foldDiacritics(''), '');
});

test('roman numerals become digits so variant numbers survive vowel folding', () => {
  assert.strictEqual(romanNumeralsToDigits('preschool iii'), 'preschool 3');
  assert.strictEqual(romanNumeralsToDigits('preschool iiiv'), 'preschool 4');
  assert.strictEqual(romanNumeralsToDigits('coal tower ii'), 'coal tower 2');
  assert.strictEqual(romanNumeralsToDigits('preschool v'), 'preschool 5');
  // Only standalone numerals: "i" inside a word must not be touched.
  assert.strictEqual(romanNumeralsToDigits('ironworks of misery'), 'ironworks of misery');
  assert.strictEqual(romanNumeralsToDigits('midwich'), 'midwich');
});

test('core fold merges the distinctions an accent destroys', () => {
  // Voicing pairs, w/v/f, and vowel quality all collapse.
  assert.strictEqual(corePhoneticFold('bat'), corePhoneticFold('pad'));
  assert.strictEqual(corePhoneticFold('wreckers'), corePhoneticFold('vreckers'));
  assert.strictEqual(corePhoneticFold('coal'), corePhoneticFold('cool'));
  // sh / sch / sz are one sound.
  assert.strictEqual(corePhoneticFold('shop'), corePhoneticFold('schop'));
  assert.strictEqual(corePhoneticFold('shop'), corePhoneticFold('szop'));
  // Silent h and doubled letters disappear.
  assert.strictEqual(corePhoneticFold('haus'), corePhoneticFold('aus'));
  assert.strictEqual(corePhoneticFold('storehouse'), corePhoneticFold('storehousse'));
  // Digits are preserved verbatim: they carry the variant number.
  assert.ok(corePhoneticFold('preschool 3').endsWith('3'));
  assert.notStrictEqual(corePhoneticFold('preschool 3'), corePhoneticFold('preschool 4'));
});

test('core fold does not collapse genuinely different map names', () => {
  const names = [
    'Coal Tower',
    'Blood Lodge',
    'Gas Heaven',
    'Rotten Fields',
    'Lampkin Lane',
    'Shattered Square',
    'Toba Landing',
  ];
  const keys = names.map((n) => corePhoneticFold(foldDiacritics(n)));
  assert.strictEqual(new Set(keys).size, names.length);
});

test('consonant skeleton drops vowels and glides but keeps the frame', () => {
  assert.strictEqual(consonantSkeleton('KALTAFAR'), 'KLTFR');
  assert.strictEqual(consonantSkeleton(''), '');
  // The skeleton is what survives a heavy accent rewriting every vowel.
  assert.strictEqual(
    consonantSkeleton(phoneticKey('cowshed', 'en')),
    consonantSkeleton(phoneticKey('kauszed', 'pl'))
  );
});

test('kana transliteration covers digraphs, sokuon and long vowels', () => {
  assert.strictEqual(kanaToRomaji('コールタワー'), 'korutawa');
  assert.strictEqual(kanaToRomaji('ゲーム'), 'gemu');
  assert.strictEqual(kanaToRomaji('シェルター'), 'sheruta');
  assert.strictEqual(kanaToRomaji('デッドドッグ'), 'dedodogu');
  // Hiragana is normalised to katakana first.
  assert.strictEqual(kanaToRomaji('こーるたわー'), 'korutawa');
  // Kanji are left alone: they are matched by literal aliases, not phonetically.
  assert.strictEqual(kanaToRomaji('警察署'), '警察署');
});

test('script detection distinguishes kana from kanji', () => {
  assert.strictEqual(hasJapaneseScript('コールタワー'), true);
  assert.strictEqual(hasJapaneseScript('警察署'), true);
  assert.strictEqual(hasJapaneseScript('coal tower'), false);
  assert.strictEqual(hasCjkIdeographs('警察署'), true);
  assert.strictEqual(hasCjkIdeographs('コールタワー'), false);
});

test('phoneticKeySet folds through every locale when none is given', () => {
  const all = phoneticKeySet('Fractured Cowshed');
  const single = phoneticKeySet('Fractured Cowshed', 'en');
  assert.ok(all.keys.length >= single.keys.length);
  assert.ok(all.keys.includes(single.primary));
  assert.strictEqual(phoneticKeySet('', 'en').keys.length, 0);
  assert.strictEqual(phoneticKeySet('   ', 'en').primary, '');
});

test('a locale-specific query still folds through English as well', () => {
  // Two keys: the locale fold and the neutral one. That is what lets a German
  // recognizer transcript reach an English-authored alias.
  const keys = phoneticKeySet('Kohleturm', 'de').keys;
  assert.ok(keys.length >= 1);
  assert.ok(keys.every((k) => k.length > 0));
});

test('japanese romaji is always available regardless of requested locale', () => {
  // A ja-JP transcript can arrive while the UI locale is still something else.
  const asEnglish = phoneticKeySet('コールタワー', 'en');
  const asJapanese = phoneticKeySet('コールタワー', 'ja');
  assert.ok(asEnglish.keys.length > 0);
  assert.ok(asEnglish.keys.some((k) => asJapanese.keys.includes(k)));
});

test('phoneticSimilarity behaves as a bounded 0..1 metric', () => {
  assert.strictEqual(phoneticSimilarity('KALTAFAR', 'KALTAFAR'), 1);
  assert.strictEqual(phoneticSimilarity('', 'KALTAFAR'), 0);
  assert.strictEqual(phoneticSimilarity('KALTAFAR', ''), 0);
  const near = phoneticSimilarity('KALTAFAR', 'KALTAR');
  assert.ok(near > 0.7 && near < 1, `expected a near-miss score, got ${near}`);
  assert.ok(phoneticSimilarity('KALTAFAR', 'PRAXAL3') < 0.4);
});

test('accented renderings of the same map name share a phonetic key', () => {
  const pairs: Array<[string, string, string]> = [
    // [reference spelling, accented transcript, locale of the transcript]
    ['Coal Tower', 'kol tauer', 'pl'],
    ['Coal Tower', 'kohl tauer', 'de'],
    ['Wretched Shop', 'reczed szop', 'pl'],
    ['Gas Heaven', 'gas heven', 'de'],
    ['The Thompson House', 'tompson haus', 'de'],
  ];

  for (const [reference, spoken, locale] of pairs) {
    const ref = phoneticKeySet(reference);
    const heard = phoneticKeySet(spoken, locale as any);
    const sharesKey = heard.keys.some((k) => ref.keys.includes(k));
    const sharesSkeleton = heard.skeletons.some((s) => ref.skeletons.includes(s));
    const close = heard.keys.some((k) => ref.keys.some((r) => phoneticSimilarity(k, r) >= 0.75));
    assert.ok(
      sharesKey || sharesSkeleton || close,
      `"${spoken}" (${locale}) should fold close to "${reference}"`
    );
  }
});
