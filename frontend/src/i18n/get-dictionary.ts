import type { Locale } from './config';

const dictionaries = {
  en: () => import('../locales/en.json').then((module) => module.default),
  es: () => import('../locales/es.json').then((module) => module.default),
  pl: () => import('../locales/pl.json').then((module) => module.default),
  de: () => import('../locales/de.json').then((module) => module.default),
  ja: () => import('../locales/ja.json').then((module) => module.default),
};

export const getDictionary = async (locale: Locale) => {
  return dictionaries[locale] ? dictionaries[locale]() : dictionaries.en();
};