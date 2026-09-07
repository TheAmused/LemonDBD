// frontend/src/app/[locale]/maps/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';
import { PageShellFallback } from '@/components/layout/PageShellFallback';

export default function MapsLoading() {
  return (
    <PageShellFallback
      customPadding="p-6 lg:p-7"
      mainClassName="min-h-[500px] flex items-center justify-center"
      skeleton={
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="cyan"
          needleSpeed={1.6}
          label="Surveying Realms & Seeds..."
          sublabel="Mapping tile variants, loops, and spawn coordinates"
        />
      }
    />
  );
}
