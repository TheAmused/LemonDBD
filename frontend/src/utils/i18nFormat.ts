// frontend/src/utils/i18nFormat.ts
//
// The one way to fill a dictionary template. Replaces the ~90 hand-rolled
// `.replace('{count}', ...)` chains and adds real plural support.
//
//   formatMessage('Hello {name}', { name: 'Ada' })
//   formatMessage('{count, plural, one {# attempt} other {# attempts}} left', { count: 3 }, 'en')
//
// Plural syntax is the ICU subset translators already know:
//   {var, plural, one {...} few {...} many {...} other {...}}
// `#` inside a branch is the number (formatted for the locale), `=0 {...}` / `=1 {...}`
// match an exact value, and `other` is the required fallback. Which keyword a number
// gets comes from Intl.PluralRules(locale): English/German/Spanish have one/other,
// Polish has one/few/many/other, Japanese has only other.

export type FormatValues = Record<string, string | number | undefined | null>;

const PLURAL_RULES = new Map<string, Intl.PluralRules>();

function pluralCategory(locale: string, n: number): Intl.LDMLPluralRule {
  let rules = PLURAL_RULES.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    PLURAL_RULES.set(locale, rules);
  }
  return rules.select(n);
}

/** Index of the `}` that closes the `{` at `open`, or -1. */
function matchingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

/** Parses `one {...} other {...}` into keyword -> body. */
function parseBranches(body: string): Map<string, string> {
  const branches = new Map<string, string>();
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i])) i++;
    const start = i;
    while (i < body.length && !/[\s{]/.test(body[i])) i++;
    const keyword = body.slice(start, i);
    while (i < body.length && /\s/.test(body[i])) i++;
    if (!keyword || body[i] !== '{') break;
    const close = matchingBrace(body, i);
    if (close === -1) break;
    branches.set(keyword, body.slice(i + 1, close));
    i = close + 1;
  }
  return branches;
}

function formatNumber(n: number, locale: string): string {
  return Number.isInteger(n) ? n.toLocaleString(locale) : String(n);
}

export function formatMessage(
  template: string | undefined | null,
  values: FormatValues = {},
  locale: string = 'en'
): string {
  if (!template) return '';
  let out = '';
  let i = 0;
  while (i < template.length) {
    const ch = template[i];
    if (ch !== '{') {
      out += ch;
      i++;
      continue;
    }
    const close = matchingBrace(template, i);
    if (close === -1) {
      out += template.slice(i);
      break;
    }
    const inner = template.slice(i + 1, close);
    const plural = /^\s*([a-zA-Z_][\w]*)\s*,\s*plural\s*,([\s\S]*)$/.exec(inner);
    if (plural) {
      const raw = values[plural[1]];
      const n = typeof raw === 'number' ? raw : Number(raw);
      const branches = parseBranches(plural[2]);
      const chosen =
        branches.get(`=${n}`) ?? branches.get(pluralCategory(locale, Number.isFinite(n) ? n : 0)) ?? branches.get('other') ?? '';
      out += formatMessage(chosen.replace(/#/g, formatNumber(Number.isFinite(n) ? n : 0, locale)), values, locale);
    } else if (/^[a-zA-Z_][\w]*$/.test(inner) && inner in values && values[inner] != null) {
      out += String(values[inner]);
    } else {
      // Unknown placeholder: leave it visible instead of silently dropping it.
      out += template.slice(i, close + 1);
    }
    i = close + 1;
  }
  return out;
}

/**
 * Variable names a template uses (plain `{name}` and plural variables, including those
 * inside plural branches), sorted and de-duplicated. Translations must agree on this set.
 */
export function placeholderNames(template: string | undefined | null): string[] {
  const names = new Set<string>();
  const walk = (text: string) => {
    let i = 0;
    while (i < text.length) {
      if (text[i] !== '{') {
        i++;
        continue;
      }
      const close = matchingBrace(text, i);
      if (close === -1) return;
      const inner = text.slice(i + 1, close);
      const plural = /^\s*([a-zA-Z_][\w]*)\s*,\s*plural\s*,([\s\S]*)$/.exec(inner);
      if (plural) {
        names.add(plural[1]);
        for (const body of parseBranches(plural[2]).values()) walk(body);
      } else if (/^[a-zA-Z_][\w]*$/.test(inner)) {
        names.add(inner);
      }
      i = close + 1;
    }
  };
  walk(template ?? '');
  return [...names].sort();
}
