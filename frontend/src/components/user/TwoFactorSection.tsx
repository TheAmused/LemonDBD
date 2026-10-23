'use client';
// frontend/src/components/user/TwoFactorSection.tsx
//
// Profile-page card with the switch for the authenticator-app sign-in. Off by default for everyone.

import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { TwoFactorConfirmModal, type TwoFactorAction } from '@/components/user/TwoFactorConfirmModal';
import { TwoFactorSetupModal } from '@/components/user/TwoFactorSetupModal';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { localeMetaFor } from '@/i18n/config';
import { fetchTwoFactorStatus, type TwoFactorStatus } from '@/services/twoFactorApi';
import { formatMessage } from '@/utils/i18nFormat';
import { Switch } from '@/components/common/Switch';

interface TwoFactorSectionProps {
  refreshTrigger?: number;
  onStatusChange?: () => void;
  needsPassword?: boolean;
}

export const TwoFactorSection: React.FC<TwoFactorSectionProps> = ({
  refreshTrigger = 0,
  onStatusChange,
  needsPassword = false,
}) => {
  const dict = useDictionary();
  const t = dict.twoFactor;
  const activeLocale = useLocale();
  const locale = localeMetaFor(activeLocale).bcp47;
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [action, setAction] = useState<TwoFactorAction | null>(null);

  // Bumped after enabling or changing two-factor sign-in, to read the status again.
  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await fetchTwoFactorStatus();
        if (cancelled) return;
        setStatus(next);
        setLoadFailed(false);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger, reloadKey]);

  const enabledOn = status?.enabled_at
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(status.enabled_at))
    : null;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-3 border-t border-border-color pt-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-accent-amber" />
          <h3 className="type-label-sm text-text-primary">{t.sectionTitle}</h3>
        </div>
        {status?.available ? (
          <Switch
            checked={status.enabled || setupOpen}
            onChange={(on) => (on ? setSetupOpen(true) : setAction('disable'))}
            ariaLabel={t.sectionTitle}
            disabled={needsPassword && !status.enabled}
          />
        ) : null}
      </div>

      <p className="type-caption text-text-muted">{t.description}</p>

      {loadFailed ? (
        <p role="alert" className="type-strong text-accent-red">
          {t.loadFailed}
        </p>
      ) : null}

      {status && !status.available ? <p className="type-strong text-text-muted">{t.unavailable}</p> : null}

      {status?.available && !status.enabled && needsPassword ? (
        <p className="type-caption text-text-muted">{t.needsPasswordHint}</p>
      ) : null}

      {status?.available && status.enabled ? (
        <>
          <ul className="flex flex-col gap-0.5 type-body text-text-secondary">
            {enabledOn ? <li>{formatMessage(t.enabledSince, { date: enabledOn })}</li> : null}
            <li>{formatMessage(t.recoveryRemaining, { count: status.recovery_codes_remaining })}</li>
          </ul>
          <div>
            <Button variant="secondary" size="sm" onClick={() => setAction('regenerate')}>
              <span>{t.regenerateButton}</span>
            </Button>
          </div>
        </>
      ) : null}

      <TwoFactorSetupModal
        isOpen={setupOpen}
        onClose={() => setSetupOpen(false)}
        onEnabled={() => {
          setStatus((prev) => (prev ? { ...prev, enabled: true } : prev));
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
