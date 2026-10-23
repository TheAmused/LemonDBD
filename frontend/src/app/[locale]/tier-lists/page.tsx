import { pageMetadata } from '@/i18n/metadata';
import { TierListHub } from '@/features/tier-lists';
import type { Locale } from '@/i18n/config';

export const generateMetadata = pageMetadata('/tier-lists', (d) => ({
  title: d.tierLists.pageTitle,
  description: d.tierLists.metaDescription,
}));

export default async function TierListsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return (
    <TierListHub locale={locale} />
  );
}
