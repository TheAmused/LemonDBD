// frontend/src/i18n/errorPageCopy.ts
//
// The error-page strings for every locale, without the rest of the dictionary. Only
// app/global-error.tsx needs this: it replaces the root layout when that layout crashes, so the
// dictionary provider is not there to ask.
import en from '../locales/en/errorPages';
import es from '../locales/es/errorPages';
import pl from '../locales/pl/errorPages';
import de from '../locales/de/errorPages';
import ja from '../locales/ja/errorPages';
import { i18n, type Locale } from './config';

const ERROR_PAGE_COPY = { en, es, pl, de, ja } as const;

export type ErrorPageCopy = (typeof ERROR_PAGE_COPY)[Locale];

/** The locale of a path such as `/pl/perks` (the default locale when there is none). */
export function localeOfPath(pathname: string): Locale {
  const prefix = pathname.split('/')[1];
  return (i18n.locales as readonly string[]).includes(prefix) ? (prefix as Locale) : i18n.defaultLocale;
}

export function errorPageCopy(locale: Locale): ErrorPageCopy {
  return ERROR_PAGE_COPY[locale];
}
