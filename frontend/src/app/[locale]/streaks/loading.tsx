// frontend/src/app/[locale]/streaks/loading.tsx
import React from 'react';
import { PageShellFallback } from '@/components/layout/PageShellFallback';
import { DbdSpinner } from '@/components/common/DbdSpinner';

export default function StreaksLoading() {
  return (
    <PageShellFallback
      mainClassName="min-h-skeleton-page flex items-center justify-center"
      skeleton={
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="blood"
          needleSpeed={1.1}
          labelKey="streaks.loadingTrialStreaks"
          sublabelKey="streaks.loadingTrialStreaksSub"
        />
      }
    />
  );
}
