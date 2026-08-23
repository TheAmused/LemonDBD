'use client';
// frontend/src/components/streaks/ChallengeModeGate.tsx

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { fetchChallengeModeStatus } from '@/services/challengeModesApi';

interface ChallengeModeGateProps {
  /** Backend `ChallengeModeSetting.mode` key (gauntlet/chaos/history/page_streak). */
  mode: string;
  locale: string;
  role: string;
  children: React.ReactNode;
}

/** Guards a challenge mode's route: while its admin kill switch is on, the
 * actual game board never mounts -- this renders a block screen instead,
 * regardless of how the URL was reached. */
export const ChallengeModeGate: React.FC<ChallengeModeGateProps> = ({ mode, locale, role, children }) => {
  const [status, setStatus] = useState<'loading' | 'enabled' | 'disabled'>('loading');
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchChallengeModeStatus().then((modes) => {
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
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-amber-500/30 bg-amber-950/20 p-12 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400" />
        <h1 className="text-lg font-extrabold text-slate-100">This challenge was disabled temporarily.</h1>
        {reason && <p className="max-w-md text-sm text-slate-400">Reason: {reason}</p>}
        <Link
          href={`/${locale}/streaks/${role}`}
          className="mt-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
        >
          Back to challenges
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
