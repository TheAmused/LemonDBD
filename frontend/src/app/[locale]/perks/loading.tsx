// frontend/src/app/[locale]/perks/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';
import { PageShellFallback } from '@/components/layout/PageShellFallback';

export default function PerksLoading() {
  return (
    <PageShellFallback
      outerClassName="h-dvh overflow-hidden bg-bg-primary text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300"
      padding="tight"
      mainClassName="flex h-full min-h-0 flex-col items-center justify-center"
      skeleton={
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="blood"
          needleSpeed={1.2}
          label="Calibrating Perks Vault..."
          sublabel="Synchronizing survivor & killer trial perks"
        />
      }
    />
  );
}
