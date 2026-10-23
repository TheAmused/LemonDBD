import { notFound } from 'next/navigation';
import { pageMetadata, withSegment } from '@/i18n/metadata';
import { OfficialTierListView } from '@/features/tier-lists';
import type { Locale } from '@/i18n/config';
import { safeDecodeParam } from '@/utils/safeDecodeParam';

export const generateMetadata = pageMetadata((p) => withSegment('/tier-lists', p.slug), (d) => ({
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
    <OfficialTierListView key={slug} slug={decodedSlug} locale={locale} />
  );
}
