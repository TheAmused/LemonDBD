# Modular TypeScript Part-Translations Architecture Design

**Date:** 2026-08-25  
**Topic:** Modular Part-Translations in TypeScript (.ts)  
**Status:** Approved  

---

## 1. Context & Motivation

Currently, the LemonDBD frontend maintains 5 monolithic JSON translation files in frontend/src/locales/ (en.json, pl.json, es.json, de.json, ja.json). Each file combines distinct application domains (perks, guesser, smash-or-pass, voice controls, sidebar, admin, generator, stats, filters, etc.) into a single large JSON object.

### Drawbacks of the Monolithic JSON System:
1. **Merge Conflicts & Maintenance Difficulty:** Editing feature copy (e.g., adding keys for Smash or Pass) requires modifying large central JSON files.
2. **Lack of Type Safety:** Raw .json files lack compile-time schema validation. Missing keys in Polish or Spanish fail silently at runtime rather than throwing compile-time TypeScript errors.
3. **No Code Reuse / Typed Autocompletion:** TypeScript files provide IDE autocompletion and strict type checking.

---

## 2. Proposed Architecture

Decompose translation files into **modular per-locale part-translation TypeScript files** under frontend/src/locales/<locale>/:

`
frontend/src/locales/
├── types.ts                    # Root schema and dictionary TypeScript interfaces
├── en/                         # English (Baseline Source of Truth)
│   ├── app.ts
│   ├── landing.ts
│   ├── generator.ts
│   ├── stats.ts
│   ├── filters.ts
│   ├── pagination.ts
│   ├── card.ts
│   ├── modal.ts
│   ├── empty.ts
│   ├── guesser.ts
│   ├── voice.ts
│   ├── characterDetail.ts
│   ├── sidebar.ts
│   ├── smashOrPass.ts
│   └── index.ts                # Aggregates modules into export default en;
├── pl/                         # Polish (Strictly typed as Dictionary)
│   ├── ... (same namespaces)
│   └── index.ts
├── es/                         # Spanish
├── de/                         # German
├── ja/                         # Japanese
└── index.ts                    # Re-exports locales and dictionary getter
`

---

## 3. Component Details & Type Safety

### 3.1 Strict Schema Typing (frontend/src/locales/types.ts)
`	s
import type en from './en';

export type Dictionary = typeof en;
export type LocaleNamespace = keyof Dictionary;
`

Each non-English locale dictionary (pl/index.ts, es/index.ts, de/index.ts, ja/index.ts) is typed as:
`	s
import type { Dictionary } from '../types';

const pl: Dictionary = { ... };
export default pl;
`

### 3.2 Dynamic Import in get-dictionary.ts
`	s
import type { Locale } from './config';
import type { Dictionary } from '../locales/types';

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('../locales/en').then((module) => module.default),
  es: () => import('../locales/es').then((module) => module.default),
  pl: () => import('../locales/pl').then((module) => module.default),
  de: () => import('../locales/de').then((module) => module.default),
  ja: () => import('../locales/ja').then((module) => module.default),
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  return dictionaries[locale] ? dictionaries[locale]() : dictionaries.en();
};
`

---

## 4. Verification Plan

- **Automated Tests:**
  - npm test in frontend/ (all unit tests pass).
  - npm run build in frontend/ (production build passes).
- **Type Checking:**
  - npx tsc --noEmit returns 0 errors.
