'use client';
// frontend/src/context/dictionaries/ja.tsx
// One tiny client module per locale. LocaleDictionaryProvider loads it with
// next/dynamic, so this locale's dictionary becomes its own hashed JS chunk.
import React from 'react';
import dict from '@/locales/ja';
import { DictionaryProvider } from '@/context/DictionaryContext';

export default function Dictionary_ja({ children }: { children: React.ReactNode }) {
  return (
    <DictionaryProvider dict={dict} locale="ja">
      {children}
    </DictionaryProvider>
  );
}
