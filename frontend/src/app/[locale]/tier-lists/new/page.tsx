// frontend/src/app/[locale]/tier-lists/new/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { NewTierListClient } from '@/components/tier-lists/NewTierListClient';

export const generateMetadata = pageMetadata('/tier-lists', (d) => ({
  title: d.tierLists.pageTitle,
  description: d.tierLists.metaDescription,
}));

export default function NewTierListPage() {
  return <NewTierListClient />;
}
