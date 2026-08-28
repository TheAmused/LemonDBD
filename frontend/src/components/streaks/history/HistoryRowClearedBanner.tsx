'use client';
// frontend/src/components/streaks/history/HistoryRowClearedBanner.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect } from 'react';
import { Trophy } from 'lucide-react';

export interface HistoryRowClearedBannerProps {
  rowNumber: number | null;
  onClose: () => void;
  dict?: Dictionary;
}

export const HistoryRowClearedBanner: React.FC<HistoryRowClearedBannerProps> = ({
  rowNumber,
  onClose,
  dict,
}) => {
  useEffect(() => {
    if (rowNumber == null) return;
    const timer = setTimeout(onClose, 3200);
    return () => clearTimeout(timer);
  }, [rowNumber, onClose]);

  if (rowNumber == null) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="chaos-badge-pop flex items-center gap-2.5 rounded-xl border-2 border-amber-400 bg-slate-950/95 px-5 py-3 shadow-xl shadow-amber-500/20">
        <Trophy className="h-5 w-5 text-amber-400" />
        <span className="text-sm font-extrabold text-white">
          {dict?.streaks?.rowClearedPrefix || 'Row cleared! Row'} {rowNumber + 1}{' '}
          {dict?.streaks?.rowUnlockedSuffix || 'unlocked.'}
        </span>
      </div>
    </div>
  );
};
