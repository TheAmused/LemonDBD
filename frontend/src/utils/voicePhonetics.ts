// frontend/src/utils/voicePhonetics.ts
/**
 * voicePhonetics.ts
 *
 * Locale-aware phonetic normalization for LemonDBD voice map search.
 *
 * Problem this solves
 * -------------------
 * Map names in Dead by Daylight are English proper nouns ("Fractured Cowshed",
 * "Wretched Shop", "Azarov's Resting Place"). Players in every locale say those
 * English names, but they say them through the phonology of their own language,
 * and the speech engine (Google Web Speech or the local Whisper model) transcribes
 * what it hears using the *target locale's* orthography. A Polish speaker saying
 * "Fractured Cowshed" into a pl-PL recognizer comes back as "frakturd kauszed";
 * a German saying "Coal Tower" into de-DE comes back as "kohl tauer"; a Spaniard
 * saying "Gas Heaven" into es-ES comes back as "gas jeven".
 *
 * The previous approach was to hand-write each of those spellings into the alias
 * dictionary. That does not scale: it only ever covered Polish, it needs a new
 * literal for every accent of every map, and it silently fails for any spelling
 * nobody thought of.
 *
 * Approach
 * --------
 * Two-stage folding, then compare on the folded key rather than the letters:
 *
 *   1. LOCALE PRE-FOLD   Rewrite locale-specific graphemes into a common
 *                        pronunciation-ish spelling (pl "sz" -> "sh", de "z" -> "ts",
 *                        es "j" -> "h", ja kana -> romaji, ...).
 *   2. CORE FOLD         Collapse the result into a coarse phonetic key over a
 *                        reduced alphabet, merging the distinctions that accents
 *                        actually destroy: voicing pairs (b/p, d/t, g/k, s/z),
 *                        w/v/f, all vowel qualities, silent h, doubled letters.
 *
 * Every alias in the dictionary is indexed under the key it produces in EVERY
 * locale, so an alias written in one language is still reachable by a speaker of
 * another. A query is folded under the active locale plus the neutral fold.
 *
 * "Cowshed", "kauszed", "kauched", "kau shed", "Kaus Hed" and "カウシェッド" all
 * collapse to the same key. That is the accent adjustment, and it is per-map by
 * construction: it is derived from each map's own name.
 *
 * The keys are deliberately lossy, so callers must treat a phonetic hit as
 * high-but-not-certain confidence and must keep the exact/substring tiers ahead
 * of it in the matching pipeline.
 */

export type VoiceLocale = 'en' | 'pl' | 'de' | 'es' | 'ja';

export const VOICE_LOCALES: VoiceLocale[] = ['en', 'pl', 'de', 'es', 'ja'];

/** Minimum folded-key length before a phonetic hit is trusted at all. */
export const MIN_PHONETIC_KEY_LENGTH = 4;

/** Minimum consonant-skeleton length before a skeleton hit is trusted. */
export const MIN_SKELETON_KEY_LENGTH = 3;

export function isVoiceLocale(value: string | undefined | null): value is VoiceLocale {
  return !!value && (VOICE_LOCALES as string[]).includes(value);
}

export function toVoiceLocale(value: string | undefined | null): VoiceLocale {
  return isVoiceLocale(value) ? value : 'en';
}

// ─── Japanese kana → romaji ───────────────────────────────────────────────────

/**
 * Katakana / hiragana digraphs must be tried before single kana, longest first.
 * Japanese speech recognition returns map names in katakana ("コールタワー"),
 * so without this the entire ja locale is invisible to a latin-alphabet matcher.
 */
const KANA_DIGRAPHS: Array<[string, string]> = [
  ['キャ', 'kya'], ['キュ', 'kyu'], ['キョ', 'kyo'],
  ['シャ', 'sha'], ['シュ', 'shu'], ['ショ', 'sho'], ['シェ', 'she'],
  ['チャ', 'cha'], ['チュ', 'chu'], ['チョ', 'cho'], ['チェ', 'che'],
  ['ニャ', 'nya'], ['ニュ', 'nyu'], ['ニョ', 'nyo'],
  ['ヒャ', 'hya'], ['ヒュ', 'hyu'], ['ヒョ', 'hyo'],
  ['ミャ', 'mya'], ['ミュ', 'myu'], ['ミョ', 'myo'],
  ['リャ', 'rya'], ['リュ', 'ryu'], ['リョ', 'ryo'],
  ['ギャ', 'gya'], ['ギュ', 'gyu'], ['ギョ', 'gyo'],
  ['ジャ', 'ja'], ['ジュ', 'ju'], ['ジョ', 'jo'], ['ジェ', 'je'],
  ['ビャ', 'bya'], ['ビュ', 'byu'], ['ビョ', 'byo'],
  ['ピャ', 'pya'], ['ピュ', 'pyu'], ['ピョ', 'pyo'],
  ['ティ', 'ti'], ['トゥ', 'tu'], ['ディ', 'di'], ['ドゥ', 'du'],
  ['ファ', 'fa'], ['フィ', 'fi'], ['フェ', 'fe'], ['フォ', 'fo'],
  ['ウィ', 'wi'], ['ウェ', 'we'], ['ウォ', 'wo'],
  ['ヴァ', 'va'], ['ヴィ', 'vi'], ['ヴェ', 've'], ['ヴォ', 'vo'], ['ヴ', 'vu'],
];

