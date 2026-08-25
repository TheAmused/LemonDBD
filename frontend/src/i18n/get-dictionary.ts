// frontend/src/i18n/get-dictionary.ts
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