'use client';
// frontend/src/components/auth/ResetPasswordClient.tsx

import React, { Suspense, useState } from 'react';
import { Input } from '@/components/common/Field';
import { Button, buttonClassName } from '@/components/common/Button';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { LemonIcon } from '@/components/LemonIcon';
import { useAuth } from '@/context/AuthContext';
import { useDictionary, useLocale } from '@/context/DictionaryContext';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const token = searchParams.get('token') || '';
  const { resetPassword } = useAuth();

  const dict = useDictionary();
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
    if (password.length < 6) {
      setError(dict.user.passwordTooShort);
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border-color bg-bg-surface p-8 text-text-primary shadow-2xl">
        {!done && (
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-elevated p-2.5 border border-border-color shadow-sm">
              <LemonIcon className="h-9 w-9" />
            </div>
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
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2.5 rounded-xl border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red shadow-sm"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block type-label-xs text-text-secondary mb-1">
                {dict.user.newPassword}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block type-label-xs text-text-secondary mb-1">
                {dict.user.confirmPassword}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <Input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
              <span>{dict.user.confirmNewPassword}</span>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export function ResetPasswordClient() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
