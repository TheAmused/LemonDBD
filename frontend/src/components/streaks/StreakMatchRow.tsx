'use client';
// frontend/src/components/streaks/StreakMatchRow.tsx

import React from 'react';
import { Clock } from 'lucide-react';
import type { StreakMatchLogBase } from './StreakStatsDrawer';
import { formatDate } from '@/utils/format';
import { useLocale, useDictionary } from '@/context/DictionaryContext';
import { Surface } from '@/components/common/Surface';

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
  const meta = renderMeta(log);
  return (
    <Surface tone="elevated" padding="none" className="flex items-center justify-between px-4 py-3.5 hover:border-border-subtle transition-colors shadow-sm">
      <div className="pl-1">
        {log.triggered_by === 'inactivity' ? (
          <div className="flex items-center gap-1 type-card-title text-text-secondary">
            <Clock className="icon-sm" />
            {dict.streaks.autoLossInactive}
          </div>
        ) : (
          renderLabel(log)
        )}
        {meta && <div className="text-xs text-text-secondary mt-1.5">{meta}</div>}
      </div>

      <div className="text-right">
        <div className={`text-xs font-black uppercase ${isWin ? 'text-accent-green' : 'text-accent-red'}`}>
          {log.result}
        </div>
        {log.timestamp && (
          <div className="type-caption text-text-secondary mt-1">
            {formatDate(log.timestamp, locale)}
          </div>
        )}
      </div>
    </Surface>
  );
}
