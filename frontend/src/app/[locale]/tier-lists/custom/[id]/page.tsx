import { notFound } from 'next/navigation';
import { pageMetadata } from '@/i18n/metadata';
import { PageShell } from '@/components/layout/PageShell';
import { CustomTierListView } from '@/features/tier-lists';
import type { Locale } from '@/i18n/config';
import { safeDecodeParam } from '@/utils/safeDecodeParam';

export const generateMetadata = pageMetadata('/tier-lists', (d) => ({
  title: d.tierLists.pageTitle,
  description: d.tierLists.metaDescription,
}));

export default async function CustomTierListPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  const decodedId = safeDecodeParam(id);
  if (decodedId === null) notFound();

  return (
    <PageShell
      locale={locale}
      activeCategory="tier-lists"
      padding="tight"
      mainClassName="relative flex flex-col"
    >
      <CustomTierListView key={id} id={decodedId} locale={locale} />
    </PageShell>
  );
}
