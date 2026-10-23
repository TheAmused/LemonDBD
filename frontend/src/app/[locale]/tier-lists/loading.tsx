// frontend/src/app/[locale]/tier-lists/loading.tsx
//
// Covers the hub and, by inheritance, /tier-lists/[slug], /new and /custom/[id]. The label is the
// same one the views' own first loading state shows (TierListSkeleton), so the hand-over from this
// route-level spinner to the page's is one continuous element.
import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { RouteLoading } from '@/components/layout/RouteLoading';

export default function TierListsLoading() {
  return (
    <RouteLoading>
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.6}
        labelKey="tierLists.loading"
      />
    </RouteLoading>
  );
}
