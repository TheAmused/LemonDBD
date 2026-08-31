// frontend/src/utils/textFormatter.tsx
import React from 'react';

/**
 * Single source of truth for Dead by Daylight keywords across all 5 supported languages:
 * English (EN), Polish (PL), German (DE), Spanish (ES), and Japanese (JA).
 */
/**
 * Keyword vocabulary grouped by the language whose morphology applies to it.
 *
 * Grouping is what lets each language's own inflectional endings be applied to
 * its own words only: "Torment" may take the English "-ed", but not the Polish
 * "-a", so the Spanish word "tormenta" (a storm) is never mistaken for the
 * Torment status effect.
 */
const KEYWORDS_BY_LOCALE: Record<string, readonly string[]> = {
  en: [
    'Increases',
    'Increase',
    'Decreases',
    'Decrease',
    'Grants',
    'Grant',
    'Reveals',
    'Reveal',
    'Causes',
    'Cause',
    'Unlocks',
    'Unlock',
    'Applies',
    'Apply',
    'Activates',
    'Activate',
    'Affects',
    'Affect',
    'Extends',
    'Extend',
    'Reduces',
    'Reduce',
    'Blocks',
    'Block',
    'Tremendously',
    'Considerably',
    'Moderately',
    'Slightly',
    'Hex:',
    'Hex',
    'Boon:',
    'Boon',
    'Scourge Hook:',
    'Scourge Hook',
    'Obsession',
    'Exhausted',
    'Exhaustion',
    'Exposed',
    'Haste',
    'Hindered',
    'Blindness',
    'Broken',
    'Oblivious',
    'Undetectable',
    'Incapacitated',
    'Mangled',
    'Hemorrhage',
    'Deep Wound',
    'Cursed',
    'Endurance',
    'Bloodlust',
    'Torment',
    'Terror Radius',
    'Killer Instinct',
    'Aura Reading',
    'Auras',
    'Aura',
    'Skill Checks',
    'Skill Check',
    'Great Skill Check',
    'Good Skill Check',
    'Bear Trap',
    'Bear Traps',
    'Dying State',
    'Injured State',
    'Healthy State',
    'Hooks',
    'Hook',
    'Generators',
    'Generator',
    'Pallets',
    'Pallet',
    'Windows',
    'Window',
    'Chests',
    'Chest',
    'Totems',
    'Totem',
    'Bloodweb',
    'Trial',
    'Entity',
    'Status Effect',
    'Haste Status Effect',
    'Blinded',
    'Marked',
    'Med-Kit',
    'Medkit',
    'Toolbox',
    'Flashlight',
    'First Aid',
    'Styptic',
    'Serum',
    'Bandage',
    'Activating',
    'Activation',
    'Special Ability',
    'Special Attack',
    'Lunge',
    'Lullaby',
  ],
  pl: [
    'Zwiększa',
    'Zmniejsza',
    'Ujawnia',
    'Odblokowuje',
    'Nakłada',
    'Aktywuje',
    'Pośpiech',
    'Pośpiechu',
    'Pośpiechem',
    'Spowolnienie',
    'Spowolnienia',
    'Spowolnieniem',
    'Narażenie',
    'Narażenia',
    'Narażeniem',
    'Wyczerpanie',
    'Wyczerpania',
    'Wyczerpaniem',
    'Wyczerpany',
    'Wyczerpana',
    'Wyczerpani',
    'Oślepienie',
    'Oślepienia',
    'Oślepieniem',
    'Oślepiony',
    'Oślepiona',
    'Okaleczenie',
    'Okaleczenia',
    'Okaleczeniem',
    'Okaleczony',
    'Okaleczona',
    'Nieświadomość',
    'Nieświadomości',
    'Nieświadomością',
    'Nieświadomy',
    'Nieświadoma',
    'Niewykrywalność',
    'Niewykrywalności',
    'Niewykrywalnością',
    'Niewykrywalny',
    'Niewykrywalna',
    'Obezwładnienie',
    'Obezwładnienia',
    'Obezwładnieniem',
    'Obezwładniony',
    'Obezwładniona',
    'Głęboka Rana',
    'Głębokiej Rany',
    'Głęboką Ranę',
    'Głębokiej Ranie',
    'Głęboką Raną',
    'Głębokie Rany',
    'Głębokich Ran',
    'Krwotok',
    'Krwotoku',
    'Krwotokiem',
    'Wytrzymałość',
    'Wytrzymałości',
    'Wytrzymałością',
    'Żądza Krwi',
    'Żądzy Krwi',
    'Żądzę Krwi',
    'Żądzą Krwi',
    'Zasięg Terroru',
    'Zasięgu Terroru',
    'Zasięgiem Terroru',
    'Instynkt Zabójcy',
    'Instynktu Zabójcy',
    'Instynktem Zabójcy',
    'Czytanie Aur',
    'Czytaniu Aur',
    'Czytaniem Aur',
    'Aura Zabójcy',
    'Aury Zabójcy',
    'Aurę Zabójcy',
    'Aury Ocalałych',
    'Aurę Ocalałych',
    'Aura',
    'Aury',
    'Aurę',
    'Aurze',
    'Aurą',
    'Aurom',
    'Aurami',
    'Aurach',
    'Obsesja',
    'Obsesji',
    'Obsesję',
    'Obsesją',
    'Klątwa:',
    'Klątwa',
    'Klątwy',
    'Klątwie',
    'Klątwę',
    'Klątwą',
    'Klątw',
    'Dar:',
    'Dar',
    'Daru',
    'Darem',
    'Darze',
    'Dary',
    'Darów',
    'Darom',
    'Darami',
    'Hak Plagi:',
    'Hak Plagi',
    'Haki Plagi',
    'Haków Plagi',
    'Hakom Plagi',
    'Hakami Plagi',
    'Hakach Plagi',
    'Haku Plagi',
    'Hak',
    'Haki',
    'Haka',
    'Haku',
    'Hakiem',
    'Haków',
    'Hakom',
    'Hakami',
    'Hakach',
    'Test Umiejętności',
    'Testy Umiejętności',
    'Testu Umiejętności',
    'Testem Umiejętności',
    'Testów Umiejętności',
    'Testom Umiejętności',
    'Testami Umiejętności',
    'Testach Umiejętności',
    'Pułapka na Niedźwiedzie',
    'Pułapki na Niedźwiedzie',
    'Pułapce na Niedźwiedzie',
    'Pułapkę na Niedźwiedzie',
    'Pułapką na Niedźwiedzie',
    'Pułapek na Niedźwiedzie',
    'Pułapkom na Niedźwiedzie',
    'Pułapkami na Niedźwiedzie',
    'Pułapkach na Niedźwiedzie',
    'Stan Konania',
    'Stanu Konania',
    'Stanowi Konania',
    'Stanem Konania',
    'Stanie Konania',
    'Stan Ranny',
    'Stanu Rannego',
    'Stanowi Rannemu',
    'Stanem Rannym',
    'Stanie Rannym',
    'Stan Zdrowy',
    'Stanu Zdrowego',
    'Stanowi Zdrowemu',
    'Stanem Zdrowym',
    'Stanie Zdrowym',
    'Generator',
    'Generatory',
    'Generatora',
    'Generatorów',
    'Generatorom',
    'Generatorami',
    'Generatorze',
    'Generatorach',
    'Generatorowi',
    'Paleta',
    'Palety',
    'Palecie',
    'Paletę',
    'Paletą',
    'Palet',
    'Paletom',
    'Paletami',
    'Paletach',
    'Skrzynia',
    'Skrzynie',
    'Skrzyni',
    'Skrzynię',
    'Skrzynią',
    'Skrzyń',
    'Skrzyniom',
    'Skrzyniami',
    'Skrzyniach',
    'Totem',
    'Totemy',
    'Totemu',
    'Totemem',
    'Totemie',
    'Totemów',
    'Totemom',
    'Totemami',
    'Totemach',
  ],
  de: [
    'Erhöht',
    'Verringert',
    'Enthüllt',
    'Entfesselt',
    'Aktiviert',
    'Eile',
    'Gefährdet',
    'Erschöpft',
    'Blindheit',
    'Gebrochen',
    'Ahnungslos',
    'Unentdeckbar',
    'Handlungsunfähig',
    'Zerfleischt',
    'Blutsturz',
    'Tiefe Wunde',
    'Ausdauer',
    'Blutrausch',
    'Terrorradius',
    'Killer-Instinkt',
    'Aura',
    'Auren',
    'Fluch:',
    'Fluch',
    'Segen:',
    'Segen',
    'Geißelhaken:',
    'Geißelhaken',
    'Besessenheit',
    'Fähigkeits-Check',
    'Fähigkeits-Checks',
    'Palette',
    'Generator',
    'Haken',
    'Truhe',
    'Fenster',
    'Blockiert',
    'Blockieren',
    'Erschöpfung',
    'Verletzt',
    'Sterbend',
    'Prüfung',
  ],
  es: [
    'Aumenta',
    'Reduce',
    'Revela',
    'Desbloquea',
    'Aplica',
    'Activa',
    'Celeridad',
    'Entorpecimiento',
    'Vulnerable',
    'Agotamiento',
    'Ceguera',
    'Desesperanza',
    'Inconsciente',
    'Indetectable',
    'Incapacitado',
    'Mutilado',
    'Hemorragia',
    'Herida profunda',
    'Resistencia',
    'Sed de sangre',
    'Radio de terror',
    'Instinto asesino',
    'Aura',
    'Auras',
    'Maleficio:',
    'Maleficio',
    'Bendición:',
    'Bendición',
    'Gancho flagelo:',
    'Gancho flagelo',
    'Obsesión',
    'Prueba de habilidad',
    'Pruebas de habilidad',
    'Tormento',
    'Generador',
    'Palet',
    'Gancho',
    'Cofre',
    'Ventana',
    'Tótem',
    'Prueba',
  ],
  ja: [
    '迅速',
    '妨害',
    '無防備',
    '疲労',
    '盲目',
    '衰弱',
    '忘却',
    '探知不可',
    '行動不能',
    '重傷',
    '深手',
    '我慢',
    '血の渇望',
    '脅威範囲',
    '殺人鬼の本能',
    'オーラ',
    '呪術:',
    '呪術',
    '恵み:',
    '恵み',
    '悶絶のフック:',
    '悶絶のフック',
    'オブセッション',
    'スキルチェック',
  ],
};

