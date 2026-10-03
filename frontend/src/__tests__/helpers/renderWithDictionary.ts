// frontend/src/__tests__/helpers/renderWithDictionary.ts
//
// Renders a component to static markup inside the real DictionaryProvider, the way
// `[locale]/layout.tsx` does in production. Components read their copy with
// `useDictionary()`, so tests no longer pass a `dict` prop; they pick a locale (or
// override a few keys) here instead.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DictionaryProvider } from '@/context/DictionaryContext';
import type { Dictionary } from '@/locales/types';
import type { Locale } from '@/i18n/config';
import enDict from '@/locales/en';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function merge<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (!patch) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    const current = out[key];
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value) && current && typeof current === 'object'
        ? merge(current, value as DeepPartial<typeof current>)
        : value;
  }
  return out as T;
}

export interface RenderWithDictionaryOptions {
  /** Full dictionary for the locale under test; defaults to English. */
  dict?: Dictionary;
  locale?: Locale;
  /** Keys to override on top of `dict` (deep-merged). */
  overrides?: DeepPartial<Dictionary>;
}

export function renderWithDictionary(element: React.ReactElement, options: RenderWithDictionaryOptions = {}): string {
  const { dict = enDict as Dictionary, locale = 'en', overrides } = options;
  return renderToStaticMarkup(
    React.createElement(DictionaryProvider, { dict: merge(dict, overrides), locale, children: element })
  );
}
