// frontend/src/utils/textCase.ts

/** Words this short that are already all-uppercase are left untouched, since
 * they're almost always an intentional acronym or roman numeral (VCR, EMP,
 * III) rather than the scraper's shouting-caps bug. */
const MAX_PRESERVED_ACRONYM_LENGTH = 3;

/** Title-cases each word, fixing scraped names that come through in ALL CAPS
 * or inconsistently cased, while leaving short existing acronyms/numerals
 * alone (e.g. "VCR" stays "VCR", not "Vcr"). Apostrophes are handled
 * correctly, e.g. "JUDITH'S TOMBSTONE" -> "Judith's Tombstone". */
export function toTitleCase(text: string): string {
  if (!text) return text;
  return text
    .split(/(\s+)/)
    .map((word) => {
      if (/^\p{L}+$/u.test(word) && word.length <= MAX_PRESERVED_ACRONYM_LENGTH && word === word.toUpperCase()) {
        return word;
      }
      return word.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (match) => match.toUpperCase());
    })
    .join('');
}
