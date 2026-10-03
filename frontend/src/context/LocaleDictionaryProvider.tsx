'use client';
// frontend/src/context/LocaleDictionaryProvider.tsx
//
// Delivers the active locale's dictionary WITHOUT embedding it in every page's HTML.
//
// Before, app/[locale]/layout.tsx awaited getDictionary() and passed the whole object
// to a client component as a prop. React serialises props into the page's flight data,
// so each prerendered HTML file carried ~100 KB+ of dictionary (about 80-90% of the
// payload) and it was re-sent on every full load.
//
// Now the layout passes only the locale string. Each locale is its own client module
// (context/dictionaries/<locale>.tsx) loaded through next/dynamic, so:
//   - the dictionary is a separate content-hashed chunk under /_next/static/ that Next
//     serves `immutable` -- downloaded once per locale, then served from cache until the
//     content changes;
//   - it is still rendered on the server (ssr default), so pages paint real text on the
//     first frame, and Next emits a preload for the chunk so hydration is not delayed;
//   - only the active locale's chunk is ever requested.
// Server-only code (generateMetadata) keeps using getDictionary().

import React from 'react';
import dynamic from 'next/dynamic';
import type { Locale } from '@/i18n/config';

type LocaleProvider = React.ComponentType<{ children: React.ReactNode }>;

const providers: Record<Locale, LocaleProvider> = {
  en: dynamic(() => import('@/context/dictionaries/en')),
  es: dynamic(() => import('@/context/dictionaries/es')),
  pl: dynamic(() => import('@/context/dictionaries/pl')),
  de: dynamic(() => import('@/context/dictionaries/de')),
  ja: dynamic(() => import('@/context/dictionaries/ja')),
};

export function LocaleDictionaryProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const Provider = providers[locale];
  return <Provider>{children}</Provider>;
}
