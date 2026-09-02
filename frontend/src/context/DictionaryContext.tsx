// frontend/src/context/DictionaryContext.tsx
'use client';

import React, { createContext, useContext } from 'react';
import type { Dictionary } from '@/locales/types';
import type { Locale } from '@/i18n/config';

interface DictionaryContextValue {
  dict: Dictionary;
  locale: Locale;
}

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

/**
 * Provides the locale dictionary to the whole `[locale]` subtree.
 *
 * The dictionary is resolved on the server in `app/[locale]/layout.tsx` and
 * handed down as a prop, so pages read it *synchronously* on their first
 * render. Previously every page did `getDictionary(locale)` inside a
 * `useEffect` and rendered a spinner until it resolved -- which is why each
 * navigation showed a second spinner right after the route-level `loading.tsx`
 * one. That dynamic import pulled the entire ~120KB locale bundle (all 25
 * namespaces) before any content could paint, on every single page.
 *
 * Because this lives in the layout, it survives client-side navigation between
 * sibling routes: the dictionary is fetched once per locale, not once per page.
 */
export const DictionaryProvider: React.FC<{
  dict: Dictionary;
  locale: Locale;
  children: React.ReactNode;
}> = ({ dict, locale, children }) => {
  // `dict` and `locale` are stable for the lifetime of the layout instance, so
  // the object identity below only changes when the locale actually changes.
  const value = React.useMemo(() => ({ dict, locale }), [dict, locale]);

  return <DictionaryContext value={value}>{children}</DictionaryContext>;
};

/** Returns the current locale dictionary. Never null inside `[locale]`. */
export function useDictionary(): Dictionary {
  const ctx = useContext(DictionaryContext);
  if (!ctx) {
    throw new Error('useDictionary must be used within a DictionaryProvider');
  }
  return ctx.dict;
}

/** Returns the validated active locale. */
export function useLocale(): Locale {
  const ctx = useContext(DictionaryContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a DictionaryProvider');
  }
  return ctx.locale;
}
