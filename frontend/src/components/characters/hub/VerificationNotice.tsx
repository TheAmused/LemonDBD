'use client';
// frontend/src/components/characters/hub/VerificationNotice.tsx
import React from 'react';
import { MailWarning } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';

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
        className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-accent-amber px-5 py-3 type-strong text-text-inverted shadow-2xl ring-2 ring-accent-amber/50 animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <MailWarning className="h-4 w-4 shrink-0" />
        <span>{dict.user.verifyEmailRequired}</span>
        <button
          type="button"
          onClick={onVerify}
          className="rounded-lg bg-text-inverted/20 px-3 py-1 type-label-xs hover:bg-text-inverted/30 transition-colors cursor-pointer"
        >
          {dict.streaks.verifyEmail}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="type-strong-xs underline cursor-pointer"
        >
          {dict.characterDetail.dismiss}
        </button>
      </div>
    </div>
  );
}
