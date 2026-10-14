// frontend/src/app/[locale]/rules/page.tsx
import React from 'react';
import { pageMetadata } from '@/i18n/metadata';
import { LegalDocPage } from '@/components/legal/LegalDocPage';

export const generateMetadata = pageMetadata('/rules', (d) => ({ title: d.rules.pageTitle, description: d.rules.tagline }));

export default function RulesPage() {
  return <LegalDocPage doc="rules" />;
}
