// frontend/src/app/[locale]/user/loading.tsx
//
// Next.js route-level loading state: shown immediately while the /user
// route segment (and its client bundle) is fetched, before the page's own
// dictionary/auth-aware skeleton takes over. Kept dictionary-free since
// route loading states render before any client data fetch can resolve.

import { UserProfileSkeleton } from '@/components/user/UserProfileSkeleton';

export default function UserPageLoading() {
  return <UserProfileSkeleton />;
}
