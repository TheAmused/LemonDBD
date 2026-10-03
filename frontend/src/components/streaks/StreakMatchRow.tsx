'use client';
// frontend/src/components/streaks/StreakMatchRow.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Clock } from 'lucide-react';
import type { StreakMatchLogBase } from './StreakStatsDrawer';
import { formatDate } from '@/utils/format';
import { useLocale, useDictionary } from '@/context/DictionaryContext';

export interface StreakMatchRowProps<TLog extends StreakMatchLogBase> {
  log: TLog;
  renderLabel: (log: TLog) => React.ReactNode;
  renderMeta: (log: TLog) => React.ReactNode;
}

/** One match in a streak mode's history, shared by the stats drawer and the "view all" modal. */
export function StreakMatchRow<TLog extends StreakMatchLogBase>({ log, renderLabel, renderMeta }: StreakMatchRowProps<TLog>) {
  const dict = useDictionary();
  const locale = useLocale();
  const isWin = log.result === 'win';
  return (
    <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-bg-elevated border border-border-color hover:border-border-subtle transition-colors shadow-sm">
      <div className="pl-1">
        {log.triggered_by === 'inactivity' ? (
          <div className="flex items-center gap-1 type-card-title text-text-secondary">
            <Clock className="w-3.5 h-3.5" />
            {dict.streaks.autoLossInactive}
          </div>
        ) : (
          renderLabel(log)
        )}
        <div className="text-xs text-text-secondary mt-1.5">{renderMeta(log)}</div>
      </div>

      <div className="text-right">
        <div
          className={`text-xs font-black uppercase px-2 py-0.5 rounded-full inline-block ${
            isWin
              ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
              : 'bg-accent-red/20 text-accent-red border border-accent-red/30'
          }`}
        >
          {log.result}
        </div>
        {log.timestamp && (
          <div className="type-caption text-text-secondary mt-1">
            {formatDate(log.timestamp, locale)}
          </div>
        )}
      </div>
    </div>
  );
}
