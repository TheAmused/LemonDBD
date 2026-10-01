'use client';
// frontend/src/components/admin/AdminCreateUserModal.tsx

import React, { useState } from 'react';
import type { Dictionary } from '@/locales/types';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="md"
      tone="warning"
      icon={<UserPlus className="h-5 w-5" aria-hidden="true" />}
      title={dict?.admin?.createUserTitle || 'Create New User'}
      closeButtonAriaLabel={dict?.admin?.closeSymbol || 'Close'}
      busy={isSubmitting}
      padded
      footerClassName="justify-end flex-col-reverse sm:flex-row"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated px-4 py-2 text-xs font-semibold text-text-primary transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {dict?.admin?.cancel || 'Cancel'}
          </button>
          <button
            type="submit"
            form="admin-create-user-form"
            disabled={isSubmitting}
            className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-accent-red hover:bg-accent-red-hover px-4 py-2 text-xs font-black uppercase tracking-wider text-text-inverted shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Spinner size="xs" tone="inverted" />
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" />
                <span>{dict?.admin?.createAccount || 'Create Account'}</span>
              </>
            )}
          </button>
        </>
      }
    >
    <form id="admin-create-user-form" onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
          {dict?.admin?.thUsername || 'Username'}
        </label>
        <input
          type="text"
            data-autofocus
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={dict?.admin?.createUserUsernamePlaceholder || ''}
          className="w-full rounded-xl border border-border-color bg-bg-primary py-2 px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-red focus:outline-none shadow-inner"
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
          className="w-full rounded-xl border border-border-color bg-bg-primary py-2 px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-red focus:outline-none shadow-inner"
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
          className="w-full rounded-xl border border-border-color bg-bg-primary py-2 px-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-red focus:outline-none shadow-inner"
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
          {dict?.admin?.rolePrivilege || 'Role Privilege'}
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
          className="w-full rounded-xl border border-border-color bg-bg-primary py-2 px-3 text-xs text-text-primary focus:border-accent-red focus:outline-none shadow-inner cursor-pointer [&>option]:bg-bg-surface [&>option]:text-text-primary"
        >
          <option value="user">{dict?.admin?.roleStandard || 'Standard User'}</option>
          <option value="admin">{dict?.admin?.roleAdministrator || 'Administrator'}</option>
        </select>
      </div>
      </form>
    </Modal>
  );
};
