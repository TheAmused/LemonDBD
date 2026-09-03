'use client';
// frontend/src/components/admin/AdminChallengeControl.tsx

import React, { useCallback, useEffect, useState } from 'react';
import type { Dictionary } from '@/locales/types';
import { CheckCircle2, Power, Search, Shield, Skull, Sparkles, XCircle } from 'lucide-react';
import {
  AdminCharacterRow,
  AdminPerkRow,
  ActionMessage,
  ChallengeMode,
  ChallengeModeSetting,
} from '@/types/admin';
import { backendBase, staticUrl } from '@/utils/staticUrl';
import { AdminReasonModal } from './AdminReasonModal';

interface AdminChallengeControlProps {
  onActionMessage: (msg: ActionMessage) => void;
  dict?: Dictionary;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

type PendingAction =
  | { kind: 'mode'; mode: ChallengeMode }
  | { kind: 'character'; character: AdminCharacterRow }
  | { kind: 'perk'; perk: AdminPerkRow };

export const AdminChallengeControl: React.FC<AdminChallengeControlProps> = ({ onActionMessage, dict }) => {
  const [modes, setModes] = useState<ChallengeModeSetting[]>([]);
  const [subTab, setSubTab] = useState<'killers' | 'perks'>('killers');
  const [roleFilter, setRoleFilter] = useState<'Survivor' | 'Killer'>('Survivor');
  const [characters, setCharacters] = useState<AdminCharacterRow[]>([]);
  const [perks, setPerks] = useState<AdminPerkRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const MODE_LABELS: Record<ChallengeMode, string> = {
    gauntlet: dict?.streaks?.gauntlet || 'Gauntlet',
    chaos: dict?.streaks?.chaosStreak || 'Chaos Streak',
    history: dict?.streaks?.historyStreak || 'History Streak',
    page_streak: dict?.streaks?.pageStreak || 'Page Streak',
  };

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('lemondbd_token') : null);

