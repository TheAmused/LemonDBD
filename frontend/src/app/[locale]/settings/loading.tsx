// frontend/src/app/[locale]/settings/loading.tsx
import React from 'react';
import { Surface } from '@/components/common/Surface';

export default function SettingsLoading() {
  return (
    <div className="space-y-6 w-full animate-pulse" aria-busy="true">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-control bg-bg-elevated" />
        <div className="h-4 w-80 max-w-full rounded-control bg-bg-elevated/70" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Surface key={i} tone="flat" padding="lg" className="space-y-4">
            <div className="h-6 w-36 rounded-control bg-bg-elevated" />
            <div className="space-y-4 divide-y divide-border-subtle/50">
              <div className="pt-2 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-4 w-32 rounded-control bg-bg-elevated" />
                  <div className="h-3 w-48 rounded-control bg-bg-elevated/60" />
                </div>
                <div className="h-6 w-11 rounded-full bg-bg-elevated" />
              </div>
              <div className="pt-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-4 w-28 rounded-control bg-bg-elevated" />
                  <div className="h-3 w-44 rounded-control bg-bg-elevated/60" />
                </div>
                <div className="h-6 w-11 rounded-full bg-bg-elevated" />
              </div>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
