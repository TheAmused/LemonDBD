'use client';
// frontend/src/components/user/TwoFactorSection.tsx
//
// Profile-page card for the optional authenticator-app sign-in. Off by default for everyone.

import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { TwoFactorConfirmModal, type TwoFactorAction } from '@/components/user/TwoFactorConfirmModal';
import { TwoFactorSetupModal } from '@/components/user/TwoFactorSetupModal';
import { useDictionary } from '@/context/DictionaryContext';
import { useParams } from 'next/navigation';
import { localeMetaFor } from '@/i18n/config';
import { fetchTwoFactorStatus, type TwoFactorStatus } from '@/services/twoFactorApi';
import { formatMessage } from '@/utils/i18nFormat';

interface TwoFactorSectionProps {
  refreshTrigger?: number;
  onStatusChange?: () => void;
}

export const TwoFactorSection: React.FC<TwoFactorSectionProps> = ({ refreshTrigger = 0, onStatusChange }) => {
  const dict = useDictionary();
  const t = dict.twoFactor;
  const params = useParams();
  const locale = localeMetaFor(typeof params?.locale === 'string' ? params.locale : undefined).bcp47;
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [action, setAction] = useState<TwoFactorAction | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await fetchTwoFactorStatus());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  const enabledOn = status?.enabled_at
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(status.enabled_at))
    : null;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-3 border-t border-border-color pt-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber" />
          <div>
            <h3 className="type-label-sm text-text-primary">{t.sectionTitle}</h3>
            <p className="type-caption mt-0.5 text-text-secondary">{t.sectionSubtitle}</p>
          </div>
        </div>
        {status?.available ? (
          <span
            className={`rounded-full px-2.5 py-1 type-label-2xs ${
              status.enabled ? 'bg-accent-green/15 text-accent-green' : 'bg-bg-primary text-text-muted'
            }`}
          >
            {status.enabled ? t.statusOn : t.statusOff}
          </span>
        ) : null}
      </div>

      <p className="type-caption text-text-muted">{t.optionalNote}</p>

      {loadFailed ? (
        <p role="alert" className="type-strong text-accent-red">
          {t.loadFailed}
        </p>
      ) : null}

      {status && !status.available ? <p className="type-strong text-text-muted">{t.unavailable}</p> : null}

      {status?.available && !status.enabled ? (
        <div>
          <Button variant="primary" size="sm" onClick={() => setSetupOpen(true)} leftIcon={<KeyRound className="h-3.5 w-3.5" />}>
            <span>{t.enableButton}</span>
          </Button>
        </div>
      ) : null}

      {status?.available && status.enabled ? (
        <>
          <ul className="flex flex-col gap-0.5 type-body text-text-secondary">
            {enabledOn ? <li>{formatMessage(t.enabledSince, { date: enabledOn })}</li> : null}
            <li>{formatMessage(t.recoveryRemaining, { count: status.recovery_codes_remaining })}</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAction('regenerate')}>
              <span>{t.regenerateButton}</span>
            </Button>
            <Button variant="danger" size="sm" onClick={() => setAction('disable')}>
              <span>{t.disableButton}</span>
            </Button>
          </div>
        </>
      ) : null}

      <TwoFactorSetupModal
        isOpen={setupOpen}
        onClose={() => setSetupOpen(false)}
        onEnabled={() => {
          setSetupOpen(false);
          load();
          onStatusChange?.();
        }}
      />
      <TwoFactorConfirmModal
        action={action}
        onClose={() => setAction(null)}
        onDone={() => {
          setAction(null);
          load();
          onStatusChange?.();
        }}
      />
    </section>
  );
};
