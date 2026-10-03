'use client';
// frontend/src/context/dictionaries/es.tsx
// One tiny client module per locale. LocaleDictionaryProvider loads it with
// next/dynamic, so this locale's dictionary becomes its own hashed JS chunk.
import React from 'react';
import dict from '@/locales/es';
import { DictionaryProvider } from '@/context/DictionaryContext';

export default function Dictionary_es({ children }: { children: React.ReactNode }) {
  return (
    <DictionaryProvider dict={dict} locale="es">
      {children}
    </DictionaryProvider>
  );
}