const KANA_SINGLES: Record<string, string> = {
  ア: 'a', イ: 'i', ウ: 'u', エ: 'e', オ: 'o',
  カ: 'ka', キ: 'ki', ク: 'ku', ケ: 'ke', コ: 'ko',
  サ: 'sa', シ: 'shi', ス: 'su', セ: 'se', ソ: 'so',
  タ: 'ta', チ: 'chi', ツ: 'tsu', テ: 'te', ト: 'to',
  ナ: 'na', ニ: 'ni', ヌ: 'nu', ネ: 'ne', ノ: 'no',
  ハ: 'ha', ヒ: 'hi', フ: 'fu', ヘ: 'he', ホ: 'ho',
  マ: 'ma', ミ: 'mi', ム: 'mu', メ: 'me', モ: 'mo',
  ヤ: 'ya', ユ: 'yu', ヨ: 'yo',
  ラ: 'ra', リ: 'ri', ル: 'ru', レ: 're', ロ: 'ro',
  ワ: 'wa', ヲ: 'o', ン: 'n',
  ガ: 'ga', ギ: 'gi', グ: 'gu', ゲ: 'ge', ゴ: 'go',
  ザ: 'za', ジ: 'ji', ズ: 'zu', ゼ: 'ze', ゾ: 'zo',
  ダ: 'da', ヂ: 'ji', ヅ: 'zu', デ: 'de', ド: 'do',
  バ: 'ba', ビ: 'bi', ブ: 'bu', ベ: 'be', ボ: 'bo',
  パ: 'pa', ピ: 'pi', プ: 'pu', ペ: 'pe', ポ: 'po',
  ァ: 'a', ィ: 'i', ゥ: 'u', ェ: 'e', ォ: 'o',
  ャ: 'ya', ュ: 'yu', ョ: 'yo',
};

/** Hiragana occupies U+3041–U+3096; katakana the same order at U+30A1–U+30F6. */
function hiraganaToKatakana(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    out += code >= 0x3041 && code <= 0x3096 ? String.fromCodePoint(code + 0x60) : ch;
  }
  return out;
}

export function hasJapaneseScript(input: string): boolean {
  return /[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/.test(input);
}

export function hasCjkIdeographs(input: string): boolean {
  return /[㐀-䶿一-鿿]/.test(input);
}

/**
 * Transliterates kana to romaji. Kanji are left untouched (they are matched by the
 * literal kanji aliases in the dictionary, not phonetically).
 */
export function kanaToRomaji(input: string): string {
  if (!input) return '';
  let text = hiraganaToKatakana(input).replace(/[ー・]/g, ''); //長音符 and middle dot

  for (const [kana, romaji] of KANA_DIGRAPHS) {
    text = text.split(kana).join(romaji);
  }

  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === 'ッ') {
      // Sokuon: geminate the next consonant. The core fold collapses doubles
      // again, so emitting nothing here is equivalent and avoids a lookahead.
      continue;
    }
    out += KANA_SINGLES[ch] ?? ch;
  }

  return out;
}

// ─── Shared text preparation ─────────────────────────────────────────────────

/**
 * Lowercases, decomposes diacritics and maps the few letters NFD cannot strip.
 * Kept separate from mapVoiceMatcher.normalizeString so the phonetic layer stays
 * usable on its own (and testable without the 60KB dictionary).
 */
export function foldDiacritics(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .toLowerCase();
}

/**
 * Rewrites standalone roman numerals to digits so that variant numbers survive
 * phonetic folding (which collapses vowels and would otherwise destroy i/ii/iii).
 * Order matters: longer numerals must be replaced before their own prefixes.
 */
export function romanNumeralsToDigits(input: string): string {
  if (!input) return '';
  return input
    .replace(/\biiiv\b/g, '4')
    .replace(/\bviii\b/g, '8')
    .replace(/\bvii\b/g, '7')
    .replace(/\biii\b/g, '3')
    .replace(/\bvi\b/g, '6')
    .replace(/\biv\b/g, '4')
    .replace(/\bii\b/g, '2')
    .replace(/\bix\b/g, '9')
    .replace(/\bv\b/g, '5')
    .replace(/\bx\b/g, '10')
    .replace(/\bi\b/g, '1');
}

