// frontend/src/app/[locale]/tier-lists/custom/[id]/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { CustomTierListClient } from '@/components/tier-lists/CustomTierListClient';

export const generateMetadata = pageMetadata('/tier-lists', (d) => ({
  title: d.tierLists.pageTitle,
  description: d.tierLists.metaDescription,
}));

export default async function CustomTierListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomTierListClient id={id} />;
}
