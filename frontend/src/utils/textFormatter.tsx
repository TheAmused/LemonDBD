// frontend/src/utils/textFormatter.tsx
import React from 'react';

/**
 * Single source of truth for Dead by Daylight keywords across all 5 supported languages:
 * English (EN), Polish (PL), German (DE), Spanish (ES), and Japanese (JA).
 */
export const DBD_KEYWORDS: readonly string[] = [
  // --- English (EN) ---
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
  'Special Ability',
  'Special Attack',
  'Lunge',
  'Lullaby',

  // --- Polish (PL) ---
  'Zwiększa',
  'Zmniejsza',
  'Ujawnia',
  'Odblokowuje',
  'Nakłada',
  'Aktywuje',
  'Pośpiech',
  'Pośpiechu',
  'Spowolnienie',
  'Narażenie',
  'Wyczerpanie',
  'Wyczerpany',
  'Oślepienie',
  'Okaleczenie',
  'Nieświadomość',
  'Niewykrywalność',
  'Obezwładnienie',
  'Głęboka Rana',
  'Głębokiej Rany',
  'Krwotok',
  'Wytrzymałość',
  'Żądza Krwi',
  'Zasięg Terroru',
  'Zasięgu Terroru',
  'Instynkt Zabójcy',
  'Czytanie Aur',
  'Aura',
  'Aury',
  'Aurę',
  'Aury Zabójcy',
  'Obsesja',
  'Obsesję',
  'Klątwa:',
  'Klątwa',
  'Dar:',
  'Dar',
  'Hak Plagi:',
  'Hak Plagi',
  'Test Umiejętności',
  'Testy Umiejętności',
  'Pułapka na Niedźwiedzie',
  'Pułapki na Niedźwiedzie',
  'Stan Konania',
  'Stan Ranny',
  'Stan Zdrowy',
  'Generator',
  'Generatory',
  'Paleta',
  'Palety',
  'Skrzynia',
  'Skrzynie',
  'Totem',
  'Totemy',

  // --- German (DE) ---
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

  // --- Spanish (ES) ---
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

  // --- Japanese (JA) ---
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
];

/** Alias for backwards compatibility */
export const ACTION_KEYWORDS = DBD_KEYWORDS;

/**
 * Builds a dynamic regular expression to tokenize special game keywords, numeric values,
 * and tier ranges across English, Polish, German, Spanish, and Japanese.
 */
export function createDbdTokenRegex(highlightName?: string): RegExp {
  const escapedName = highlightName ? highlightName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  const keywordsPattern = DBD_KEYWORDS.map((k) =>
    k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|');

  const namePart = escapedName ? `\\b(?:${escapedName})\\b|` : '';

  return new RegExp(
    `(${namePart}` +
      `\\b(?:${keywordsPattern})\\b|` +
      `\\{[0-9]+\\}%?|` +
      `\\+?\\-?\\d+(?:\\.\\d+)?(?:\\s*\\/\\s*\\d+(?:\\.\\d+)?)+(?:\\s*%)?|` +
      `\\+\\d+(?:\\.\\d+)?\\s*(?:metres?|meters?|m\\b|%|seconds?|s\\b|tokens?|charges?|metrów|metry|sekund|sekundy|Sekunden|segundos|メートル|秒)|` +
      `\\b\\d+(?:\\.\\d+)?\\s*%|` +
      `\\b\\d+(?:\\.\\d+)?\\s*(?:metres?|meters?|seconds?|tokens?|metrów|metry|sekund|sekundy|Sekunden|segundos|メートル|秒)\\b)`,
    'gi'
  );
}

/** Static pre-compiled token regex for high-throughput rendering */
export const TOKEN_REGEX: RegExp = createDbdTokenRegex();

/** Alias for perk token regex */
export const createPerkTokenRegex = createDbdTokenRegex;

/**
 * Parses a single text line into styled React tokens (values, keywords, names, and regular text).
 */
export function parseLineTokens(
  text: string,
  lineKey: number | string,
  tokenRegex: RegExp = TOKEN_REGEX,
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
              key={`${lineKey}-${idx}`}
              className="italic font-bold text-slate-100 dark:text-white"
            >
              {part}
            </em>
          );
        }

        const isKeyword = DBD_KEYWORDS.some(
          (k) => k.toLowerCase() === trimmed.toLowerCase()
        );

        const isValueNumber =
          /^\{[0-9]+\}%?$/.test(trimmed) ||
          /^\+?\-?\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)+(?:\s*%)?$/.test(trimmed) ||
          /^\+\d+(?:\.\d+)?\s*(?:metres?|meters?|m|%|seconds?|s|tokens?|charges?|metrów|metry|sekund|sekundy|Sekunden|segundos|メートル|秒)$/i.test(
            trimmed
          ) ||
          /^\d+(?:\.\d+)?\s*%$/.test(trimmed) ||
          /^\d+(?:\.\d+)?\s*(?:metres?|meters?|seconds?|tokens?|metrów|metry|sekund|sekundy|Sekunden|segundos|メートル|秒)$/i.test(
            trimmed
          );

        if (isKeyword || isValueNumber) {
          return (
            <strong
              key={`${lineKey}-${idx}`}
              className="font-black text-amber-400 dark:text-amber-400 inline-block drop-shadow-xs"
            >
              {part}
            </strong>
          );
        }

        return <span key={`${lineKey}-${idx}`}>{part}</span>;
      })}
    </>
  );
}

