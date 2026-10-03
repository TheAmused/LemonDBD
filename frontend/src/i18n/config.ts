// frontend/src/i18n/config.ts
export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'es', 'pl', 'de', 'ja'],
} as const;

export type Locale = (typeof i18n)['locales'][number];

/**
 * Per-locale facts that are about the *language*, not the copy -- the one place the
 * browser speech API, the Whisper model and Intl formatters get their codes from.
 * Add a locale here when you add it to `i18n.locales` (the type forces you to).
 */
export interface LocaleMeta {
  /** BCP-47 tag for Intl formatters and the Web Speech API. */
  bcp47: string;
  /** Language name Whisper's `language` option expects. */
  whisperLanguage: string;
}

export const localeMeta: Record<Locale, LocaleMeta> = {
  en: { bcp47: 'en-US', whisperLanguage: 'english' },
  es: { bcp47: 'es-ES', whisperLanguage: 'spanish' },
  pl: { bcp47: 'pl-PL', whisperLanguage: 'polish' },
  de: { bcp47: 'de-DE', whisperLanguage: 'german' },
  ja: { bcp47: 'ja-JP', whisperLanguage: 'japanese' },
};

/** Meta for any string, falling back to the default locale's. */
export function localeMetaFor(locale: string | undefined): LocaleMeta {
  return localeMeta[(locale ?? '') as Locale] ?? localeMeta[i18n.defaultLocale];
}
