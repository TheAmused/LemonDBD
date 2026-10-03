'use client';
// frontend/src/components/admin/AdminCreateUserModal.tsx

import React, { useState } from 'react';
import type { Dictionary } from '@/locales/types';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/Field';
import { useDictionary } from "@/context/DictionaryContext";

interface AdminCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: {
    username: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
  }) => Promise<void>;
}

export const AdminCreateUserModal: React.FC<AdminCreateUserModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const dict = useDictionary();
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
      title={dict.admin.createUserTitle}
      closeButtonAriaLabel={dict.admin.closeSymbol}
      busy={isSubmitting}
      padded
      footerClassName="justify-end flex-col-reverse sm:flex-row"
      footer={
        <>
          <Button size="sm" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
            {dict.admin.cancel}
          </Button>
          <Button
            type="submit"
            form="admin-create-user-form"
            variant="primary"
            size="sm"
            loading={isSubmitting}
            leftIcon={<UserPlus className="h-3.5 w-3.5" />}
            className="w-full sm:w-auto"
          >
            <span>{dict.admin.createAccount}</span>
          </Button>
        </>
      }
    >
    <form id="admin-create-user-form" onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block type-label-xs text-text-secondary mb-1">
          {dict.admin.thUsername}
        </label>
        <Input
          type="text"
            data-autofocus
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={dict.admin.createUserUsernamePlaceholder}
        />
      </div>

      <div>
        <label className="block type-label-xs text-text-secondary mb-1">
          {dict.admin.thEmail}
        </label>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={dict.admin.createUserEmailPlaceholder}
        />
      </div>

      <div>
        <label className="block type-label-xs text-text-secondary mb-1">
          {dict.admin.thPassword}
        </label>
        <Input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={dict.admin.createUserPasswordPlaceholder}
        />
      </div>

      <div>
        <label className="block type-label-xs text-text-secondary mb-1">
          {dict.admin.rolePrivilege}
        </label>
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
          className="[&>option]:bg-bg-surface [&>option]:text-text-primary"
        >
          <option value="user">{dict.admin.roleStandard}</option>
          <option value="admin">{dict.admin.roleAdministrator}</option>
        </Select>
      </div>
      </form>
    </Modal>
  );
};