export interface FormattedDbdTextOptions {
  isCompact?: boolean;
  highlightName?: string;
  className?: string;
}

/**
 * Universal rich Markdown and DBD description formatter for Perks, Powers, Items, and Addons.
 * Fully responsive across Mobile and Desktop with polished typography, styled quotes,
 * tier values, and list bullets.
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

  const { isCompact = false, highlightName = '' } = options;
  const tokenRegex = highlightName ? createDbdTokenRegex(highlightName) : TOKEN_REGEX;

  // Clean raw HTML, quotes, and wiki markdown syntax
  const cleaned = rawText
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\*""|\*"/g, '"')
    .replace(/""\*|"\*/g, '"')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/(?<=\S)\*(?=\s|$|[.,;:!?)])/g, '')
    .replace(/\*(?=[a-zA-Z0-9+%-])/g, '')
    .replace(/(?<=[a-zA-Z0-9+%-])\*/g, '')
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();

  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    const stripped = line.replace(/^[\*\s_]+/, '').replace(/[\*\s_]+$/, '');

    // Flavor quotes format
    const isQuote =
      (stripped.startsWith('"') && stripped.endsWith('"')) ||
      (stripped.startsWith('\u201c') && stripped.endsWith('\u201d')) ||
      (stripped.startsWith('"') && stripped.includes('" -')) ||
      (stripped.startsWith('\u201c') && stripped.includes('\u201d -')) ||
      (stripped.startsWith('"') && stripped.includes('"-')) ||
      (stripped.startsWith('\u201c') && stripped.includes('”-')) ||
      /^["\u201c].+["\u201d](\s*[-\u2013\u2014].+)?$/.test(stripped);

    if (isQuote) {
      elements.push(
        <div
          key={`q-${lineIdx}`}
          className={`rounded-2xl border-l-3 border-amber-500/90 bg-gradient-to-r from-amber-500/10 via-slate-950/80 to-transparent px-3.5 py-2.5 italic text-slate-300 dark:text-slate-300 font-serif shadow-inner ${
            isCompact ? 'my-1.5 text-[11px]' : 'my-3 text-xs sm:text-sm'
          }`}
        >
          {stripped}
        </div>
      );
      return;
    }

    // Special event notices
    if (/^THIS (ITEM|ADD-ON|UNLOCKABLE) (IS|CAN) (NO LONGER|UNUSED)/i.test(line) && !isCompact) {
      elements.push(
        <div
          key={`ev-${lineIdx}`}
          className="p-3 my-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-300 flex items-start gap-2.5 shadow-sm"
        >
          <span className="shrink-0 font-mono font-bold uppercase tracking-wider text-[10px] bg-amber-500/25 px-2 py-0.5 rounded-lg text-amber-300">
            Notice
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
      elements.push(
        <li
          key={`li-${lineIdx}`}
          className={`ml-5 list-disc leading-relaxed text-slate-300 marker:text-amber-400 transition-colors ${
            isCompact ? 'my-0.5 text-xs' : 'my-1.5 text-xs sm:text-sm'
          }`}
        >
          {parseLineTokens(content, lineIdx, tokenRegex, highlightName)}
        </li>
      );
      return;
    }

    // Regular paragraphs
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

  return <>{elements}</>;
}
