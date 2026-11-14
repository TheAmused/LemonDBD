'use client';
// frontend/src/components/admin/AdminMaintenanceModeCard.tsx
//
// Tools > Maintenance mode: one switch closes the public side of the site. The admin panel and sign-in are
// never closed (the server sees to it) and signed-in admins can still use the site, so switching it on
// cannot lock an admin out. The window (when it starts, when it ends) is picked with the date and time
// picker; an empty start means right away and an empty end means until it is stopped. A start in the
// future is saved with the Save button (or by the switch) and shows as scheduled: the switch reads on only
// while the site is really closed, and a Cancel button stands where it will be. While a window is set the
// pickers show it and are locked. The copy lives in the admin Settings dictionary.
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/common/Button';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { DateTimePicker } from '@/components/common/DateTimePicker';
import { EmptyState } from '@/components/common/EmptyState';
import { FieldLabel } from '@/components/common/Field';
import { Switch } from '@/components/common/Switch';
import { ToolCard, ToolFormRow, ToolRow } from '@/components/admin/AdminToolParts';
import { isoToLocalInput, localInputToIso } from '@/components/admin/settingsForm';
import { useDictionary } from '@/context/DictionaryContext';
import { useAdminSettingsDict } from '@/hooks/useAdminSettingsDict';
import { fetchMaintenanceMode, saveMaintenanceMode } from '@/services/adminApi';
import { getErrorMessage } from '@/utils/api';
import type { ActionMessage, MaintenanceState } from '@/types/admin';

/** The longest a timer may wait (about 24 days); a later moment is simply checked again when it fires. */
const MAX_TIMER_MS = 2_147_000_000;
/** A label over a locked picker: dimmed like the picker itself. */
const LOCKED_LABEL = 'opacity-50';

interface MaintenanceModeCardProps {
  notify: (message: ActionMessage) => void;
  refreshKey: number;
  className?: string;
}

/** The moment the state is due to change by itself (a scheduled start, a running window's end), or NaN. */
function nextEdge(state: MaintenanceState | null): number {
  if (state?.status === 'scheduled') return Date.parse(state.starts_at ?? '');
  if (state?.status === 'active') return Date.parse(state.until ?? '');
  return Number.NaN;
}

export function AdminMaintenanceModeCard({ notify, refreshKey, className }: MaintenanceModeCardProps) {
  const t = useAdminSettingsDict();
  const dict = useDictionary();
  const [state, setState] = useState<MaintenanceState | null>(null);
  const [startDraft, setStartDraft] = useState('');
  const [endDraft, setEndDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /** Show the server's answer; the pickers follow it. A window that has already ended counts as off,
   * so it starts again from empty pickers. */
  const show = useCallback((next: MaintenanceState) => {
    setState(next);
    const set = next.status === 'active' || next.status === 'scheduled';
    setStartDraft(set ? isoToLocalInput(next.starts_at ?? '') : '');
    setEndDraft(set ? isoToLocalInput(next.until ?? '') : '');
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMaintenanceMode()
      .then((next) => !cancelled && show(next))
      .catch((err: unknown) => !cancelled && notify({ type: 'error', text: getErrorMessage(err, dict.admin.networkError) }));
    return () => {
      cancelled = true;
    };
  }, [refreshKey, show, notify, dict.admin.networkError]);

  // The page does not reload when a scheduled start arrives or a window ends: look again at that moment.
  useEffect(() => {
    const at = nextEdge(state);
    if (Number.isNaN(at)) return undefined;
    const timer = setTimeout(() => {
      void fetchMaintenanceMode().then(show).catch(() => undefined);
    }, Math.min(Math.max(at - Date.now(), 0) + 1000, MAX_TIMER_MS));
    return () => clearTimeout(timer);
  }, [state, show]);

  if (!t || !state) {
    return (
      <div className={className}>
        <EmptyState variant="inline" title={dict.admin.loading} />
      </div>
    );
  }

  const active = state.status === 'active';
  const scheduled = state.status === 'scheduled';
  const locked = active || scheduled;
  const startIso = localInputToIso(startDraft);
  const endIso = localInputToIso(endDraft);
  /** Judged when it is pressed, not while picking: a start in the past (or none) means the site closes right away. */
  const startsLater = () => startIso !== '' && Date.parse(startIso) > Date.now();

  /** Runs one change and shows the state as the server now has it. */
  const run = async (action: () => Promise<MaintenanceState>, done: string) => {
    setBusy(true);
    try {
      show(await action());
      notify({ type: 'success', text: done });
      return true;
    } catch (err: unknown) {
      notify({ type: 'error', text: getErrorMessage(err, t.mmActionFailed) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    const ok = await run(() => saveMaintenanceMode(true, startIso, endIso), startsLater() ? t.mmScheduled : t.mmStarted);
    if (ok) setConfirmOpen(false);
  };
  const stop = () => run(() => saveMaintenanceMode(false), t.mmStopped);
  /** Closing the site right away asks first; a scheduled start and switching off do not. */
  const toggle = (on: boolean) => {
    if (!on) void stop();
    else if (startsLater()) void apply();
    else setConfirmOpen(true);
  };

  const pickerLabels = { clear: t.mmPickClear, time: t.mmPickTime };

  return (
    <>
      <ToolCard id="maintenance-mode" title={t.mmTitle} className={className}>
        <ToolRow title={t.mmSwitchTitle}>
          {scheduled ? (
            <Button size="sm" loading={busy} onClick={() => { void stop(); }}>
              {t.mmCancel}
            </Button>
          ) : (
            <Switch checked={active} onChange={toggle} ariaLabel={t.mmSwitchTitle} disabled={busy} />
          )}
        </ToolRow>

        <ToolFormRow>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="mm-start" className={locked ? LOCKED_LABEL : undefined}>{t.mmFieldStart}</FieldLabel>
              <DateTimePicker id="mm-start" value={startDraft} onChange={setStartDraft} labels={{ ...pickerLabels, placeholder: t.mmStartNow }} disabled={busy || locked} />
            </div>
            <div>
              <FieldLabel htmlFor="mm-end" className={locked ? LOCKED_LABEL : undefined}>{t.mmFieldEnd}</FieldLabel>
              <DateTimePicker id="mm-end" value={endDraft} onChange={setEndDraft} labels={{ ...pickerLabels, placeholder: t.mmEndNever }} disabled={busy || locked} />
            </div>
          </div>
          {!locked && startsLater() && (
            <Button variant="primary" size="sm" loading={busy} onClick={() => { void apply(); }}>
              {t.mmSave}
            </Button>
          )}
        </ToolFormRow>
      </ToolCard>

      <ConfirmModal
        open={confirmOpen}
        size="md"
        title={t.mmConfirmTitle}
        message={t.mmConfirmBody}
        confirmLabel={t.mmStart}
        busy={busy}
        onConfirm={() => { void apply(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
