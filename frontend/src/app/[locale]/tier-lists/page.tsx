// frontend/src/app/[locale]/tier-lists/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { TierListHubClient } from '@/components/tier-lists/TierListHubClient';

export const generateMetadata = pageMetadata('/tier-lists', (d) => ({
  title: d.tierLists.pageTitle,
  description: d.tierLists.metaDescription,
}));

export default function TierListsPage() {
  return <TierListHubClient />;
}