// ─── Locale pre-folds ────────────────────────────────────────────────────────

/**
 * Each pre-fold rewrites the orthography a given locale's recognizer emits into a
 * neutral, roughly English-shaped spelling. They run on diacritic-folded
 * lowercase text and are intentionally shallow: the core fold does the heavy
 * merging afterwards.
 */
type PreFold = (text: string) => string;

const preFoldEn: PreFold = (t) => t;

const preFoldPl: PreFold = (t) =>
  t
    .replace(/sz/g, 'sh')
    .replace(/cz/g, 'ch')
    .replace(/rz/g, 'zh')
    .replace(/dz/g, 'j')
    .replace(/ch/g, 'h')     // Polish <ch> is /x/, not the English affricate
    .replace(/\bw/g, 'v')
    .replace(/w/g, 'v')
    .replace(/j/g, 'y');

const preFoldDe: PreFold = (t) =>
  t
    .replace(/tsch/g, 'ch')
    .replace(/sch/g, 'sh')
    .replace(/chs/g, 'ks')
    .replace(/\bst/g, 'sht')
    .replace(/\bsp/g, 'shp')
    .replace(/tz/g, 'ts')
    .replace(/z/g, 'ts')
    .replace(/v/g, 'f')
    .replace(/w/g, 'v')
    .replace(/eu/g, 'oy')
    .replace(/ei/g, 'ai')
    .replace(/ie/g, 'i')
    .replace(/j/g, 'y');

const preFoldEs: PreFold = (t) =>
  t
    .replace(/qu/g, 'k')
    .replace(/ll/g, 'y')
    .replace(/ge/g, 'he')
    .replace(/gi/g, 'hi')
    .replace(/j/g, 'h')
    .replace(/ce/g, 'se')
    .replace(/ci/g, 'si')
    .replace(/z/g, 's')
    .replace(/v/g, 'b')
    .replace(/\bh/g, '')     // <h> is silent in Spanish
    .replace(/ñ/g, 'ny');

const preFoldJa: PreFold = (t) =>
  kanaToRomaji(t)
    .replace(/l/g, 'r')      // Japanese has no /l/ – it surfaces as /r/
    .replace(/ou/g, 'o')
    .replace(/uu/g, 'u')
    .replace(/oo/g, 'o')
    .replace(/v/g, 'b');

const PRE_FOLDS: Record<VoiceLocale, PreFold> = {
  en: preFoldEn,
  pl: preFoldPl,
  de: preFoldDe,
  es: preFoldEs,
  ja: preFoldJa,
};

// ─── Core fold ───────────────────────────────────────────────────────────────

const VOWEL = 'A';

/**
 * Collapses a pre-folded latin string into a coarse phonetic key.
 *
 * Reduced alphabet:
 *   A vowels (all qualities merged)   K k/g/hard c/q      P b/p
 *   T d/t                             S s/z/soft c        F f/v/w
 *   C affricates (ch/cz/tsch/tch)     X sh/sch/sz         Z zh/rz/j(fr)
 *   J dʒ/dz                           N n/ng/ny           M m
 *   L l                               R r                 Y j/y glide
 *   H is dropped entirely; doubled symbols are collapsed.
 */
