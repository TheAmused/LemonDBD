'use client';
// frontend/src/components/admin/AdminReasonModal.tsx

import React, { useEffect, useState } from 'react';
import { X, Ban } from 'lucide-react';

export interface AdminReasonModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  dict?: any;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * Shared "why are you disabling this" prompt for the admin panel (challenge
 * modes, characters, perks). Replaces window.prompt() with something that
 * matches the rest of the admin UI and doesn't block on native browser
 * chrome.
 */
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
    >
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Reason (shown to players)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={255}
            autoFocus
            placeholder={dict?.admin?.reasonPlaceholder || 'e.g. power is bugged, temporarily disabled while we fix it'}
            className="w-full rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-600 p-3 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
          />
          <p className="text-right text-[10px] text-slate-600">{reason.length}/255</p>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-md shadow-rose-500/20"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
