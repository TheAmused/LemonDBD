'use client';
// frontend/src/components/streaks/StreakAttemptGroups.tsx
import type { Dictionary } from '@/locales/types';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { tip } from '@/components/common/Tooltip';
import { StreakMatchRow } from './StreakMatchRow';
import { useDictionary } from '@/context/DictionaryContext';

export interface StreakMatchLogBase {
  id: number;
  run_id: number;
  /** The attempt the match belongs to; matches are filed under it. */
  attempt: number;
  result: 'win' | 'loss';
  triggered_by: 'player' | 'inactivity';
  timestamp?: string;
}

export interface AttemptGroup<TLog extends StreakMatchLogBase> {
  key: string;
  attempt: number;
  logs: TLog[];
  wins: number;
  losses: number;
}

/** Files the matches (newest first) under their attempt, newest group first. One run's attempt numbers are its own, so the run is part of the key. */
export function groupByAttempt<TLog extends StreakMatchLogBase>(logs: TLog[]): AttemptGroup<TLog>[] {
  const groups = new Map<string, AttemptGroup<TLog>>();
  for (const log of logs) {
    const key = `${log.run_id}-${log.attempt}`;
    const group = groups.get(key) ?? { key, attempt: log.attempt, logs: [], wins: 0, losses: 0 };
    group.logs.push(log);
    if (log.result === 'win') group.wins += 1;
    else group.losses += 1;
    groups.set(key, group);
  }
  return [...groups.values()];
}

interface StreakAttemptGroupsProps<TLog extends StreakMatchLogBase> {
  groups: AttemptGroup<TLog>[];
  /** The group that starts open; every other one starts closed. */
  openByDefault?: string;
  renderLabel: (log: TLog) => React.ReactNode;
  renderMeta: (log: TLog) => React.ReactNode;
  /** Extra text after "Attempt N" in a group's header, from the group's newest match. */
  renderGroupLabel?: (log: TLog) => React.ReactNode;
}

/** Collapsible attempts, each with the matches played in it. */
export function StreakAttemptGroups<TLog extends StreakMatchLogBase>({
  groups,
  openByDefault,
  renderLabel,
  renderMeta,
  renderGroupLabel,
}: StreakAttemptGroupsProps<TLog>) {
  const dict = useDictionary();
  // What the player toggled by hand; groups they have not touched follow `openByDefault`.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const open = toggled[group.key] ?? group.key === openByDefault;
        return (
          <section key={group.key}>
            <button
              type="button"
              onClick={() => setToggled((current) => ({ ...current, [group.key]: !open }))}
              aria-expanded={open}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:text-accent-red focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red motion-reduce:transition-none"
            >
              <ChevronRight
                className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
                aria-hidden="true"
              />
              <span className="type-label-sm flex-1 text-text-secondary">
                {dict.streaks.attemptLabel} {group.attempt}
                {renderGroupLabel && <> {dict.streaks.middotSeparator} {renderGroupLabel(group.logs[0])}</>}
              </span>
              <span className="text-xs font-black text-accent-green" {...tip(dict.streaks.wins, undefined, 'status')}>{group.wins}</span>
              <span className="text-xs text-text-muted" aria-hidden="true">/</span>
              <span className="text-xs font-black text-accent-red" {...tip(dict.streaks.losses, undefined, 'status')}>{group.losses}</span>
            </button>
            {/* grid-template-rows animates 0fr -> 1fr, which height:auto cannot do */}
            <div
              inert={!open}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="space-y-2.5 pt-2">
                  {group.logs.map((log) => (
                    <StreakMatchRow key={log.id} log={log} renderLabel={renderLabel} renderMeta={renderMeta} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
