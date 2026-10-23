'use client';
// frontend/src/components/user/SignOutEverywhereSection.tsx
//
// "Sign out everywhere" on the profile page: ends every session of the account on all devices
// (the server bumps the account's token version), then signs this browser out as well.

import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';
import { useAuth } from '@/context/AuthContext';
import { useDictionary } from '@/context/DictionaryContext';
import { signOutEverywhere } from '@/services/userProfileApi';
import { trackEvent } from '@/utils/analytics';

export const SignOutEverywhereSection: React.FC<{ className?: string }> = ({ className }) => {
  const dict = useDictionary();
  const t = dict.user;
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await signOutEverywhere();
      trackEvent('sign_out_everywhere');
      logout();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon
        className={className}
        onClick={() => { void handleClick(); }}
        loading={busy}
        leftIcon={<LogOut className="h-3.5 w-3.5" />}
        aria-label={t.signOutEverywhereTitle}
        {...tip(t.signOutEverywhereTitle, t.signOutEverywhereDesc, 'action')}
      />
      {failed ? <span role="alert" className="type-strong text-accent-red">{t.signOutEverywhereFailed}</span> : null}
    </>
  );
};
