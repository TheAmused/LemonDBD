// frontend/src/i18n/errorPageCopy.ts
//
// The error-page strings for every locale, without the rest of the dictionary. Only
// app/global-error.tsx needs this: it replaces the root layout when that layout crashes, so the
// dictionary provider is not there to ask.
//
// global-error.tsx is part of every route's client bundle, so only English ships with it; another
// locale's strings are fetched when that error page actually shows (English until they arrive).
import en from '../locales/en/errorPages';
import type es from '../locales/es/errorPages';
import type pl from '../locales/pl/errorPages';
import type de from '../locales/de/errorPages';
import type ja from '../locales/ja/errorPages';
import { i18n, type Locale } from './config';

export type ErrorPageCopy = typeof en | typeof es | typeof pl | typeof de | typeof ja;

export const DEFAULT_ERROR_PAGE_COPY: ErrorPageCopy = en;

const LOADERS: Record<Locale, () => Promise<{ default: ErrorPageCopy }>> = {
  en: async () => ({ default: en }),
  es: () => import('../locales/es/errorPages'),
  pl: () => import('../locales/pl/errorPages'),
  de: () => import('../locales/de/errorPages'),
  ja: () => import('../locales/ja/errorPages'),
};

/** The locale of a path such as `/pl/perks` (the default locale when there is none). */
export function localeOfPath(pathname: string): Locale {
  const prefix = pathname.split('/')[1];
  return (i18n.locales as readonly string[]).includes(prefix) ? (prefix as Locale) : i18n.defaultLocale;
}

/** The error-page strings of `locale` (English if they cannot be loaded). */
export async function loadErrorPageCopy(locale: Locale): Promise<ErrorPageCopy> {
  try {
    return (await LOADERS[locale]()).default;
  } catch {
    return en;
  }
}
