'use client';
// frontend/src/components/admin/AdminModerationDrawer.tsx
//
// Everything an admin can do about one account's conduct, in foldable sections under the profile card:
// the next decision (with a preview of what the user will be told) and the history of warnings,
// suspensions and bans. Every decision is confirmed first.

import React, { useState } from 'react';
import { AccordionSection } from '@/components/common/AccordionSection';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { Surface } from '@/components/common/Surface';
import { Switch } from '@/components/common/Switch';
import { ADMIN_STORAGE } from '@/components/admin/adminStorage';
import { ModerationProfileCard } from '@/components/admin/ModerationProfileCard';
import { ModerationReasonModal } from '@/components/admin/ModerationReasonModal';
import { SanctionForm } from '@/components/admin/SanctionForm';
import { SanctionHistory } from '@/components/admin/SanctionHistory';
import { useUserModeration } from '@/components/admin/useUserModeration';
import { useDictionary } from '@/context/DictionaryContext';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { formatMessage } from '@/utils/i18nFormat';
import {
  EMPTY_SANCTION_DRAFT,
  SANCTION_KINDS,
  draftFromSuggestion,
  isSanctionDraftValid,
  patchDraft,
  type AdminSanction,
  type SanctionDraft,
} from '@/types/moderation';
import type { ActionMessage, UserRow } from '@/types/admin';
import { useOnValueChange } from '@/hooks/useOnValueChange';

interface AdminModerationDrawerProps {
  user: UserRow | null;
  onClose: () => void;
  /** The account's standing may have changed: refresh the user list. */
  onChanged: () => void;
  onActionMessage: (message: ActionMessage | null) => void;
}

export function AdminModerationDrawer({ user, onClose, onChanged, onActionMessage }: AdminModerationDrawerProps) {
  const dict = useDictionary();
  const t = dict.moderation.admin;
  const { data, loading, loadFailed, saving, reload, issue, revoke, restore } = useUserModeration({
    userId: user?.id ?? null,
    username: user?.username ?? '',
    onChanged,
    onActionMessage,
  });
  const [draft, setDraft] = useState<SanctionDraft>(EMPTY_SANCTION_DRAFT);
  const [confirmingDraft, setConfirmingDraft] = useState(false);
  const [revoking, setRevoking] = useState<AdminSanction | null>(null);
  const [restoring, setRestoring] = useState(false);
  // Each section folds away like the profile page's drawers, and is remembered.
  const [isHistoryOpen, toggleHistory] = usePersistentDrawer(ADMIN_STORAGE.moderationHistoryOpen, false);

  // Another user's drawer starts from an empty sanction.
  useOnValueChange(user?.id, () => setDraft(EMPTY_SANCTION_DRAFT));

  const summary = data?.summary;
  const suggestion = summary?.suggestion ?? null;
  const username = user?.username ?? '';

  const confirmMessage =
    draft.kind === 'warning'
      ? formatMessage(t.confirmWarning, { username })
      : draft.kind === 'suspension'
        ? formatMessage(t.confirmSuspension, { username, days: draft.duration_days })
        : formatMessage(t.confirmBan, { username });
  const submitLabel =
    draft.kind === 'warning' ? t.submitWarning : draft.kind === 'suspension' ? t.submitSuspension : t.submitBan;

  const suggestionLabel = suggestion
    ? suggestion.kind === 'warning'
      ? t.suggestionWarning
      : suggestion.kind === 'suspension'
        ? formatMessage(t.suggestionSuspension, { days: suggestion.duration_days ?? 0 })
        : t.suggestionBan
    : '';

  const submit = async () => {
    if (await issue(draft)) setDraft(EMPTY_SANCTION_DRAFT);
    setConfirmingDraft(false);
  };

  return (
    <>
      <Modal
        isOpen={user !== null}
        onClose={onClose}
        variant="drawer-right"
        size="lg"
        title={t.drawerTitle}
        closeButtonAriaLabel={dict.admin.close}
        padded
        bodyClassName="space-y-5"
      >
        {user && (
          <ModerationProfileCard user={user} summary={summary ?? null} busy={saving} onRestore={() => setRestoring(true)} />
        )}

        {loading && !data && (
          <div className="flex justify-center py-6">
            <Spinner tone="accent" size="lg" />
          </div>
        )}

        {loadFailed && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p role="alert" className="type-body text-accent-red">{t.loadFailed}</p>
            <Button size="sm" onClick={reload}>{dict.admin.refresh}</Button>
          </div>
        )}

        {user && (
          <>
            <hr className="border-border-color" />

            <Surface tone="well" padding="sm" className="space-y-3">
              {suggestion && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="type-label-xs text-text-secondary">
                        {t.suggestionTitle}: <span className="text-text-primary">{suggestionLabel}</span>
                      </p>
                      <p className="mt-0.5 type-caption text-text-muted">
                        {formatMessage(t.suggestionBasis, {
                          active: suggestion.basis.active_warnings,
                          needed: suggestion.basis.warnings_before_suspension,
                          suspensions: suggestion.basis.suspensions,
                        })}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setDraft((d) => draftFromSuggestion(d, suggestion))}>
                      {t.suggestionApply}
                    </Button>
                  </div>
                  <hr className="border-border-color" />
                </>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="type-body text-text-primary">{t.formSendEmail}</span>
                <Switch
                  checked={draft.send_email}
                  onChange={(send_email) => setDraft((d) => ({ ...d, send_email }))}
                  ariaLabel={t.formSendEmail}
                />
              </div>
            </Surface>

            <SanctionForm
              draft={draft}
              kinds={SANCTION_KINDS}
              previewTarget={{ userId: user.id }}
              onChange={(patch) => setDraft((d) => patchDraft(d, patch, summary?.next_suspension_days))}
            />

            <Button
              variant={draft.kind === 'warning' ? 'primary' : 'danger'}
              className="w-full"
              disabled={saving || !isSanctionDraftValid(draft)}
              onClick={() => setConfirmingDraft(true)}
            >
              {submitLabel}
            </Button>
          </>
        )}

        {data && (
          <AccordionSection
            as="div"
            title={t.historyTitle}
            badge={<Badge tone="neutral" size="sm">{data.sanctions.length}</Badge>}
            open={isHistoryOpen}
            onToggle={toggleHistory}
            bodyClassName="p-4"
          >
            <SanctionHistory sanctions={data.sanctions} busy={saving} onRevoke={setRevoking} />
          </AccordionSection>
        )}
      </Modal>

      <ConfirmModal
        open={confirmingDraft}
        title={t.confirmTitle}
        message={confirmMessage}
        confirmLabel={submitLabel}
        busy={saving}
        onConfirm={submit}
        onCancel={() => setConfirmingDraft(false)}
      />

      <ModerationReasonModal
        open={revoking !== null}
        title={t.revokeTitle}
        message={t.revokeMessage}
        confirmLabel={t.revokeConfirm}
        busy={saving}
        onCancel={() => setRevoking(null)}
        onConfirm={async (reason) => {
          if (revoking) await revoke(revoking.id, reason);
          setRevoking(null);
        }}
      />

      <ModerationReasonModal
        open={restoring}
        title={t.restoreTitle}
        message={t.restoreMessage}
        confirmLabel={t.restoreConfirm}
        busy={saving}
        onCancel={() => setRestoring(false)}
        onConfirm={async (reason) => {
          await restore(reason);
          setRestoring(false);
        }}
      />
    </>
  );
}
