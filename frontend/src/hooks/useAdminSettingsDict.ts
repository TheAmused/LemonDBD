'use client';
// frontend/src/hooks/useAdminSettingsDict.ts
//
// Loads the admin Settings dictionary for the active locale (see locales/adminSettings.ts). Returns
// null until the chunk arrives; a language is fetched once and then served from memory.
import { useEffect, useState } from 'react';
import { useLocale } from '@/context/DictionaryContext';
import { ADMIN_SETTINGS_LOADERS, type AdminSettingsDict } from '@/locales/adminSettings';
import type { Locale } from '@/i18n/config';

const loaded = new Map<Locale, AdminSettingsDict>();

export function useAdminSettingsDict(): AdminSettingsDict | null {
  const locale = useLocale();
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (loaded.has(locale)) return;
    let cancelled = false;
    ADMIN_SETTINGS_LOADERS[locale]()
      .then((module) => {
        loaded.set(locale, module.default);
        if (!cancelled) setVersion((v) => v + 1);
      })
      .catch(() => undefined); // a failed chunk keeps the loading state; the next visit retries
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return loaded.get(locale) ?? null;
}
