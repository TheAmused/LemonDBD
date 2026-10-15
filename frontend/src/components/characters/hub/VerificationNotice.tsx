'use client';
// frontend/src/components/characters/hub/VerificationNotice.tsx
import React from 'react';
import { MailWarning } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { InlineLink } from '@/components/common/InlineLink';
import { Button } from '@/components/common/Button';

interface VerificationNoticeProps {
  onVerify: () => void;
  onDismiss: () => void;
}

/** Toast asking an unverified user to verify their email before using ownership mode. */
export function VerificationNotice({ onVerify, onDismiss }: VerificationNoticeProps) {
  const dict = useDictionary();

  return (
    <div className="fixed top-6 left-[var(--sidebar-width,0rem)] right-0 z-50 flex justify-center pointer-events-none transition-[left] duration-300 px-4">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 rounded-card bg-accent-amber px-5 py-3 type-strong text-text-inverted shadow-2xl ring-2 ring-accent-amber/50 animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <MailWarning className="h-4 w-4 shrink-0" />
        <span>{dict.user.verifyEmailRequired}</span>
        <Button variant="onAccent" size="xs" onClick={onVerify}>
          {dict.streaks.verifyEmail}
        </Button>
        <InlineLink tone="current" onClick={onDismiss} className="type-strong-xs">
          {dict.characterDetail.dismiss}
        </InlineLink>
      </div>
    </div>
  );
}
