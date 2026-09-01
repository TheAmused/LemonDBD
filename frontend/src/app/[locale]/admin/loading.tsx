// frontend/src/app/[locale]/admin/loading.tsx
//
// Next.js route-level loading state, shown while the /admin route segment
// and its client bundle are fetched, before the page's own dictionary/auth
// aware skeleton takes over.

import { AdminPanelSkeleton } from '@/components/admin/AdminPanelSkeleton';

export default function AdminPageLoading() {
  return <AdminPanelSkeleton />;
}
