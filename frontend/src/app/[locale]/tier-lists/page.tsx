import { pageMetadata } from '@/i18n/metadata';
import { PageShell } from '@/components/layout/PageShell';
import { TierListHub } from '@/components/tier-lists/TierListHub';
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
    <PageShell
      locale={locale}
      activeCategory="tier-lists"
      mainClassName="relative flex flex-col"
    >
      <TierListHub locale={locale} />
    </PageShell>
  );
}
