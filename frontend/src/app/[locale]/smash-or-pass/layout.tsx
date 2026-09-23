// frontend/src/app/[locale]/smash-or-pass/layout.tsx
import type { Metadata } from 'next';
import { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const rawSmash = dict?.smashOrPass;

  const title = dict?.app?.smashOrPassPageTitle || 'LemonDBD - Smash or Pass | Dead by Daylight Romance';
  const description = rawSmash?.subtitle || 'Rate Dead by Daylight survivors and killers!';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function SmashOrPassLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
