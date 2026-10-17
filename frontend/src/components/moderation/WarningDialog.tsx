'use client';
// frontend/src/components/moderation/WarningDialog.tsx
//
// Shows the signed-in person the warnings they have not acknowledged yet, one at a time. A warning
// restricts nothing; the dialog exists so nobody can say they were never told.

import React from 'react';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { reasonLabel, ruleLabel } from '@/components/moderation/moderationLabels';
import { useAuth } from '@/context/AuthContext';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { formatDate } from '@/utils/format';
import type { UserWarning } from '@/types/moderation';

/** What a warning says: that a moderator reviewed it, why, which rule and what happened. Also the admin's preview. */
export function WarningNoticeBody({ warning }: { warning: Pick<UserWarning, 'reason_code' | 'rule_ref' | 'facts'> }) {
  const dict = useDictionary();
  const t = dict.moderation.warning;
  const rows: [string, string][] = [
    [t.reasonLabel, reasonLabel(dict, warning.reason_code)],
    [t.ruleLabel, ruleLabel(dict, warning.rule_ref)],
    [t.factsLabel, warning.facts ?? ''],
  ];

  return (
    <>
      <div className="flex items-start gap-3 rounded-card border border-accent-amber/30 bg-accent-amber/10 p-3.5">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-accent-amber" />
        <p className="type-body text-text-primary">{t.intro}</p>
      </div>

      <dl className="space-y-2.5">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="type-label-sm text-text-secondary">{label}</dt>
              <dd className="whitespace-pre-wrap break-words type-body text-text-primary">{value}</dd>
            </div>
          ))}
      </dl>
    </>
  );
}

export function WarningDialog() {
  const dict = useDictionary();
  const locale = useLocale();
  const { warnings, acknowledgeWarning } = useAuth();
  const warning = warnings[0];
  const t = dict.moderation.warning;
  if (!warning) return null;

  return (
    <Modal
      isOpen
      onClose={() => acknowledgeWarning(warning.id)}
      variant="dialog"
      size="md"
      layer="top"
      title={t.title}
      closeButton="none"
      closeOnBackdropClick={false}
      closeOnEscape={false}
      padded
      bodyClassName="space-y-4"
      footerClassName="justify-end"
      footer={
        <Button variant="primary" size="sm" data-autofocus onClick={() => acknowledgeWarning(warning.id)}>
          {t.acknowledge}
        </Button>
      }
    >
      <WarningNoticeBody warning={warning} />

      <div className="flex flex-wrap items-center justify-between gap-2 type-caption text-text-muted">
        <span>
          {warning.expires_at ? formatMessage(t.expires, { date: formatDate(warning.expires_at, locale, { dateStyle: 'long' }) }) : ''}
        </span>
        {warnings.length > 1 && (
          <span>{formatMessage(t.counter, { current: 1, total: warnings.length })}</span>
        )}
        <Link href={`/${locale}/rules`} className="text-accent-amber hover:opacity-80" onClick={() => acknowledgeWarning(warning.id)}>
          {t.rulesLink}
        </Link>
      </div>
    </Modal>
  );
}
