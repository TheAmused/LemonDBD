// frontend/src/app/[locale]/smash-or-pass/loading.tsx
import React from 'react';
import { PageShellFallback } from '@/components/layout/PageShellFallback';
import { DbdSpinner } from '@/components/common/DbdSpinner';

export default function SmashOrPassLoading() {
  return (
    <PageShellFallback
      mainClassName="min-h-skeleton-page flex items-center justify-center text-text-primary"
      skeleton={
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="blood"
          needleSpeed={1.0}
          labelKey="smashOrPass.loadingArena"
          sublabelKey="smashOrPass.loadingArenaSub"
        />
      }
    />
  );
}