export function corePhoneticFold(input: string): string {
  if (!input) return '';

  let t = input.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return '';

  t = romanNumeralsToDigits(t).replace(/\s+/g, '');
  if (!t) return '';

  // Digraphs, longest first.
  t = t
    .replace(/tsch/g, 'C')
    .replace(/tsh/g, 'C')
    .replace(/sch/g, 'X')
    .replace(/tch/g, 'C')
    .replace(/sh/g, 'X')
    .replace(/sz/g, 'X')
    .replace(/cz/g, 'C')
    .replace(/ch/g, 'C')
    .replace(/zh/g, 'Z')
    .replace(/rz/g, 'Z')
    .replace(/dz/g, 'J')
    .replace(/ph/g, 'F')
    .replace(/gh/g, '')
    .replace(/th/g, 'T')
    .replace(/ck/g, 'K')
    .replace(/qu/g, 'K')
    .replace(/ng/g, 'N')
    .replace(/x/g, 'KS')
    .replace(/ts/g, 'S');

  // Post-vocalic <w> is the second half of a diphthong, not a consonant:
  // "cowshed" is /kaʊ-/, and a pl-PL or de-DE recognizer writes that vowel out
  // ("kauszed", "kau schet") with no <w> at all. Dropping it here is what makes
  // those spellings land on the same key rather than one symbol apart.
  t = t.replace(/([aeiouy])w/g, '$1');

  // Soft vs hard <c> and <g>.
  t = t.replace(/c(?=[eiy])/g, 'S').replace(/g(?=[eiy])/g, 'J');

  // Single letters.
  const SINGLE: Record<string, string> = {
    a: VOWEL, e: VOWEL, i: VOWEL, o: VOWEL, u: VOWEL, y: VOWEL,
    b: 'P', p: 'P',
    d: 'T', t: 'T',
    c: 'K', k: 'K', g: 'K', q: 'K',
    s: 'S', z: 'S',
    f: 'F', v: 'F', w: 'F',
    j: 'J',
    l: 'L', r: 'R',
    m: 'M', n: 'N',
    h: '',
  };

  let out = '';
  for (const ch of t) {
    if (ch >= '0' && ch <= '9') {
      out += ch;
      continue;
    }
    if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) {
      out += ch; // already a reduced symbol from the digraph pass
      continue;
    }
    out += SINGLE[ch] ?? '';
  }

  // Collapse runs ("kkk" -> "k", "AAA" -> "A").
  return out.replace(/(.)\1+/g, '$1');
}

/**
 * The consonant skeleton: the phonetic key with every vowel and glide removed.
 * Far more collision-prone, so callers must only use it for keys they have
 * verified to be unambiguous within their own index.
 */
export function consonantSkeleton(phoneticKey: string): string {
  if (!phoneticKey) return '';
  return phoneticKey.replace(/[AY]/g, '').replace(/(.)\1+/g, '$1');
}

// ─── Public key generation ───────────────────────────────────────────────────

export interface PhoneticKeySet {
  /** Phonetic keys, one per locale pre-fold that produced a distinct result. */
  keys: string[];
  /** Consonant skeletons derived from `keys`. */
  skeletons: string[];
  /** The key produced under the caller's own locale, for tie-breaking. */
  primary: string;
}

/**
 * Produces the phonetic key set for a piece of text.
 *
 * When `locale` is omitted every locale pre-fold is applied, which is what the
 * dictionary indexer wants: an alias written in German should still be reachable
 * by a Polish recognizer transcript and vice versa.
 *
 * When `locale` is given, that locale's fold plus the neutral English fold are
 * used — the recognizer already committed to one locale's orthography, so
 * folding the transcript through all five only adds noise.
 */
export function phoneticKeySet(text: string, locale?: VoiceLocale): PhoneticKeySet {
  const base = foldDiacritics(text || '').trim();
  if (!base) return { keys: [], skeletons: [], primary: '' };

  const locales: VoiceLocale[] = locale ? (locale === 'en' ? ['en'] : [locale, 'en']) : VOICE_LOCALES;

  const keys: string[] = [];
  const skeletons: string[] = [];
  let primary = '';

  for (const loc of locales) {
    const folded = corePhoneticFold(PRE_FOLDS[loc](base));
    if (!folded) continue;
    if (!primary) primary = folded;
    if (!keys.includes(folded)) keys.push(folded);
    const skel = consonantSkeleton(folded);
    if (skel && !skeletons.includes(skel)) skeletons.push(skel);
  }

  // Japanese transcripts arrive as kana even in other locales' folds; make sure
  // the romaji reading is always available regardless of the requested locale.
  if (hasJapaneseScript(base)) {
    const folded = corePhoneticFold(preFoldJa(base));
    if (folded && !keys.includes(folded)) {
      keys.push(folded);
      const skel = consonantSkeleton(folded);
      if (skel && !skeletons.includes(skel)) skeletons.push(skel);
    }
  }

  return { keys, skeletons, primary: primary || keys[0] || '' };
}

/** Convenience wrapper: the single key for `text` under `locale`. */
export function phoneticKey(text: string, locale: VoiceLocale = 'en'): string {
  return phoneticKeySet(text, locale).primary;
}

/**
 * Similarity between two phonetic keys, 0..1, using edit distance over the
 * reduced alphabet. Used as the tolerant tier when no key matches exactly.
 */
export function phoneticSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const len1 = a.length;
  const len2 = b.length;
  const maxLen = Math.max(len1, len2);

  let prev = new Array<number>(len2 + 1);
  let curr = new Array<number>(len2 + 1);
  for (let j = 0; j <= len2; j++) prev[j] = j;

  for (let i = 1; i <= len1; i++) {
    curr[0] = i;
    const c1 = a[i - 1];
    for (let j = 1; j <= len2; j++) {
      const cost = c1 === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return Math.max(0, 1 - prev[len2] / maxLen);
}
