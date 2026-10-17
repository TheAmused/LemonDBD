// frontend/src/locales/adminSettings.ts
//
// The admin Settings tab has its own dictionary: ~160 labels and hints per language that only an
// administrator ever reads. It is NOT part of the public `Dictionary`; each language is a separate
// chunk fetched on demand by hooks/useAdminSettingsDict.
import type en from './en/adminSettings';
import type { Locale } from './types';

export type AdminSettingsDict = { readonly [K in keyof typeof en]: string };

export const ADMIN_SETTINGS_LOADERS: Record<Locale, () => Promise<{ default: AdminSettingsDict }>> = {
  en: () => import('./en/adminSettings'),
  pl: () => import('./pl/adminSettings'),
  de: () => import('./de/adminSettings'),
  es: () => import('./es/adminSettings'),
  ja: () => import('./ja/adminSettings'),
};
