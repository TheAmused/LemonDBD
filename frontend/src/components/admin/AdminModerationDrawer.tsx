'use client';
// frontend/src/components/admin/AdminModerationDrawer.tsx
//
// Everything an admin can do about one account's conduct: where it stands, its history of warnings,
// suspensions and bans, and a form for the next decision. Every decision is confirmed first.

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { ModerationReasonModal } from '@/components/admin/ModerationReasonModal';
import { SanctionForm } from '@/components/admin/SanctionForm';
import { SanctionHistory } from '@/components/admin/SanctionHistory';
import { useUserModeration } from '@/components/admin/useUserModeration';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { formatDateTime } from '@/utils/format';
import { formatMessage } from '@/utils/i18nFormat';
import {
  EMPTY_SANCTION_DRAFT,
  SANCTION_KINDS,
  draftFromSuggestion,
  isSanctionDraftValid,
  type AdminSanction,
  type SanctionDraft,
} from '@/types/moderation';
import type { ActionMessage, UserRow } from '@/types/admin';

interface AdminModerationDrawerProps {
  user: UserRow | null;
  onClose: () => void;
  /** The account's standing may have changed: refresh the user list. */
  onChanged: () => void;
  onActionMessage: (message: ActionMessage | null) => void;
}

export function AdminModerationDrawer({ user, onClose, onChanged, onActionMessage }: AdminModerationDrawerProps) {
  const dict = useDictionary();
  const locale = useLocale();
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

  useEffect(() => {
    setDraft(EMPTY_SANCTION_DRAFT);
  }, [user?.id]);

  const summary = data?.summary;
  const suggestion = summary?.suggestion ?? null;
  const blocked = !!summary && (summary.banned || summary.suspended_until !== null);
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
        title={formatMessage(t.drawerTitle, { username })}
        closeButtonAriaLabel={dict.admin.close}
        padded
        bodyClassName="space-y-6"
      >
        {loading && !data && (
          <div className="flex justify-center py-10">
            <Spinner tone="accent" size="lg" />
          </div>
        )}

        {loadFailed && (
          <div className="space-y-3">
            <p role="alert" className="type-body text-accent-red">{t.loadFailed}</p>
            <Button size="sm" onClick={reload}>{dict.admin.refresh}</Button>
          </div>
        )}

        {summary && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {summary.banned ? (
                <Badge tone="red" size="md">{t.standingBanned}</Badge>
              ) : summary.suspended_until ? (
                <Badge tone="red" size="md">
                  {formatMessage(t.standingSuspended, { date: formatDateTime(summary.suspended_until, locale) })}
                </Badge>
              ) : (
                <Badge tone="green" size="md">{t.standingActive}</Badge>
              )}
              {blocked && (
                <Button size="sm" disabled={saving} onClick={() => setRestoring(true)}>
                  {t.restoreButton}
                </Button>
              )}
            </div>
            <dl className="grid grid-cols-3 gap-2">
              {[
                [t.statWarnings, `${summary.active_warnings} / ${summary.total_warnings}`],
                [t.statSuspensions, String(summary.total_suspensions)],
                [t.statBlockedContent, String(summary.content_blocked)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-card border border-border-color bg-bg-primary p-2.5">
                  <dt className="type-label-2xs text-text-secondary">{label}</dt>
                  <dd className="type-strong text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
            {suggestion && (
              <div className="space-y-2 rounded-card border border-border-color bg-bg-primary p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="type-label-2xs text-text-secondary">{t.suggestionTitle}</p>
                    <p className="type-strong text-text-primary">{suggestionLabel}</p>
                  </div>
                  <Button size="sm" onClick={() => setDraft((d) => draftFromSuggestion(d, suggestion))}>
                    {t.suggestionApply}
                  </Button>
                </div>
                <p className="type-body text-text-muted">
                  {formatMessage(t.suggestionBasis, {
                    active: suggestion.basis.active_warnings,
                    needed: suggestion.basis.warnings_before_suspension,
                    suspensions: suggestion.basis.suspensions,
                  })}
                </p>
                <p className="type-body text-text-muted">{t.suggestionHint}</p>
              </div>
            )}
          </section>
        )}

        {user && (
          <section className="space-y-3">
            <h3 className="type-label-sm text-text-secondary">{t.formTitle}</h3>
            <SanctionForm draft={draft} kinds={SANCTION_KINDS} previewTarget={{ userId: user.id }} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
            <Button
              variant={draft.kind === 'warning' ? 'primary' : 'danger'}
              size="sm"
              disabled={saving || !isSanctionDraftValid(draft)}
              onClick={() => setConfirmingDraft(true)}
            >
              {submitLabel}
            </Button>
          </section>
        )}

        {data && (
          <section className="space-y-3">
            <h3 className="type-label-sm text-text-secondary">{t.historyTitle}</h3>
            <SanctionHistory sanctions={data.sanctions} busy={saving} onRevoke={setRevoking} />
          </section>
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