  const loadModes = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${backendBase}/api/v1/admin/challenge-modes`, { headers: authHeaders(token) });
      if (res.ok) setModes((await res.json()).modes || []);
    } catch (err) {
      console.error('Failed to load challenge modes:', err);
    }
  }, []);

  const loadRoster = useCallback(async (searchTerm: string, role: 'Survivor' | 'Killer') => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [charsRes, perksRes] = await Promise.all([
        fetch(
          `${backendBase}/api/v1/admin/characters?role=${role}&search=${encodeURIComponent(searchTerm)}`,
          { headers: authHeaders(token) }
        ),
        fetch(
          `${backendBase}/api/v1/admin/perks?category=${role}&search=${encodeURIComponent(searchTerm)}`,
          { headers: authHeaders(token) }
        ),
      ]);
      if (charsRes.ok) setCharacters((await charsRes.json()).data || []);
      if (perksRes.ok) setPerks((await perksRes.json()).data || []);
    } catch (err) {
      console.error('Failed to load killers/perks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModes();
  }, [loadModes]);

  useEffect(() => {
    const timer = setTimeout(() => loadRoster(search, roleFilter), 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, loadRoster]);

  const applyModeToggle = async (mode: ChallengeMode, isEnabled: boolean, reason: string | null) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${backendBase}/api/v1/admin/challenge-modes/${mode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ is_enabled: isEnabled, reason }),
      });
      if (res.ok) {
        onActionMessage({
          type: 'success',
          text: `${MODE_LABELS[mode]} is now ${isEnabled ? 'enabled' : 'disabled'}.`,
        });
        await loadModes();
      } else {
        const err = await res.json().catch(() => ({}));
        onActionMessage({ type: 'error', text: err.error || 'Failed to update challenge mode.' });
      }
    } catch (err) {
      onActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Network error.' });
    }
  };

  const applyCharacterToggle = async (character: AdminCharacterRow, nextDisabled: boolean, reason: string | null) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${backendBase}/api/v1/admin/characters/${character.id}/disable`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ is_disabled: nextDisabled, reason }),
      });
      if (res.ok) {
        onActionMessage({
          type: 'success',
          text: `${character.name} is now ${nextDisabled ? 'disabled' : 'enabled'}.`,
        });
        await loadRoster(search, roleFilter);
      } else {
        const err = await res.json().catch(() => ({}));
        onActionMessage({ type: 'error', text: err.error || 'Failed to update character.' });
      }
    } catch (err) {
      onActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Network error.' });
    }
  };

  const applyPerkToggle = async (perk: AdminPerkRow, nextDisabled: boolean, reason: string | null) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${backendBase}/api/v1/admin/perks/${perk.id}/disable`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ is_disabled: nextDisabled, reason }),
      });
      if (res.ok) {
        onActionMessage({
          type: 'success',
          text: `${perk.name} is now ${nextDisabled ? 'disabled' : 'enabled'}.`,
        });
        await loadRoster(search, roleFilter);
      } else {
        const err = await res.json().catch(() => ({}));
        onActionMessage({ type: 'error', text: err.error || 'Failed to update perk.' });
      }
    } catch (err) {
      onActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Network error.' });
    }
  };

  const requestModeToggle = (mode: ChallengeMode, isEnabled: boolean) => {
    if (isEnabled) return applyModeToggle(mode, true, null);
    setPendingAction({ kind: 'mode', mode });
  };
  const requestCharacterToggle = (character: AdminCharacterRow) => {
    if (character.is_disabled) return applyCharacterToggle(character, false, null);
    setPendingAction({ kind: 'character', character });
  };
  const requestPerkToggle = (perk: AdminPerkRow) => {
    if (perk.is_disabled) return applyPerkToggle(perk, false, null);
    setPendingAction({ kind: 'perk', perk });
  };

  const confirmPendingAction = (reason: string) => {
    if (!pendingAction) return;
    const finalReason = reason || null;
    if (pendingAction.kind === 'mode') applyModeToggle(pendingAction.mode, false, finalReason);
    if (pendingAction.kind === 'character') applyCharacterToggle(pendingAction.character, true, finalReason);
    if (pendingAction.kind === 'perk') applyPerkToggle(pendingAction.perk, true, finalReason);
    setPendingAction(null);
  };

  const disableTitle = (name: string) => (dict?.admin?.disableConfirmTitle || 'Disable {name}?').replace('{name}', name);

  const modalCopy = (() => {
    if (!pendingAction) return null;
    if (pendingAction.kind === 'mode') {
      return {
        title: disableTitle(MODE_LABELS[pendingAction.mode]),
        subtitle: dict?.admin?.disableModeSubtitle || 'Blocks new runs and match submissions for everyone.',
      };
    }
    if (pendingAction.kind === 'character') {
      return {
        title: disableTitle(pendingAction.character.name),
        subtitle: dict?.admin?.disableCharacterSubtitle || "Won't be rollable into new challenge pools.",
      };
    }
    return {
      title: disableTitle(pendingAction.perk.name),
      subtitle: dict?.admin?.disablePerkSubtitle || "Won't be offered in new challenge pools/pages.",
    };
  })();

  return (
    <div className="space-y-6">
      {/* Challenge mode kill switches */}
      <div className="rounded-2xl border border-border-color bg-bg-surface p-5 shadow-sm dark:shadow-xl backdrop-blur-sm transition-colors duration-200">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-text-primary mb-4">
          <Power className="h-4 w-4 text-accent-red" />
          <span>{dict?.admin?.challengeModeKillSwitches || 'Challenge Mode Switches'}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modes.map((setting) => (
            <div
              key={setting.mode}
              className={`rounded-xl border p-3.5 flex flex-col gap-2 transition-colors ${
                setting.is_enabled
                  ? 'border-border-color bg-bg-primary'
                  : 'border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">{MODE_LABELS[setting.mode]}</span>
                <button
                  type="button"
                  onClick={() => requestModeToggle(setting.mode, !setting.is_enabled)}
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                    setting.is_enabled
                      ? 'border-emerald-500/40 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-200'
                      : 'border-rose-500/40 bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 hover:bg-rose-200'
                  }`}
                >
                  {setting.is_enabled ? dict?.admin?.enabledLabel || 'Enabled' : dict?.admin?.disabledLabel || 'Disabled'}
                </button>
              </div>
              {setting.disabled_reason && (
                <p className="text-[10px] text-rose-700 dark:text-rose-300 font-medium leading-snug">{setting.disabled_reason}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Killers & Perks availability */}
      <div className="rounded-2xl border border-border-color bg-bg-surface p-5 shadow-sm dark:shadow-xl backdrop-blur-sm transition-colors duration-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 rounded-xl border border-border-color bg-bg-elevated p-1">
            <button
              type="button"
              onClick={() => setSubTab('killers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ${
                subTab === 'killers'
                  ? 'bg-accent-amber/15 text-accent-amber border border-accent-amber/30'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
              }`}
            >
              <Skull className="h-3.5 w-3.5" />
              <span>{dict?.admin?.characters || 'Characters'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('perks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ${
                subTab === 'perks'
                  ? 'bg-accent-amber/15 text-accent-amber border border-accent-amber/30'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{dict?.admin?.perks || 'Perks'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border-color bg-bg-elevated p-1">
            <button
              type="button"
              onClick={() => setRoleFilter('Survivor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ${
                roleFilter === 'Survivor'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>{dict?.admin?.roleSurvivor || 'Survivor'}</span>
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('Killer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ${
                roleFilter === 'Killer'
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
              }`}
            >
              <Skull className="h-3.5 w-3.5" />
              <span>{dict?.admin?.roleKiller || 'Killer'}</span>
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={dict?.admin?.searchGenericPlaceholder || 'Search...'}
              className="pl-7 pr-3 py-1.5 rounded-lg bg-bg-primary border border-border-color text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-amber"
            />
          </div>
        </div>

        {characters.length === 0 && perks.length === 0 && loading ? (
          <p className="text-xs text-text-muted py-6 text-center font-mono">{dict?.admin?.loading || 'Loading...'}</p>
        ) : (
          <div className={`transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}>
            {subTab === 'killers' ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-3 max-h-[480px] overflow-y-auto pr-1">
                {characters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => requestCharacterToggle(c)}
                    title={c.disabled_reason ? `${c.name} — ${c.disabled_reason}` : c.name}
                    className={`relative aspect-square rounded-xl border cursor-pointer transition-all overflow-hidden ${
                      c.is_disabled
                        ? 'border-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
                        : 'border-border-color bg-slate-900 hover:border-slate-500'
                    }`}
                  >
                    <div className="h-full w-full flex items-center justify-center bg-slate-900">
                      {c.avatar_portrait_path ? (
                        <img
                          src={staticUrl(c.avatar_portrait_path)}
                          alt={c.name}
                          className={`h-full w-full object-cover ${c.is_disabled ? 'grayscale opacity-60' : ''}`}
                        />
                      ) : (
                        <Skull className="h-8 w-8 text-slate-400" />
                      )}
                    </div>
                    <span
                      className={`absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-slate-950 ${
                        c.is_disabled ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {c.is_disabled ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 max-h-[480px] overflow-y-auto pr-1">
                {perks.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => requestPerkToggle(p)}
                    title={p.disabled_reason ? `${p.name} — ${p.disabled_reason}` : p.name}
                    className={`relative aspect-square rounded-xl border cursor-pointer transition-all overflow-hidden ${
                      p.is_disabled
                        ? 'border-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
                        : 'border-border-color bg-slate-900 hover:border-slate-500'
                    }`}
                  >
                    <div className="h-full w-full flex items-center justify-center bg-slate-900 p-1.5">
                      {p.icon_local_path ? (
                        <img
                          src={staticUrl(p.icon_local_path)}
                          alt={p.name}
                          className={`h-full w-full object-contain ${p.is_disabled ? 'grayscale opacity-60' : ''}`}
                        />
                      ) : (
                        <Sparkles className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <span
                      className={`absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-slate-950 ${
                        p.is_disabled ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {p.is_disabled ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AdminReasonModal
        isOpen={pendingAction !== null}
        title={modalCopy?.title || dict?.admin?.disable || 'Disable?'}
        subtitle={modalCopy?.subtitle}
        confirmLabel={dict?.admin?.disable || 'Disable'}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
        dict={dict}
      />
    </div>
  );
};

