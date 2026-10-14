// frontend/src/app/[locale]/terms-of-service/page.tsx
import React from 'react';
import { pageMetadata } from '@/i18n/metadata';
import { LegalDocPage } from '@/components/legal/LegalDocPage';

export const generateMetadata = pageMetadata('/terms-of-service', (d) => ({ title: d.terms.pageTitle, description: d.terms.tagline }));

export default function TermsOfServicePage() {
  return <LegalDocPage doc="terms" />;
}