/**
 * Inflectional endings appended to a keyword when matching.
 *
 * Dead by Daylight descriptions are written in running prose, so a keyword
 * almost never appears in its dictionary form: German writes "Generatoren",
 * Spanish "revelarán", English "revealed". Enumerating every form by hand does
 * not scale - it is why the Polish list below grew to a full declension table
 * while German and Spanish kept only the lemma and silently lost their
 * highlights. Matching a lemma plus a known ending covers the whole paradigm.
 *
 * Japanese is deliberately empty: it does not use spaces, so allowing a
 * trailing run of characters would swallow the words that follow.
 */
const INFLECTION_SUFFIXES: Record<string, readonly string[]> = {
  en: ['s', 'es', 'd', 'ed', 'ing', 'en', 'er', 'ers'],
  pl: [
    // nominal declension
    'a', 'ą', 'e', 'ę', 'i', 'y', 'u', 'em', 'om', 'ie', 'ów',
    'ach', 'ami', 'owi', 'owie', 'ym', 'im', 'ego', 'emu', 'ych', 'ją',
    // verbal and participial forms ("zwiększający", "ujawniania", "nakładane")
    'ć', 'sz', 'no', 'li', 'ni', 'ła', 'ło', 'ły',
    'ny', 'na', 'ne', 'nia', 'niu', 'niem', 'nych', 'nym', 'nej', 'nym',
    'jący', 'jąca', 'jące', 'jących', 'jącym',
  ],
  de: ['e', 'n', 's', 'en', 'er', 'es', 'em', 'et', 'te', 'ten', 'ete', 'eten', 'ung', 'ungen'],
  es: [
    's', 'es', 'n', 'r', 'ba', 'ban', 'ndo', 'do', 'da', 'dos', 'das',
    'rá', 'rás', 'rán', 'ré', 'ría', 'rían', 'remos', 'ron', 'rse', 'ndose',
    'ción', 'ciones',
  ],
  ja: [],
};

