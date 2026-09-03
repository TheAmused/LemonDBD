'use client';
// frontend/src/components/admin/AdminReasonModal.tsx

import React, { useEffect, useState } from 'react';
import type { Dictionary } from '@/locales/types';
import { X, Ban } from 'lucide-react';

export interface AdminReasonModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  dict?: Dictionary;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export const AdminReasonModal: React.FC<AdminReasonModalProps> = ({
  isOpen,
  title,
  subtitle,
  confirmLabel = 'Disable',
  dict,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-bg-surface border border-border-color rounded-2xl shadow-2xl overflow-hidden cursor-default transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border-color bg-bg-primary">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-red/10 border border-accent-red/20 rounded-xl text-accent-red">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-text-primary tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={dict?.admin?.closeSymbol || 'Close'}
            className="p-1.5 text-text-muted hover:text-text-primary bg-bg-elevated hover:bg-border-color rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            {dict?.admin?.reasonShownToPlayers || 'Reason'}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={255}
            autoFocus
            placeholder={dict?.admin?.reasonPlaceholder || ''}
            className="w-full rounded-xl bg-bg-primary border border-border-color text-sm text-text-primary placeholder:text-text-muted p-3 focus:outline-none focus:ring-2 focus:ring-accent-red resize-none"
          />
          <p className="text-right text-[10px] text-text-muted font-mono">{reason.length}/255</p>
        </div>

        <div className="p-4 border-t border-border-color bg-bg-primary flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary border border-border-color bg-bg-surface hover:bg-bg-elevated transition-colors cursor-pointer shadow-xs"
          >
            {dict?.admin?.cancel || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-accent-red hover:bg-red-600 text-text-inverted transition-all cursor-pointer shadow-md shadow-accent-red/20"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

