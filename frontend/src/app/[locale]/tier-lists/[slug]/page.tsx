// frontend/src/app/[locale]/tier-lists/[slug]/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { OfficialTierListClient } from '@/components/tier-lists/OfficialTierListClient';

export const generateMetadata = pageMetadata('/tier-lists', (d) => ({
  title: d.tierLists.pageTitle,
  description: d.tierLists.metaDescription,
}));

export default async function OfficialTierListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OfficialTierListClient slug={slug} />;
}
