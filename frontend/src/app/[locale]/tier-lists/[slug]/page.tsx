import { notFound } from 'next/navigation';
import { pageMetadata } from '@/i18n/metadata';
import { PageShell } from '@/components/layout/PageShell';
import { OfficialTierListView } from '@/features/tier-lists';
import type { Locale } from '@/i18n/config';
import { safeDecodeParam } from '@/utils/safeDecodeParam';

export const generateMetadata = pageMetadata('/tier-lists', (d) => ({
  title: d.tierLists.pageTitle,
  description: d.tierLists.metaDescription,
}));

export default async function OfficialTierListPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const decodedSlug = safeDecodeParam(slug);
  if (decodedSlug === null) notFound();

  return (
    <PageShell
      locale={locale}
      activeCategory="tier-lists"
      padding="tight"
      mainClassName="relative flex flex-col"
    >
      <OfficialTierListView key={slug} slug={decodedSlug} locale={locale} />
    </PageShell>
  );
}
