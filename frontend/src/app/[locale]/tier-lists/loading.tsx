// frontend/src/app/[locale]/tier-lists/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { PageShellFallback } from '@/components/layout/PageShellFallback';

export default function TierListsLoading() {
  return (
    <PageShellFallback
      mainClassName="min-h-[500px] flex items-center justify-center"
      skeleton={
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="blood"
          needleSpeed={1.6}
          labelKey="tierLists.loading"
        />
      }
    />
  );
}
