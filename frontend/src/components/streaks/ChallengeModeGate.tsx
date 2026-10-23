'use client';
// frontend/src/components/streaks/ChallengeModeGate.tsx

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { fetchChallengeModeStatus } from '@/services/challengeModesApi';
import { useDictionary } from '@/context/DictionaryContext';

interface ChallengeModeGateProps {
  /** Backend `ChallengeModeSetting.mode` key (gauntlet/chaos/history/page_streak). */
  mode: string;
  children: React.ReactNode;
}

/** Guards a challenge mode's route: while its admin kill switch is on, the
 * actual game board never mounts -- this renders a block screen instead,
 * regardless of how the URL was reached. */
export const ChallengeModeGate: React.FC<ChallengeModeGateProps> = ({ mode, children }) => {
  const dict = useDictionary();
  const [status, setStatus] = useState<'loading' | 'enabled' | 'disabled'>('loading');
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchChallengeModeStatus().then((modes) => {
      if (cancelled) return;
      const modeInfo = modes[mode];
      if (modeInfo && !modeInfo.is_enabled) {
        setReason(modeInfo.disabled_reason);
        setStatus('disabled');
      } else {
        setStatus('enabled');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (status === 'loading') return null;

  if (status === 'disabled') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-card border border-accent-amber/30 bg-accent-amber/10 p-12 text-center">
        <AlertTriangle className="h-12 w-12 text-accent-amber" />
        <h1 className="text-lg font-extrabold text-text-primary">
          {dict.streaks.temporarilyDisabled}
        </h1>
        {reason && (
          <p className="max-w-md text-sm text-text-secondary">
            {dict.modal.reasonLabel}: {reason}
          </p>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