/** Flattened vocabulary, kept for callers that just need the word list. */
export const DBD_KEYWORDS: readonly string[] = Object.values(KEYWORDS_BY_LOCALE).flat();

export const DBD_INPUT_BUTTONS: readonly string[] = [
  // --- English (EN) ---
  'Active Ability Button 1',
  'Active Ability Button 2',
  'Active Ability Button',
  'Ability Button 1',
  'Ability Button 2',
  'Ability Button',
  'Ability button 1',
  'Ability button 2',
  'Ability button',
  'Secondary Action Button',
  'Secondary Action',
  'Secondary Power Button',
  'Power Button',
  'Action Button',
  'Use Item Button',
  'Attack Button',
  'Pick Up Button',
  'Interact Button',

  // --- Polish (PL) ---
  'przycisk zdolności aktywnej 1',
  'przycisk zdolności aktywnej 2',
  'przycisk zdolności aktywnej',
  'przycisk aktywnej umiejętności 1',
  'przycisk aktywnej umiejętności 2',
  'przycisk aktywnej umiejętności',
  'przycisk umiejętności aktywnej 1',
  'przycisk umiejętności aktywnej 2',
  'przycisk umiejętności aktywnej',
  'przycisk mocy dodatkowej',
  'przycisk mocy',
  'przycisk akcji',
  'przycisk użycia przedmiotu',
  'przycisk ataku',
  'przycisk podniesienia',
  'przycisk interakcji',
  'przycisk dodatkowej akcji',

  // --- German (DE) ---
  'Taste für die aktive Fähigkeit 1',
  'Taste für die aktive Fähigkeit 2',
  'Taste für die aktive Fähigkeit',
  'Fähigkeits-Taste 1',
  'Fähigkeits-Taste 2',
  'Fähigkeitstaste 1',
  'Fähigkeitstaste 2',
  'Fähigkeits-Taste',
  'Fähigkeitstaste',
  'Sekundärkrafttaste',
  'Krafttaste',
  'Aktionstaste',
  'Gegenstand-Taste',
  'Angriffstaste',
  'Aufhebentaste',
  'Interaktionstaste',

  // --- Spanish (ES) ---
  'botón de la habilidad activa 1',
  'botón de la habilidad activa 2',
  'botón de la habilidad activa',
  'botón de habilidad activa 1',
  'botón de habilidad activa 2',
  'botón de habilidad activa',
  'botón de acción secundaria',
  'botón de poder secundario',
  'botón de poder',
  'botón de acción',
  'botón de usar objeto',
  'botón de ataque',
  'botón de recoger',
  'botón de interacción',

  // --- Japanese (JA) ---
  'アビリティ発動のボタン1',
  'アビリティ発動のボタン2',
  'アビリティ発動のボタン',
  'アビリティ発動ボタン1',
  'アビリティ発動ボタン2',
  'アビリティ発動ボタン',
  'アビリティボタン1',
  'アビリティボタン2',
  'アビリティボタン',
  '第2能力ボタン',
  '能力ボタン',
  'アクションボタン',
  'アイテム使用ボタン',
  '攻撃ボタン',
  '拾うボタン',
  'インタラクトボタン',
];

