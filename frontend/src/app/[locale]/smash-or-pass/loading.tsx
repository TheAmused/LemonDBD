// frontend/src/app/[locale]/smash-or-pass/loading.tsx
import React from 'react';
import { RouteLoading } from '@/components/layout/RouteLoading';
import { DbdSpinner } from '@/components/common/DbdSpinner';

export default function SmashOrPassLoading() {
  return (
    <RouteLoading className="text-text-primary">
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.0}
        labelKey="smashOrPass.loadingArena"
        sublabelKey="smashOrPass.loadingArenaSub"
      />
    </RouteLoading>
  );
}
