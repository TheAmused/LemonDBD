// frontend/src/app/[locale]/about/page.tsx
import React from 'react';
import { pageMetadata } from '@/i18n/metadata';
import { PageShell } from '@/components/layout/PageShell';
import { AboutClient } from '@/components/about/AboutClient';
import { Locale } from '@/i18n/config';

export const generateMetadata = pageMetadata('/about', (d) => ({ title: d.about.pageTitle }));

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  return (
    <PageShell
      locale={locale}
      padding="spacious"
      mainClassName="flex flex-col items-center justify-center min-h-screen-nav lg:min-h-screen overflow-y-auto relative"
    >
      <AboutClient />
    </PageShell>
  );
}