/** Alias for backwards compatibility */
export const ACTION_KEYWORDS = DBD_KEYWORDS;

/** Multilingual input action token mappings */
export const INPUT_ACTION_LABELS: Record<string, Record<string, string>> = {
  en: {
    ACTIVATABLEBUTTON1: 'Active Ability Button 1',
    ACTIVATABLEBUTTON2: 'Active Ability Button 2',
    POWER: 'Power Button',
    SECONDARYPOWER: 'Secondary Power Button',
    ACTIONSURVIVOR: 'Action Button',
    USEITEM: 'Use Item Button',
    PICKUP: 'Pick Up Button',
    PICKUPITEM: 'Pick Up Button',
    ATTACK: 'Attack Button',
  },
  pl: {
    ACTIVATABLEBUTTON1: 'przycisk zdolności aktywnej 1',
    ACTIVATABLEBUTTON2: 'przycisk zdolności aktywnej 2',
    POWER: 'przycisk mocy',
    SECONDARYPOWER: 'przycisk mocy dodatkowej',
    ACTIONSURVIVOR: 'przycisk akcji',
    USEITEM: 'przycisk użycia przedmiotu',
    PICKUP: 'przycisk podniesienia',
    PICKUPITEM: 'przycisk podniesienia',
    ATTACK: 'przycisk ataku',
  },
  de: {
    ACTIVATABLEBUTTON1: 'Fähigkeits-Taste 1',
    ACTIVATABLEBUTTON2: 'Fähigkeits-Taste 2',
    POWER: 'Krafttaste',
    SECONDARYPOWER: 'Sekundärkrafttaste',
    ACTIONSURVIVOR: 'Aktionstaste',
    USEITEM: 'Gegenstand-Taste',
    PICKUP: 'Aufhebentaste',
    PICKUPITEM: 'Aufhebentaste',
    ATTACK: 'Angriffstaste',
  },
  es: {
    ACTIVATABLEBUTTON1: 'botón de la habilidad activa 1',
    ACTIVATABLEBUTTON2: 'botón de la habilidad activa 2',
    POWER: 'botón de poder',
    SECONDARYPOWER: 'botón de poder secundario',
    ACTIONSURVIVOR: 'botón de acción',
    USEITEM: 'botón de usar objeto',
    PICKUP: 'botón de recoger',
    PICKUPITEM: 'botón de recoger',
    ATTACK: 'botón de ataque',
  },
  ja: {
    ACTIVATABLEBUTTON1: 'アビリティボタン1',
    ACTIVATABLEBUTTON2: 'アビリティボタン2',
    POWER: '能力ボタン',
    SECONDARYPOWER: '第2能力ボタン',
    ACTIONSURVIVOR: 'アクションボタン',
    USEITEM: 'アイテム使用ボタン',
    PICKUP: '拾うボタン',
    PICKUPITEM: '拾うボタン',
    ATTACK: '攻撃ボタン',
  },
};

/** Escapes a literal so it can be embedded in a RegExp source. */
function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A word boundary that understands accented and non-Latin letters.
 *
 * `\b` is defined against ASCII `\w`, so it treats "ó" as a boundary and lets
 * "Generator" match inside "generatorów", highlighting only part of the word.
 */
const WORD_LEFT = String.raw`(?<![\p{L}\p{N}_])`;
const WORD_RIGHT = String.raw`(?![\p{L}\p{N}_])`;

/**
 * Builds the keyword alternation: every language's words followed by that same
 * language's optional inflectional ending. Longest keywords are tried first so
 * "Deep Wound" wins over "Wound", and CJK entries are matched without the
 * letter-boundary guards, which would otherwise fail between two kanji.
 */
