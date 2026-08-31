// frontend/src/utils/textCase.ts

/** Words this short that are already all-uppercase are candidates for being
 * an intentional acronym or roman numeral (VCR, EMP, III) rather than the
 * scraper/translation's shouting-caps bug -- but only once COMMON_SHORT_WORDS
 * below rules out the far more common case of a short connector word that's
 * just stuck in caps (e.g. Polish "Ulepszenie DO Wysokiego Prądu"). */
const MAX_PRESERVED_ACRONYM_LENGTH = 3;

const ROMAN_NUMERAL_RE = /^[IVXLCDM]+$/i;

/** Common short connector words across every locale this app ships, kept
 * lowercase for a case-insensitive lookup. A short all-caps word only gets
 * treated as a likely acronym once it's confirmed *not* one of these. */
const COMMON_SHORT_WORDS = new Set([
  // en
  'a', 'an', 'as', 'at', 'by', 'in', 'is', 'of', 'on', 'or', 'to',
  // pl
  'do', 'na', 'za', 'od', 'we', 'co', 'po', 'ku', 'aż', 'iż', 'że', 'i', 'w', 'z', 'u', 'o',
  // de
  'der', 'die', 'das', 'und', 'für', 'von', 'zu', 'im', 'am', 'ist',
  // es
  'de', 'la', 'el', 'en', 'un', 'y',
]);

/** Title-cases each word, fixing names that come through in ALL CAPS (or with
 * a stray all-caps word left over from a partial translation) due to a
 * source/scraper bug, while leaving genuine short acronyms and roman
 * numerals alone (e.g. "VCR" stays "VCR", not "Vcr"; "III" stays "III").
 * Apostrophes are handled correctly, e.g. "JUDITH'S TOMBSTONE" ->
 * "Judith's Tombstone". */
export function toTitleCase(text: string): string {
  if (!text) return text;
  return text
    .split(/(\s+)/)
    .map((word) => {
      const isAllUpperWord = /^\p{L}+$/u.test(word) && word === word.toUpperCase();
      if (isAllUpperWord && ROMAN_NUMERAL_RE.test(word)) {
        return word;
      }
      if (
        isAllUpperWord &&
        word.length <= MAX_PRESERVED_ACRONYM_LENGTH &&
        !COMMON_SHORT_WORDS.has(word.toLowerCase())
      ) {
        return word;
      }
      return word.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (match) => match.toUpperCase());
    })
    .join('');
}
