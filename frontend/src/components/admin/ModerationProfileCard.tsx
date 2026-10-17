'use client';
// frontend/src/components/admin/ModerationProfileCard.tsx
//
// Who the moderation drawer is about. The avatar, big, on the left with the name and alias under it; its
// ring colour says where the account stands (green in good standing, yellow warned, orange
// suspended, red banned). On the right, behind a vertical line, the three numbers an admin wants
// before deciding anything: warnings, suspensions and blocked content.

import React from 'react';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { tip } from '@/components/common/Tooltip';
import { UserAvatar } from '@/components/UserAvatar';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { formatDateTime } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import { moderationState, type ModerationState, type ModerationSummary } from '@/types/moderation';
import type { UserRow } from '@/types/admin';

/** Full class strings so Tailwind can see them. */
const RING: Record<ModerationState | 'unknown', string> = {
  good: 'border-2 border-accent-green bg-bg-primary',
  warned: 'border-2 border-accent-amber bg-bg-primary',
  suspended: 'border-2 border-accent-orange bg-bg-primary',
  banned: 'border-2 border-accent-red bg-bg-primary',
  unknown: 'border-2 border-border-color bg-bg-primary',
};

interface ModerationProfileCardProps {
  user: UserRow;
  /** Null until the account's moderation summary has loaded. */
  summary: ModerationSummary | null;
  busy: boolean;
  onRestore: () => void;
}

export function ModerationProfileCard({ user, summary, busy, onRestore }: ModerationProfileCardProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.moderation.admin;
  const state = summary ? moderationState(summary) : null;
  const blocked = state === 'banned' || state === 'suspended';
  const standing =
    state === 'banned'
      ? t.standingBanned
      : state === 'suspended'
        ? formatMessage(t.standingSuspended, { date: formatDateTime(summary?.suspended_until ?? null, locale) })
        : state === 'warned'
          ? t.standingWarned
          : state === 'good'
            ? t.standingActive
            : '';

  const stats: [string, string][] = summary
    ? [
        [t.statWarnings, `${summary.active_warnings} / ${summary.total_warnings}`],
        [t.statSuspensions, String(summary.total_suspensions)],
        [t.statBlockedContent, String(summary.content_blocked)],
      ]
    : [];

  return (
    <div className="rounded-card border border-border-color bg-bg-primary">
      <div className="flex items-stretch">
        <div className="flex w-40 shrink-0 flex-col items-center justify-center gap-3 px-3 py-6 text-center sm:w-48">
          <div className="rounded-card" {...(standing ? tip(standing, undefined, 'status') : {})}>
            <UserAvatar user={user} size="2xl" borderClassName={RING[state ?? 'unknown']} />
            {standing && <span className="sr-only">{standing}</span>}
          </div>
          <div className="min-w-0 max-w-full">
            <p className="truncate type-strong text-text-primary">{user.username}</p>
            <p className="truncate type-caption text-text-muted">@{user.login}</p>
          </div>
        </div>

        <div aria-hidden="true" className="my-4 w-px shrink-0 bg-border-color" />

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-4 py-4 sm:px-6">
          {summary ? (
            <>
              <dl className="space-y-2.5">
                {stats.map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3">
                    <dt className="type-label-2xs text-text-secondary">{label}</dt>
                    <dd className="type-strong text-text-primary">{value}</dd>
                  </div>
                ))}
              </dl>
              {blocked && (
                <Button size="sm" className="w-full" disabled={busy} onClick={onRestore}>
                  {t.restoreButton}
                </Button>
              )}
            </>
          ) : (
            <div className="flex justify-center">
              <Spinner tone="accent" size="sm" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