function buildKeywordPattern(): string {
  const groups: string[] = [];
  for (const [locale, words] of Object.entries(KEYWORDS_BY_LOCALE)) {
    if (!words.length) continue;
    const alternation = [...words]
      .sort((a, b) => b.length - a.length)
      .map(escapeForRegex)
      .join('|');

    const suffixes = INFLECTION_SUFFIXES[locale] ?? [];
    if (!suffixes.length) {
      // No spaces and no inflection: match the term exactly, no boundaries.
      groups.push(`(?:${alternation})`);
      continue;
    }
    const suffixPattern = [...suffixes]
      .sort((a, b) => b.length - a.length)
      .map(escapeForRegex)
      .join('|');
    groups.push(`${WORD_LEFT}(?:${alternation})(?:${suffixPattern})?${WORD_RIGHT}`);
  }
  return groups.join('|');
}

/** Built once: the alternation is large and never changes. */
const KEYWORD_PATTERN = buildKeywordPattern();

/**
 * Whole-string keyword test, derived from the same pattern as the tokenizer so
 * a token the tokenizer split out is always recognised by the styling step.
 */
export const KEYWORD_TOKEN_REGEX = new RegExp(`^(?:${KEYWORD_PATTERN})$`, 'iu');

/* ------------------------------------------------------------------ *
 * Numeric value grammar
 *
 * Every numeric highlight in a description is built from these pieces, so the
 * tokenizer (which finds values) and the validator (which decides how to style
 * a token it was handed) can never drift apart.
 * ------------------------------------------------------------------ */

/**
 * A number with an optional fractional part, accepting BOTH decimal marks.
 * Polish, German and Spanish descriptions write "3,5%" where English writes
 * "3.5%" - matching only `.` left the integer part unstyled.
 */
const NUMBER = String.raw`\d+(?:[.,]\d+)?`;

/**
 * Measurement units across all 5 supported locales.
 *
 * Inflected languages are matched by stem + `\w*` so every case ending is
 * covered ("sekundy", "sekundach", "sekundę", "metrów", "metrach", ...) rather
 * than only the two or three forms that happened to be listed by hand.
 * The bare abbreviations `m` and `s` come LAST so the full words win the
 * alternation, and a trailing `(?!\w)` stops `s` from matching inside
 * "sekund" or `m` inside "metrów".
 */
const UNITS: readonly string[] = [
  // English
  'metres?', 'meters?', 'seconds?', 'tokens?', 'charges?', 'stacks?', 'points?',
  // Polish (stem + inflection)
  'metr\\w*', 'sekund\\w*', 'ładunk\\w*', 'żeton\\w*', 'punkt\\w*',
  // German - `Sek.` / `Min.` abbreviations appear throughout the DE corpus
  'Sek\\w*', 'Min\\w*', 'Metern?', 'Aufladungen', 'Marken', 'Punkten?',
  // Spanish
  'segundos?', 'metros?', 'cargas?', 'fichas?', 'puntos?',
  // Japanese
  'メートル', '秒', 'ポイント',
  // Abbreviations - must stay last
  'm', 's',
];

const UNIT = UNITS.join('|');

/**
 * A unit, guarded so `s` cannot match inside "sekund" nor `m` inside "metrów".
 * The guard belongs to the unit alone: a `%` terminates a value by itself, and
 * demanding a non-word character after it dropped the highlight in corpus typos
 * such as "o 5%Pośpiech".
 */
const UNIT_TERM = `(?:${UNIT})(?!\\w)`;

/** `{0}` / `{1}%` interpolation placeholders emitted by the game data. */
const PLACEHOLDER = String.raw`\{[0-9]+\}%?`;
/** Per-tier values: `2/3/4%`, `10 / 15 / 20 seconds`, `+1/2/3`. */
const TIER_RANGE = String.raw`[+\-]?${NUMBER}(?:\s*\/\s*[+\-]?${NUMBER})+(?:\s*(?:%|${UNIT_TERM}))?`;
/** Explicitly signed values: `+5%`, `-0,5 s`. */
const SIGNED_VALUE = String.raw`[+\-]${NUMBER}\s*(?:%|${UNIT_TERM})`;
/**
 * Inclusive ranges written with a dash: the d20 outcome bands in Bardic
 * Inspiration ("2-10", "11-19"), tier windows, and stack ranges. A digit is
 * required on both sides so hyphenated names such as "4-Coil Spring Kit" are
 * left alone.
 */
const DASH_RANGE = String.raw`${NUMBER}\s*[-\u2013\u2014]\s*${NUMBER}(?:\s*(?:%|${UNIT_TERM}))?`;
/** Percentages: `30%`, `3,5 %`. */
const PERCENT = String.raw`${NUMBER}\s*%`;
/** Measurements: `24 m`, `30 s`, `0,1 sekundy`. */
const MEASURE = String.raw`${NUMBER}\s*${UNIT_TERM}`;

/**
 * Ordered longest-first: a tier range must be tried before a bare percentage so
 * `2/3/4%` is highlighted as one token instead of three separate numbers.
 */
