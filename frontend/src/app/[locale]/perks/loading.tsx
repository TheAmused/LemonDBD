// frontend/src/app/[locale]/perks/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { RouteLoading } from '@/components/layout/RouteLoading';

export default function PerksLoading() {
  return (
    <RouteLoading className="h-full">
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.2}
        labelKey="app.loadingPerks"
        sublabelKey="app.loadingPerksSub"
      />
    </RouteLoading>
  );
}
