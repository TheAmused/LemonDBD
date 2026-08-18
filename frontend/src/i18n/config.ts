export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'es', 'pl', 'de', 'ja'],
} as const;

export type Locale = (typeof i18n)['locales'][number];