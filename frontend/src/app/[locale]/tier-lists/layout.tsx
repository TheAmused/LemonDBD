// frontend/src/app/[locale]/tier-lists/layout.tsx
import { pageMetadata } from '@/i18n/metadata';

export const generateMetadata = pageMetadata('/tier-lists', (d) => ({ title: d.tierLists.pageTitle, description: d.tierLists.metaDescription }));

export default function TierListsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
