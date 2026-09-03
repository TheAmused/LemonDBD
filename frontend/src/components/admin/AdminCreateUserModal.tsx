'use client';
// frontend/src/components/admin/AdminCreateUserModal.tsx

import React, { useState } from 'react';
import type { Dictionary } from '@/locales/types';
import { UserPlus, X } from 'lucide-react';

interface AdminCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: {
    username: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
  }) => Promise<void>;
  dict?: Dictionary;
}

export const AdminCreateUserModal: React.FC<AdminCreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  dict,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ username, email, password, role });
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={() => !isSubmitting && onClose()}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border-color bg-bg-surface p-6 text-text-primary shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 z-10 transition-colors">
        <button
          type="button"
          onClick={() => !isSubmitting && onClose()}
          aria-label={dict?.admin?.closeSymbol || 'Close'}
          className="absolute right-4 top-4 rounded-xl p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-amber/15 border border-accent-amber/30 text-accent-amber shadow-xs">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-wider text-text-primary font-mono">
              {dict?.admin?.createUserTitle || 'Create New User'}
            </h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
              {dict?.admin?.thUsername || 'Username'}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={dict?.admin?.createUserUsernamePlaceholder || ''}
              className="w-full rounded-xl border border-border-color bg-bg-primary py-2 px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-amber focus:outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
              {dict?.admin?.thEmail || 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={dict?.admin?.createUserEmailPlaceholder || ''}
              className="w-full rounded-xl border border-border-color bg-bg-primary py-2 px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-amber focus:outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
              {dict?.admin?.thPassword || 'Password'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={dict?.admin?.createUserPasswordPlaceholder || ''}
              className="w-full rounded-xl border border-border-color bg-bg-primary py-2 px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-amber focus:outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
              {dict?.admin?.rolePrivilege || 'Role Privilege'}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
              className="w-full rounded-xl border border-border-color bg-bg-primary py-2 px-3 text-xs text-text-primary focus:border-accent-amber focus:outline-none shadow-inner cursor-pointer [&>option]:bg-bg-surface [&>option]:text-text-primary"
            >
              <option value="user">{dict?.admin?.roleStandard || 'Standard User'}</option>
              <option value="admin">{dict?.admin?.roleAdministrator || 'Administrator'}</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated px-4 py-2 text-xs font-semibold text-text-primary transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {dict?.admin?.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-amber to-accent-amber-hover px-4 py-2 text-xs font-black uppercase tracking-wider text-text-inverted shadow-md shadow-accent-amber/20 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-text-inverted border-t-transparent" />
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{dict?.admin?.createAccount || 'Create Account'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

