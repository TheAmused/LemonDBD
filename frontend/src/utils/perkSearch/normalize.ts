// frontend/src/utils/perkSearch/normalize.ts
import { normalizeSearchText } from '@/utils/perkUtils';

const APOSTROPHES = /['’‘`´]/g;
const SEPARATORS = /[\p{P}\p{S}\s]+/gu;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

/**
 * Lower-case, accent-free, punctuation-free words separated by single spaces:
 * "Hex: Ruin" -> "hex ruin", "Franklin's Demise" -> "franklins demise",
 * "呪術：破滅" -> "呪術 破滅".
 */
export function foldSearchText(text: string): string {
  // NFC at the end puts kana back together (NFD split パ into ハ + a combining mark).
  return normalizeSearchText(text).replace(APOSTROPHES, '').replace(SEPARATORS, ' ').trim().normalize('NFC');
}

/** Folded text without spaces, so "selfcare" finds "Self-Care" and "deja vu" finds "Deja Vu". */
export function compactSearchText(folded: string): string {
  return folded.replace(/ /g, '');
}

/** True for Japanese/Chinese text, which has no spaces between words. */
export function hasCjk(text: string): boolean {
  return CJK.test(text);
}
