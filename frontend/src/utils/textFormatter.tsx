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

/**
 * Builds a dynamic regular expression to tokenize special game keywords, numeric values,
 * tier ranges, and input action buttons across English, Polish, German, Spanish, and Japanese.
 */
export function createDbdTokenRegex(highlightName?: string): RegExp {
  const escapedName = highlightName ? highlightName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  
  // Sort longer phrases first to prevent partial substring intercept
  const sortedButtons = [...DBD_INPUT_BUTTONS].sort((a, b) => b.length - a.length);
  const buttonsPattern = sortedButtons
    .map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const sortedKeywords = [...DBD_KEYWORDS].sort((a, b) => b.length - a.length);
  const keywordsPattern = sortedKeywords
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const namePart = escapedName ? `\\b(?:${escapedName})\\b|` : '';

  return new RegExp(
    `(${namePart}` +
      `(?:${buttonsPattern})|` +
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

        // 4. Regular text chunk
        return parsePlainTextSubTokens(seg, key, tokenRegex, highlightName);
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

  const { isCompact = false, highlightName = '' } = options;
  const tokenRegex = highlightName ? createDbdTokenRegex(highlightName) : TOKEN_REGEX;

  // 1. Normalize HTML tags, entities, and line breaks
  let normalized = rawText
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/<span\s+class=["']FlavorText["']>(.*?)<\/span>/gis, '\n"$1"\n')
    .replace(/<span\s+class=["']ReminderText["']>(.*?)<\/span>/gis, '\n$1\n')
    .replace(/<span\s+class=["']Highlight\d*["']>(.*?)<\/span>/gis, '$1')
    .replace(/<\/?[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*(?:\s+[^>]*)*>/gi, (tag) => {
      const lower = tag.toLowerCase();
      if (lower.startsWith('<br') || lower.startsWith('</br')) return '\n';
      if (lower.startsWith('<ul') || lower.startsWith('</ul')) return '\n';
      if (lower.startsWith('<li')) return '\n• ';
      if (lower.startsWith('</li')) return '';
      if (lower.startsWith('<p') || lower.startsWith('</p')) return '\n';
      if (lower.startsWith('<div') || lower.startsWith('</div')) return '\n';
      if (lower.startsWith('<b>') || lower.startsWith('</b>') || lower.startsWith('<strong>') || lower.startsWith('</strong>')) return tag;
      if (lower.startsWith('<i>') || lower.startsWith('</i>') || lower.startsWith('<em>') || lower.startsWith('</em>')) return tag;
      return '';
    })
    .replace(/\*""|\*"/g, '"')
    .replace(/""\*|"\*/g, '"')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/(?<=\S)\*(?=\s|$|[.,;:!?)])/g, '')
    .replace(/\*(?=[a-zA-Z0-9+%-])/g, '')
    .replace(/(?<=[a-zA-Z0-9+%-])\*/g, '')
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();

  const lines = normalized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    const stripped = line.replace(/^[\*\s_]+/, '').replace(/[\*\s_]+$/, '');

    // Flavor quotes format - supports English, Polish, German, Spanish, Japanese with varied punctuation/dashes
    const isQuote =
      (stripped.startsWith('"') && stripped.endsWith('"')) ||
      (stripped.startsWith('„') && (stripped.endsWith('”') || stripped.endsWith('"'))) ||
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
