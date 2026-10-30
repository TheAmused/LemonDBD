'use client';
// frontend/src/components/admin/UserStandingBadge.tsx
//
// Whether an account is in good standing, suspended (until when) or banned.

import React from 'react';
import { Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
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
      <Badge tone="red" size="sm" plain icon={<XCircle className="icon-sm" aria-hidden="true" />}>
        {dict.moderation.admin.badgeBanned}
      </Badge>
    );
  }
  if (standing === 'suspended') {
    return (
      <Badge tone="amber" size="sm" plain icon={<Clock className="icon-sm" aria-hidden="true" />}>
        {formatMessage(dict.moderation.admin.badgeSuspended, { date: formatDateTime(user.suspended_until, locale, { dateStyle: 'medium' }) })}
      </Badge>
    );
  }
  return (
    <Badge tone="green" size="sm" plain icon={<CheckCircle2 className="icon-sm" aria-hidden="true" />}>
      {dict.stats.active}
    </Badge>
  );
}