const VALUE_PATTERN = [PLACEHOLDER, TIER_RANGE, DASH_RANGE, SIGNED_VALUE, PERCENT, MEASURE]
  .map((p) => `(?:${p})`)
  .join('|');

/** Keeps a value from starting mid-number (the `5` of `3,5%`). */
const VALUE_LEFT = String.raw`(?<![\d.,])`;

/**
 * Whole-string test used when styling an already-split token. Derived from the
 * same grammar as the tokenizer, so the two cannot disagree.
 */
export const VALUE_TOKEN_REGEX = new RegExp(`^(?:${VALUE_PATTERN})$`, 'i');

/**
 * Builds a dynamic regular expression to tokenize special game keywords, numeric values,
 * tier ranges, and input action buttons across English, Polish, German, Spanish, and Japanese.
 */
export function createDbdTokenRegex(highlightName?: string): RegExp {
  const escapedName = highlightName ? escapeForRegex(highlightName) : '';

  // Sort longer phrases first to prevent partial substring intercept
  const sortedButtons = [...DBD_INPUT_BUTTONS].sort((a, b) => b.length - a.length);
  const buttonsPattern = sortedButtons
    .map(escapeForRegex)
    .join('|');

  const namePart = escapedName ? `${WORD_LEFT}(?:${escapedName})${WORD_RIGHT}|` : '';

  return new RegExp(
    `(${namePart}` +
      `(?:${buttonsPattern})|` +
      `${KEYWORD_PATTERN}|` +
      `${VALUE_LEFT}(?:${VALUE_PATTERN}))`,
    'giu'
  );
}

/** Static pre-compiled token regex for high-throughput rendering */
export const TOKEN_REGEX: RegExp = createDbdTokenRegex();

/** Alias for perk token regex */
export const createPerkTokenRegex = createDbdTokenRegex;

/**
 * Parses sub-segments of plain text using tokenRegex for value, keyword, and button highlighting.
 */
function parsePlainTextSubTokens(
  text: string,
  baseKey: string,
  tokenRegex: RegExp,
  highlightName?: string
): React.ReactNode {
  const parts = text.split(tokenRegex);

  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;
        const trimmed = part.trim();

        if (highlightName && trimmed.toLowerCase() === highlightName.toLowerCase()) {
          return (
            <em
              key={`${baseKey}-h-${idx}`}
              className="italic font-bold text-slate-100 dark:text-white"
            >
              {part}
            </em>
          );
        }

        const isInputButton = DBD_INPUT_BUTTONS.some(
          (b) => b.toLowerCase() === trimmed.toLowerCase()
        );

        if (isInputButton) {
          return (
            <kbd
              key={`${baseKey}-btn-${idx}`}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-[10px] sm:text-[11px] font-mono font-bold bg-slate-800/95 border border-amber-500/50 text-amber-300 shadow-xs align-baseline whitespace-nowrap"
            >
              {part}
            </kbd>
          );
        }

        // Derived from the tokenizer's own pattern, so an inflected form the
        // tokenizer split out ("Generatoren") is recognised here as well.
        const isKeyword = KEYWORD_TOKEN_REGEX.test(trimmed);

        const isValueNumber = VALUE_TOKEN_REGEX.test(trimmed);

        if (isKeyword || isValueNumber) {
          return (
            <strong
              key={`${baseKey}-v-${idx}`}
              className="font-black text-amber-400 dark:text-amber-400 inline-block drop-shadow-xs"
            >
              {part}
            </strong>
          );
        }

        return <span key={`${baseKey}-t-${idx}`}>{part}</span>;
      })}
    </>
  );
}

/**
 * Parses a single text line into styled React tokens, handling inline HTML tags
 * (<b>, <strong>, <i>, <em>, {Input.X}) and token highlights.
 */
