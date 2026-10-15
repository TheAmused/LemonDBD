'use client';
// frontend/src/components/moderation/AccountBlockedNotice.tsx
//
// What a banned or suspended person sees instead of "invalid credentials" once they have proven who
// they are: that, until when, why, and how to ask for a review. Shown inside the sign-in dialog, whose
// title already says "banned" or "suspended".

import React from 'react';
import { Ban, Clock } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { reasonLabel } from '@/components/moderation/moderationLabels';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { formatDateTime } from '@/utils/format';
import type { BlockedInfo } from '@/types/moderation';

interface AccountBlockedNoticeProps {
  blocked: BlockedInfo;
  onClose: () => void;
}

export function AccountBlockedNotice({ blocked, onClose }: AccountBlockedNoticeProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.moderation.blocked;
  const banned = blocked.code === 'account_banned';
  const Icon = banned ? Ban : Clock;
  const reason = reasonLabel(dict, blocked.reason_code);
  const body = banned
    ? t.bannedBody
    : formatMessage(t.suspendedBody, { date: formatDateTime(blocked.until, locale, { dateStyle: 'long', timeStyle: 'short' }) });
  const appeal = blocked.appeal_contact
    ? formatMessage(t.appealWithContact, { contact: blocked.appeal_contact })
    : t.appealNoContact;

  return (
    <div role="alert" className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-accent-red/30 bg-accent-red/10 p-3.5">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent-red" />
        <p className="type-body text-text-primary">{body}</p>
      </div>

      {reason && (
        <p className="type-body text-text-primary">
          <span className="type-label-sm text-text-secondary">{t.reasonLabel}: </span>
          {reason}
        </p>
      )}

      {blocked.public_message && (
        <div className="space-y-1">
          <p className="type-label-sm text-text-secondary">{t.messageLabel}</p>
          <p className="whitespace-pre-wrap break-words rounded-xl border border-border-subtle bg-bg-primary p-3 type-body text-text-primary">
            {blocked.public_message}
          </p>
        </div>
      )}

      <p className="type-body text-text-secondary">{appeal}</p>

      <Button variant="primary" className="w-full" onClick={onClose}>
        {t.close}
      </Button>
    </div>
  );
}
