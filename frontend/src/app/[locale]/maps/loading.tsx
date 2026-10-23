// frontend/src/app/[locale]/maps/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { RouteLoading } from '@/components/layout/RouteLoading';

export default function MapsLoading() {
  return (
    <RouteLoading>
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.6}
        labelKey="maps.loadingTacticalMaps"
        sublabelKey="maps.loadingTacticalMapsSub"
      />
    </RouteLoading>
  );
}