export function parseLineTokens(
  text: string,
  lineKey: number | string,
  tokenRegex: RegExp = TOKEN_REGEX,
  highlightName?: string
): React.ReactNode {
  const tagRegex = /(<strong\b[^>]*>.*?<\/strong>|<b>.*?<\/b>|<em\b[^>]*>.*?<\/em>|<i>.*?<\/i>|\{Input\.[a-zA-Z0-9_]+\})/gi;
  const segments = text.split(tagRegex);

  return (
    <>
      {segments.map((seg, idx) => {
        if (!seg) return null;
        const key = `${lineKey}-${idx}`;

        // 1. Bold tags <b>...</b> or <strong>...</strong>
        const boldMatch = seg.match(/^(?:<strong\b[^>]*>|<b>)(.*?)(?:<\/strong>|<\/b>)$/i);
        if (boldMatch) {
          const inner = boldMatch[1];
          return (
            <strong
              key={key}
              className="font-bold text-amber-400 dark:text-amber-400 inline-block drop-shadow-xs"
            >
              {parsePlainTextSubTokens(inner, key, tokenRegex, highlightName)}
            </strong>
          );
        }

        // 2. Italic tags <i>...</i> or <em>...</em>
        const italicMatch = seg.match(/^(?:<em\b[^>]*>|<i>)(.*?)(?:<\/em>|<\/i>)$/i);
        if (italicMatch) {
          const inner = italicMatch[1];
          return (
            <em key={key} className="italic text-slate-200">
              {parsePlainTextSubTokens(inner, key, tokenRegex, highlightName)}
            </em>
          );
        }

        // 3. Input tokens {Input.X}
        const inputMatch = seg.match(/^\{Input\.([a-zA-Z0-9_]+)\}$/i);
        if (inputMatch) {
          const tokenName = inputMatch[1].toUpperCase();
          const label = INPUT_ACTION_LABELS.en[tokenName] || inputMatch[1];
          return (
            <kbd
              key={key}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 border border-slate-600 text-amber-300 shadow-xs mx-0.5"
            >
              {label}
            </kbd>
          );
        }

        // 4. Regular text chunk. Wrapped in a keyed Fragment because this sits
        // inside segments.map() - returning a bare <> here made React warn on
        // every single description render.
        return (
          <React.Fragment key={key}>
            {parsePlainTextSubTokens(seg, key, tokenRegex, highlightName)}
          </React.Fragment>
        );
      })}
    </>
  );
}

export interface FormattedDbdTextOptions {
  isCompact?: boolean;
  highlightName?: string;
  className?: string;
  noticeLabel?: string;
}

/**
 * Universal rich Markdown and DBD description formatter for Perks, Powers, Items, and Addons.
 * Fully parses HTML tags (<ul>, <li>, <br>, <b>, <span>), markdown bullets, flavor quotes,
 * and highlights numeric/tier values and keywords across all 5 supported languages.
 */
