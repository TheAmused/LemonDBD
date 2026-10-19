'use client';
// frontend/src/components/admin/AdminUserFormModal.tsx
//
// One form for both account dialogs: "Create user" (login, name, email, password, role) and
// "Edit user" (display name, role, e-mail verified). The login and e-mail of an existing account are
// shown but not editable here.
import React, { useEffect, useId, useState } from 'react';
import { Save, UserPlus } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import { FieldLabel, FormField, Input } from '@/components/common/Field';
import { Surface } from '@/components/common/Surface';
import { useDictionary } from '@/context/DictionaryContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { formatMessage } from '@/utils/i18nFormat';
import type { NewUser, UserPatch, UserRow } from '@/types/admin';

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
  // The minimum is an admin setting (Settings > Limits); the server enforces the same number.
  const minPasswordLength = useSiteConfig().limits.passwordMinLength;
  const ids = useId();
  const editing = target !== null && target !== 'new' ? target : null;
  const [form, setForm] = useState<NewUser>(EMPTY);
  const [verified, setVerified] = useState(false);
  const [ownPassword, setOwnPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target === null) return;
    if (target === 'new') {
      setForm(EMPTY);
      return;
    }
    setForm({ ...EMPTY, login: target.login, username: target.username, email: target.email, role: target.role === 'admin' ? 'admin' : 'user' });
    setVerified(!!target.is_verified);
    setOwnPassword('');
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
          ...(demotesAnotherAdmin ? { current_password: ownPassword } : {}),
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
  /** Taking the admin role from another admin needs the acting admin's own password (the server checks it). */
  const demotesAnotherAdmin = Boolean(editing && !ownAccount && editing.role === 'admin' && form.role === 'user');

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
            leftIcon={editing ? <Save className="icon-sm" /> : <UserPlus className="icon-sm" />}
            className="w-full sm:w-auto"
          >
            {editing ? t.saveUser : t.createAccount}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="space-y-4">
        {editing ? (
          <Surface as="aside" tone="inset" padding="sm">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="type-label-xs text-text-secondary">{t.thLogin}</dt>
                <dd className="truncate type-strong text-text-primary">{editing.login}</dd>
              </div>
              <div className="min-w-0">
                <dt className="type-label-xs text-text-secondary">{t.thEmail}</dt>
                <dd className="truncate type-strong text-text-primary">{editing.email}</dd>
              </div>
            </dl>
          </Surface>
        ) : (
          <FormField label={t.thLogin} htmlFor={`${ids}-login`}>
            <Input id={`${ids}-login`} data-autofocus required minLength={3} value={form.login} onChange={field('login')} placeholder={t.createUserLoginPlaceholder} />
          </FormField>
        )}

        <FormField label={t.thUsername} htmlFor={`${ids}-username`}>
          <Input id={`${ids}-username`} required minLength={3} maxLength={50} value={form.username} onChange={field('username')} placeholder={t.createUserUsernamePlaceholder} />
        </FormField>

        {!editing && (
          <>
            <FormField label={t.thEmail} htmlFor={`${ids}-email`}>
              <Input id={`${ids}-email`} type="email" required value={form.email} onChange={field('email')} placeholder={t.createUserEmailPlaceholder} />
            </FormField>
            <FormField label={t.thPassword} htmlFor={`${ids}-password`}>
              <Input
                id={`${ids}-password`}
                type="password"
                required
                minLength={minPasswordLength}
                autoComplete="new-password"
                value={form.password}
                onChange={field('password')}
                placeholder={formatMessage(t.createUserPasswordPlaceholder, { min: minPasswordLength })}
              />
            </FormField>
          </>
        )}

        <div>
          <FieldLabel as="span">{t.rolePrivilege}</FieldLabel>
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
        </div>

        {demotesAnotherAdmin && (
          <FormField label={t.confirmOwnPasswordLabel} htmlFor={`${ids}-own-password`}>
            <Input
              id={`${ids}-own-password`}
              type="password"
              required
              autoComplete="current-password"
              value={ownPassword}
              onChange={(e) => setOwnPassword(e.target.value)}
            />
            <span className="block type-caption text-text-muted">{t.confirmOwnPasswordHint}</span>
          </FormField>
        )}

        {editing && (
          <Checkbox checked={verified} onChange={setVerified}>
            <span className="type-body text-text-primary">{t.emailVerifiedLabel}</span>
          </Checkbox>
        )}
      </form>
    </Modal>
  );
}
