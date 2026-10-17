import { Suspense } from 'react';
import { pageMetadata } from '@/i18n/metadata';
import { PageShell } from '@/components/layout/PageShell';
import { TierListCreator, TierListSkeleton } from '@/features/tier-lists';
import type { Locale } from '@/i18n/config';

export const generateMetadata = pageMetadata('/tier-lists', (d) => ({
  title: d.tierLists.pageTitle,
  description: d.tierLists.metaDescription,
}));

export default async function NewTierListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ edit?: string; official?: string }>;
}) {
  const { locale } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const editId = sp?.edit;
  const officialSlug = sp?.official;

  return (
    <PageShell
      locale={locale}
      activeCategory="tier-lists"
      padding="tight"
      mainClassName="relative flex flex-col"
    >
      <Suspense fallback={<TierListSkeleton />}>
        <TierListCreator locale={locale} editId={editId} officialSlug={officialSlug} />
      </Suspense>
    </PageShell>
  );
}
