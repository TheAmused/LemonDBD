'use client';
import { PadlockHeartIcon } from '@/components/icons/DbdIcons';
// frontend/src/components/auth/ResetPasswordClient.tsx

import React, { Suspense, useState } from 'react';
import { FieldLabel, IconInput } from '@/components/common/Field';
import { Button, buttonClassName } from '@/components/common/Button';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { LemonIcon } from '@/components/LemonIcon';
import { useAuth } from '@/context/AuthContext';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { formatMessage } from '@/utils/i18nFormat';
import { Surface } from '@/components/common/Surface';
import { CenteredScreen } from '@/components/layout/CenteredScreen';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const token = searchParams.get('token') || '';
  const { resetPassword } = useAuth();

  const dict = useDictionary();
  const minPasswordLength = useSiteConfig().limits.passwordMinLength;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError(dict.user.missingResetToken);
      return;
    }
    if (password.length < minPasswordLength) {
      setError(formatMessage(dict.user.passwordTooShort, { min: minPasswordLength }));
      return;
    }
    if (password !== confirmPassword) {
      setError(dict.user.passwordsDoNotMatch);
      return;
    }

    setLoading(true);
    const res = await resetPassword(token, password);
    setLoading(false);

    if (res.success) {
      setDone(true);
    } else {
      setError(res.error || dict.user.failedToResetPassword);
    }
  };

  return (
    <CenteredScreen className="text-text-primary">
      {!done && (
        <div className="flex flex-col items-center text-center mb-6">
          <Surface tone="elevated" padding="none" className="relative mb-3 flex h-14 w-14 items-center justify-center p-2.5 shadow-sm">
            <LemonIcon className="h-9 w-9" />
          </Surface>
          <h1 className="text-xl font-black tracking-wider">
            {dict.user.setNewPassword}
          </h1>
        </div>
      )}

      {done ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-accent-green mb-3" />
          <p className="text-sm text-text-secondary mb-5">
            {dict.user.passwordResetSuccess}
          </p>
          <Link
            href={`/${locale}`}
            className={buttonClassName('primary', 'md')}
          >
            {dict.user.goToHome}
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3.5">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-card border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red shadow-sm"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <FieldLabel>
              {dict.user.newPassword}
            </FieldLabel>
            <IconInput icon={PadlockHeartIcon} type="password" className="pl-10" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div>
            <FieldLabel>
              {dict.user.confirmPassword}
            </FieldLabel>
            <IconInput icon={PadlockHeartIcon} type="password" className="pl-10" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
            <span>{dict.user.confirmNewPassword}</span>
          </Button>
        </form>
      )}
    </CenteredScreen>
  );
}

export function ResetPasswordClient() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
