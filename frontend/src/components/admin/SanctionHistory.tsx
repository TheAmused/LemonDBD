'use client';
// frontend/src/components/admin/SanctionHistory.tsx
//
// The timeline of one user's warnings, suspensions and bans, newest first.

import React from 'react';
import { Badge, type BadgeTone } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Surface } from '@/components/common/Surface';
import { reasonLabel, ruleLabel } from '@/components/moderation/moderationLabels';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { formatDateTime } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import type { AdminSanction, SanctionKind } from '@/types/moderation';

const KIND_TONE: Record<SanctionKind, BadgeTone> = { warning: 'amber', suspension: 'red', ban: 'red' };

interface SanctionHistoryProps {
  sanctions: AdminSanction[];
  busy: boolean;
  onRevoke: (sanction: AdminSanction) => void;
}

export function SanctionHistory({ sanctions, busy, onRevoke }: SanctionHistoryProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.moderation.admin;
  const when = (value: string | null) => formatDateTime(value, locale);
  const kindLabel: Record<SanctionKind, string> = {
    warning: t.kindWarning,
    suspension: t.kindSuspension,
    ban: t.kindBan,
  };

  if (sanctions.length === 0) return <p className="type-body text-text-muted">{t.historyEmpty}</p>;

  return (
    <ul className="space-y-3">
      {sanctions.map((s) => {
        const revoked = s.revoked_at !== null;
        const status = s.active ? t.statusActive : revoked ? t.statusRevoked : t.statusExpired;
        const details: [string, string | null][] = [
          [t.factsLabel, s.facts],
          [t.internalLabel, s.internal_notes],
        ];
        return (
          <Surface as="li" key={s.id} tone="well" padding="sm" className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={KIND_TONE[s.kind]} size="sm">{kindLabel[s.kind]}</Badge>
              <Badge tone={s.active ? 'green' : 'neutral'} size="sm">{status}</Badge>
              <Badge tone="neutral" size="sm" plain>{reasonLabel(dict, s.reason_code)}</Badge>
              {s.rule_ref && <Badge tone="neutral" size="sm" plain>{ruleLabel(dict, s.rule_ref)}</Badge>}
              {s.source === 'content_report' && <Badge tone="blue" size="sm" plain>{t.sourceReport}</Badge>}
            </div>

            <p className="type-caption text-text-secondary">
              {s.issued_by_login
                ? formatMessage(t.issuedBy, { login: s.issued_by_login, date: when(s.issued_at) })
                : formatMessage(t.issuedOn, { date: when(s.issued_at) })}
              {s.kind === 'suspension' && s.expires_at ? ` · ${formatMessage(t.untilDate, { date: when(s.expires_at) })}` : ''}
            </p>

            {details
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <p className="type-label-xs text-text-secondary">{label}</p>
                  <p className="whitespace-pre-wrap break-words type-body text-text-primary">{value}</p>
                </div>
              ))}

            {s.kind === 'warning' && (
              <p className="type-caption text-text-muted">
                {s.acknowledged_at ? formatMessage(t.acknowledgedAt, { date: when(s.acknowledged_at) }) : t.notAcknowledged}
              </p>
            )}

            {revoked && (
              <p className="type-caption text-text-muted">
                {formatMessage(t.revokedLine, { login: s.revoked_by_login ?? '', reason: s.revoke_reason ?? '' })}
              </p>
            )}

            {s.active && (
              <div className="flex justify-end">
                <Button size="sm" disabled={busy} onClick={() => onRevoke(s)}>
                  {t.revokeButton}
                </Button>
              </div>
            )}
          </Surface>
        );
      })}
    </ul>
  );
}
