// frontend/src/app/[locale]/tier-lists/layout.tsx
import type { Metadata } from 'next';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const title = dict.tierLists.pageTitle;
  const description = dict.tierLists.metaDescription;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default function TierListsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
