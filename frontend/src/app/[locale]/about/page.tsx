// frontend/src/app/[locale]/about/page.tsx
import React from 'react';
import { pageMetadata } from '@/i18n/metadata';
import { AboutClient } from '@/components/about/AboutClient';

export const generateMetadata = pageMetadata('/about', (d) => ({ title: d.about.pageTitle }));

export default function AboutPage() {
  return <AboutClient />;
}
