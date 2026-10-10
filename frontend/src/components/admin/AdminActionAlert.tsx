'use client';
// frontend/src/components/admin/AdminActionAlert.tsx
import React from 'react';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import type { ActionMessage } from '@/types/admin';

/** Success / error banner for the last admin action. */
export function AdminActionAlert({ message, onDismiss }: { message: ActionMessage; onDismiss: () => void }) {
  const dict = useDictionary();

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-center justify-between rounded-xl border p-4 text-xs font-semibold shadow-xs ${
        message.type === 'success'
          ? 'border-accent-green/40 bg-accent-green/10 text-accent-green'
          : 'border-accent-red/40 bg-accent-red/10 text-accent-red'
      }`}
    >
      <span>{message.text}</span>
      <Button
        variant="ghost"
        size="xs"
        icon
        onClick={() => onDismiss()}
        className="ml-3"
        aria-label={dict.admin.closeSymbol}
      >
        {dict.admin.closeSymbol}
      </Button>
    </div>
  );
}
