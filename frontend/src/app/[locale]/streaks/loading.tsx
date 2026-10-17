// frontend/src/app/[locale]/streaks/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';

// No PageShellFallback here: streaks/layout.tsx already renders the real Sidebar
// and <main>, so a second shell would nest a fake sidebar placeholder inside it.
export default function StreaksLoading() {
  return (
    <div className="min-h-skeleton-page flex items-center justify-center">
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.1}
        labelKey="streaks.loadingTrialStreaks"
        sublabelKey="streaks.loadingTrialStreaksSub"
      />
    </div>
  );
}
