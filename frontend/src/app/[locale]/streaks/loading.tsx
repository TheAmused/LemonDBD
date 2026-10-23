// frontend/src/app/[locale]/streaks/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { RouteLoading } from '@/components/layout/RouteLoading';

export default function StreaksLoading() {
  return (
    <RouteLoading>
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.1}
        labelKey="streaks.loadingTrialStreaks"
        sublabelKey="streaks.loadingTrialStreaksSub"
      />
    </RouteLoading>
  );
}
