'use client';
// frontend/src/components/admin/UserStandingBadge.tsx
//
// Whether an account is in good standing, suspended (until when) or banned.

import React from 'react';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { formatDateTime } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import { accountStanding } from '@/types/moderation';
import type { UserRow } from '@/types/admin';

export function UserStandingBadge({ user }: { user: Pick<UserRow, 'is_active' | 'suspended_until'> }) {
  const dict = useDictionary();
  const locale = useLocale();
  const standing = accountStanding(user);
  if (standing === 'banned') {
    return (
      <span className="inline-flex items-center gap-1 type-strong-xs text-accent-red">
        <XCircle className="h-3.5 w-3.5" />
        <span>{dict.moderation.admin.badgeBanned}</span>
      </span>
    );
  }
  if (standing === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1 type-strong-xs text-accent-amber">
        <Clock className="h-3.5 w-3.5" />
        <span>{formatMessage(dict.moderation.admin.badgeSuspended, { date: formatDateTime(user.suspended_until, locale, { dateStyle: 'medium' }) })}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 type-strong-xs text-accent-green">
      <CheckCircle className="h-3.5 w-3.5" />
      <span>{dict.stats.active}</span>
    </span>
  );
}