export function renderFormattedDbdText(
  rawText: string,
  optionsOrCompact: boolean | FormattedDbdTextOptions = false
): React.ReactNode {
  if (!rawText) return null;

  const options: FormattedDbdTextOptions =
    typeof optionsOrCompact === 'boolean'
      ? { isCompact: optionsOrCompact }
      : optionsOrCompact;

  const { isCompact = false, highlightName = '', noticeLabel = 'Notice' } = options;
  const tokenRegex = highlightName ? createDbdTokenRegex(highlightName) : TOKEN_REGEX;

  // 1. Normalize HTML tags, entities, and line breaks
  let normalized = rawText
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\u00a0\u2007\u2009\u202f]/g, ' ')
    .replace(/<span\s+class=["']FlavorText["']>(.*?)<\/span>/gis, (_, p1) => {
      const trimmed = (p1 || '').trim();
      if (/^[„"“'«\u201c]/.test(trimmed)) return `\n${trimmed}\n`;
      return `\n"${trimmed}"\n`;
    })
    .replace(/<span\s+class=["']ReminderText["']>(.*?)<\/span>/gis, '\n$1\n')
    .replace(/<span\s+class=["']Highlight\d*["']>(.*?)<\/span>/gis, '$1')
    .replace(/<\/?[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*(?:\s+[^>]*)*>/gi, (tag) => {
      const lower = tag.toLowerCase();
      if (lower.startsWith('<br') || lower.startsWith('</br')) return '\n';
      if (lower.startsWith('<ul') || lower.startsWith('</ul')) return '\n';
      if (lower.startsWith('<li')) return '\n• ';
      if (lower.startsWith('</li')) return '';
      if (lower.startsWith('<p') || lower.startsWith('</p')) return '\n';
      if (/^<\/?(b|strong)>/i.test(lower)) return tag;
      if (/^<\/?(i|em)>/i.test(lower)) return tag;
      return '';
    })
    .replace(/\*""|\*"/g, '"')
    .replace(/""\*|"\*/g, '"')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/(?<=\S)\*(?=\s|$|[.,;:!?)])/g, '')
    .replace(/\*(?=[a-zA-Z0-9+%-])/g, '')
    .replace(/(?<=[a-zA-Z0-9+%-])\*/g, '')
    // A line that begins with a punctuation mark is a stray break inside a
    // sentence ("...unter Ahnungslos\n. Ahnungslos verhindert..."); rejoin it
    // so it does not render as its own paragraph starting with a full stop.
    .replace(/[^\S\r\n]*\r?\n[^\S\r\n]*([.,;:!?])/g, '$1')
    // Source data ships "50% %" / "6/8/10% %" - collapse the duplicated sign.
    .replace(/%[^\S\r\n]*%/g, '%')
    // Whitespace before punctuation, without pulling a mark onto the line above.
    .replace(/[^\S\r\n]+([.,;:!?])/g, '$1')
    // Sentence glued to the next one ("...wątrób.Zwiększa prędkość..."). An
    // inline tag is allowed between, so "...end.<b>Next</b>" is repaired too.
    .replace(/([\p{Ll}\d%)])([.!?])(<[^>]+>)?(\p{Lu})/gu, '$1$2 $3$4')
    // Runs of spaces/tabs left behind by stripped markup. Newlines are
    // preserved - they are the paragraph and bullet separators.
    .replace(/[^\S\r\n]{2,}/g, ' ')
    .trim();

  const lines = normalized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const elements: React.ReactNode[] = [];

  // Consecutive bullets are collected here and flushed as one <ul>. Previously
  // each bullet was pushed as a bare <li> with no list parent, which is invalid
  // HTML and left indentation and marker styling up to the browser.
  let bullets: React.ReactNode[] = [];
  const flushBullets = () => {
    if (!bullets.length) return;
    elements.push(
      <ul
        key={`ul-${elements.length}`}
        className={`list-disc pl-5 ${isCompact ? 'my-1 space-y-0.5' : 'my-2 space-y-1'}`}
      >
        {bullets}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((line, lineIdx) => {
    let stripped = line.replace(/^[\*\s_]+/, '').replace(/[\*\s_]+$/, '');

    // Flavor quotes format - supports English, Polish, German, Spanish, Japanese with varied punctuation/dashes
    const isQuote =
      (stripped.startsWith('"') && stripped.endsWith('"')) ||
      (stripped.startsWith('„') && (stripped.endsWith('”') || stripped.endsWith('"') || stripped.endsWith('”.') || stripped.endsWith('".'))) ||
      (stripped.startsWith('\u201c') && stripped.endsWith('\u201d')) ||
      /^[„"“'«].+?[”"“'»]\.?\s*([-\u2013\u2014–—]\s*.+)?$/s.test(stripped) ||
      (/^[„"“]/.test(stripped) &&
        (stripped.includes(' - ') ||
          stripped.includes(' – ') ||
          stripped.includes(' — ') ||
          stripped.includes('” -') ||
          stripped.includes('”. -') ||
          stripped.includes('” –') ||
          stripped.includes('”. –') ||
          stripped.includes('" -') ||
          stripped.includes('". -')));

    if (isQuote) {
      flushBullets();
      let cleanQuote = stripped;
      // Strip redundant outer quote layer if double quoted (e.g. "„..."." or ""..."")
      if (cleanQuote.startsWith('"') && cleanQuote.endsWith('"') && cleanQuote.length > 2) {
        const inner = cleanQuote.slice(1, -1).trim();
        if (/^[„"“'«\u201c]/.test(inner)) {
          cleanQuote = inner;
        }
      }
      elements.push(
        <div
          key={`q-${lineIdx}`}
          className={`rounded-2xl border-l-3 border-amber-500/90 bg-gradient-to-r from-amber-500/10 via-slate-950/80 to-transparent px-3.5 py-2.5 italic text-slate-300 dark:text-slate-300 font-serif shadow-inner ${
            isCompact ? 'my-1.5 text-[11px]' : 'my-3 text-xs sm:text-sm'
          }`}
        >
          {cleanQuote}
        </div>
      );
      return;
    }

    // Special event notices
    if (/^THIS (ITEM|ADD-ON|UNLOCKABLE) (IS|CAN) (NO LONGER|UNUSED)/i.test(line) && !isCompact) {
      flushBullets();
      elements.push(
        <div
          key={`ev-${lineIdx}`}
          className="p-3 my-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-300 flex items-start gap-2.5 shadow-sm"
        >
          <span className="shrink-0 font-mono font-bold uppercase tracking-wider text-[10px] bg-amber-500/25 px-2 py-0.5 rounded-lg text-amber-300">
            {noticeLabel}
          </span>
          <span className="leading-relaxed">{line}</span>
        </div>


      );
      return;
    }

    // Bullet points
    const isBullet =
      line.startsWith('•') ||
      line.startsWith('* ') ||
      line.startsWith('- ') ||
      /^\*\s+[A-Za-z]/.test(line);

    if (isBullet) {
      const content = line.replace(/^[•\*\-]\s*/, '');
      bullets.push(
        <li
          key={`li-${lineIdx}`}
          className={`leading-relaxed text-slate-300 marker:text-amber-400 transition-colors ${
            isCompact ? 'text-xs' : 'text-xs sm:text-sm'
          }`}
        >
          {parseLineTokens(content, lineIdx, tokenRegex, highlightName)}
        </li>
      );
      return;
    }

    // Regular paragraphs
    flushBullets();
    elements.push(
      <p
        key={`p-${lineIdx}`}
        className={`leading-relaxed text-slate-300 ${
          isCompact ? 'mb-1 text-xs' : 'mb-2.5 text-xs sm:text-sm'
        }`}
      >
        {parseLineTokens(line, lineIdx, tokenRegex, highlightName)}
      </p>
    );
  });

  flushBullets();

  return <>{elements}</>;
}
