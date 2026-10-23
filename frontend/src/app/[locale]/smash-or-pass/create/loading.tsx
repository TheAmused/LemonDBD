// frontend/src/app/[locale]/smash-or-pass/create/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { RouteLoading } from '@/components/layout/RouteLoading';

export default function SmashRosterCreateLoading() {
  return (
    <RouteLoading>
      <DbdSpinner size="responsive" layout="inline" accent="blood" needleSpeed={1.6} labelKey="smashOrPass.loadingCreator" />
    </RouteLoading>
  );
}
