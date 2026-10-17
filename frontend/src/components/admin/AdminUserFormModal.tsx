'use client';
// frontend/src/components/admin/AdminUserFormModal.tsx
//
// One form for both account dialogs: "Create user" (login, name, email, password, role) and
// "Edit user" (display name, role, e-mail verified). The login and e-mail of an existing account are
// shown but not editable here.
import React, { useEffect, useState } from 'react';
import { Save, UserPlus } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import { Input } from '@/components/common/Field';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import type { NewUser, UserPatch, UserRow } from '@/types/admin';

const MIN_PASSWORD = 6;
const FORM_ID = 'admin-user-form';

interface AdminUserFormModalProps {
  /** `null` closed, `'new'` the create form, a user the edit form. */
  target: UserRow | 'new' | null;
  /** The signed-in admin: they cannot take their own admin role away. */
  currentUserId?: number;
  onClose: () => void;
  onCreate: (user: NewUser) => Promise<boolean>;
  onUpdate: (user: UserRow, patch: UserPatch) => Promise<boolean>;
}

const EMPTY: NewUser = { login: '', username: '', email: '', password: '', role: 'user' };

export function AdminUserFormModal({ target, currentUserId, onClose, onCreate, onUpdate }: AdminUserFormModalProps) {
  const dict = useDictionary();
  const t = dict.admin;
  const editing = target !== null && target !== 'new' ? target : null;
  const [form, setForm] = useState<NewUser>(EMPTY);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target === null) return;
    if (target === 'new') {
      setForm(EMPTY);
      return;
    }
    setForm({ ...EMPTY, login: target.login, username: target.username, email: target.email, role: target.role === 'admin' ? 'admin' : 'user' });
    setVerified(!!target.is_verified);
  }, [target]);

  const field = (key: keyof NewUser) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        const patch: UserPatch = {
          ...(form.username.trim() !== editing.username ? { username: form.username.trim() } : {}),
          ...(form.role !== editing.role ? { role: form.role } : {}),
          ...(verified !== !!editing.is_verified ? { is_verified: verified } : {}),
        };
        if (Object.keys(patch).length === 0 || (await onUpdate(editing, patch))) onClose();
        return;
      }
      if (await onCreate({ ...form, login: form.login.trim(), username: form.username.trim(), email: form.email.trim() })) onClose();
    } finally {
      setBusy(false);
    }
  };

  const ownAccount = editing?.id === currentUserId;

  return (
    <Modal
      isOpen={target !== null}
      onClose={onClose}
      variant="dialog"
      size="md"
      title={editing ? formatMessage(t.editUserTitle, { username: editing.username }) : t.createUserTitle}
      closeButtonAriaLabel={t.close}
      busy={busy}
      padded
      footerClassName="justify-end flex-col-reverse sm:flex-row"
      footer={
        <>
          <Button size="sm" onClick={onClose} disabled={busy} className="w-full sm:w-auto">
            {t.cancel}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            size="sm"
            loading={busy}
            leftIcon={editing ? <Save className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            className="w-full sm:w-auto"
          >
            {editing ? t.saveUser : t.createAccount}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="space-y-4">
        {editing ? (
          <dl className="grid grid-cols-1 gap-3 rounded-card bg-bg-primary/60 p-3 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="type-label-xs text-text-secondary">{t.thLogin}</dt>
              <dd className="truncate type-strong text-text-primary">{editing.login}</dd>
            </div>
            <div className="min-w-0">
              <dt className="type-label-xs text-text-secondary">{t.thEmail}</dt>
              <dd className="truncate type-strong text-text-primary">{editing.email}</dd>
            </div>
          </dl>
        ) : (
          <label className="block space-y-1">
            <span className="block type-label-xs text-text-secondary">{t.thLogin}</span>
            <Input data-autofocus required minLength={3} value={form.login} onChange={field('login')} placeholder={t.createUserLoginPlaceholder} />
          </label>
        )}

        <label className="block space-y-1">
          <span className="block type-label-xs text-text-secondary">{t.thUsername}</span>
          <Input required minLength={3} maxLength={50} value={form.username} onChange={field('username')} placeholder={t.createUserUsernamePlaceholder} />
        </label>

        {!editing && (
          <>
            <label className="block space-y-1">
              <span className="block type-label-xs text-text-secondary">{t.thEmail}</span>
              <Input type="email" required value={form.email} onChange={field('email')} placeholder={t.createUserEmailPlaceholder} />
            </label>
            <label className="block space-y-1">
              <span className="block type-label-xs text-text-secondary">{t.thPassword}</span>
              <Input
                type="password"
                required
                minLength={MIN_PASSWORD}
                autoComplete="new-password"
                value={form.password}
                onChange={field('password')}
                placeholder={formatMessage(t.createUserPasswordPlaceholder, { min: MIN_PASSWORD })}
              />
            </label>
          </>
        )}

        <label className="block space-y-1">
          <span className="block type-label-xs text-text-secondary">{t.rolePrivilege}</span>
          <div className={ownAccount ? 'pointer-events-none opacity-60' : undefined} aria-disabled={ownAccount}>
          <CustomDropdown<NewUser['role']>
            ariaLabel={t.rolePrivilege}
            accent="primary"
            className="w-full"
            buttonClassName="w-full justify-between py-2.5"
            menuClassName="w-full"
            value={form.role}
            onChange={(role) => !ownAccount && setForm((f) => ({ ...f, role }))}
            options={[
              { value: 'user', label: t.roleStandard },
              { value: 'admin', label: t.roleAdministrator },
            ]}
          />
          </div>
          {ownAccount && <span className="block type-caption text-text-muted">{t.ownRoleLocked}</span>}
        </label>

        {editing && (
          <Checkbox checked={verified} onChange={setVerified}>
            <span className="type-body text-text-primary">{t.emailVerifiedLabel}</span>
          </Checkbox>
        )}
      </form>
    </Modal>
  );
}
