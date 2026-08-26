'use client';
// frontend/src/components/admin/AdminChallengeControl.tsx

import React, { useCallback, useEffect, useState } from 'react';
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

const MODE_LABELS: Record<ChallengeMode, string> = {
  gauntlet: 'Gauntlet',
  chaos: 'Chaos Streak',
  history: 'History Streak',
  page_streak: 'Page Streak',
};

interface AdminChallengeControlProps {
  onActionMessage: (msg: ActionMessage) => void;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

type PendingAction =
  | { kind: 'mode'; mode: ChallengeMode }
  | { kind: 'character'; character: AdminCharacterRow }
  | { kind: 'perk'; perk: AdminPerkRow };

export const AdminChallengeControl: React.FC<AdminChallengeControlProps> = ({ onActionMessage }) => {
  const [modes, setModes] = useState<ChallengeModeSetting[]>([]);
  const [subTab, setSubTab] = useState<'killers' | 'perks'>('killers');
  const [characters, setCharacters] = useState<AdminCharacterRow[]>([]);
  const [perks, setPerks] = useState<AdminPerkRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

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

  const loadRoster = useCallback(async (searchTerm: string) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [charsRes, perksRes] = await Promise.all([
        fetch(
          `${backendBase}/api/v1/admin/characters?role=All&search=${encodeURIComponent(searchTerm)}`,
          { headers: authHeaders(token) }
        ),
        fetch(
          `${backendBase}/api/v1/admin/perks?category=All&search=${encodeURIComponent(searchTerm)}`,
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

  // Modes don't depend on search, so they load once, not on every keystroke.
  useEffect(() => {
    loadModes();
  }, [loadModes]);

  // Debounced so typing a search term doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => loadRoster(search), 300);
    return () => clearTimeout(timer);
  }, [search, loadRoster]);

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
        onActionMessage({ type: 'success', text: `${MODE_LABELS[mode]} is now ${isEnabled ? 'enabled' : 'disabled'}.` });
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
        await loadRoster(search);
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
        await loadRoster(search);
      } else {
        const err = await res.json().catch(() => ({}));
        onActionMessage({ type: 'error', text: err.error || 'Failed to update perk.' });
      }
    } catch (err) {
      onActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Network error.' });
    }
  };

  // Disabling always confirms a reason through the modal. Re-enabling
  // doesn't need one, so it applies immediately.
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

  const modalCopy = (() => {
    if (!pendingAction) return null;
    if (pendingAction.kind === 'mode') {
      return { title: `Disable ${MODE_LABELS[pendingAction.mode]}?`, subtitle: 'Blocks new runs and match submissions for everyone.' };
    }
    if (pendingAction.kind === 'character') {
      return { title: `Disable ${pendingAction.character.name}?`, subtitle: "Won't be rollable into new challenge pools." };
    }
    return { title: `Disable ${pendingAction.perk.name}?`, subtitle: "Won't be offered in new challenge pools/pages." };
  })();

  return (
    <div className="space-y-6">
      {/* Challenge mode kill switches */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300 mb-4">
          <Power className="h-4 w-4 text-rose-400" />
          Challenge Mode Kill Switches
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modes.map((setting) => (
            <div
              key={setting.mode}
              className={`rounded-xl border p-3.5 flex flex-col gap-2 ${
                setting.is_enabled
                  ? 'border-slate-800 bg-slate-950/50'
                  : 'border-rose-500/30 bg-rose-500/[0.06]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">{MODE_LABELS[setting.mode]}</span>
                <button
                  type="button"
                  onClick={() => requestModeToggle(setting.mode, !setting.is_enabled)}
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                    setting.is_enabled
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                  }`}
                >
                  {setting.is_enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {setting.disabled_reason && (
                <p className="text-[10px] text-rose-300/80 leading-snug">{setting.disabled_reason}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Killers & Perks availability */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-1">
            <button
              type="button"
              onClick={() => setSubTab('killers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ${
                subTab === 'killers' ? 'bg-amber-500/10 text-amber-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Skull className="h-3.5 w-3.5" /> Characters
            </button>
            <button
              type="button"
              onClick={() => setSubTab('perks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ${
                subTab === 'perks' ? 'bg-amber-500/10 text-amber-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Perks
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={subTab === 'killers' ? 'Search characters...' : 'Search perks or owner...'}
              className="pl-7 pr-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mb-4">
          Covers both roles: killers occasionally ship with a bugged power, and a survivor scraped from the
          wiki ahead of their actual in-game release needs to stay hidden until launch. Perks occasionally
          ship broken on their own too.
        </p>

        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading...</p>
        ) : subTab === 'killers' ? (
          <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {characters.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => requestCharacterToggle(c)}
                title={c.disabled_reason ? `${c.name} — ${c.disabled_reason}` : c.name}
                className={`relative aspect-square rounded-xl border cursor-pointer transition-colors overflow-hidden ${
                  c.is_disabled
                    ? 'border-rose-500/40 bg-rose-500/[0.08] hover:bg-rose-500/[0.14]'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <div className="h-full w-full flex items-center justify-center bg-slate-900">
                  {c.avatar_local_path ? (
                    <img
                      src={staticUrl(c.avatar_local_path)}
                      alt={c.name}
                      className={`h-full w-full object-cover ${c.is_disabled ? 'grayscale opacity-60' : ''}`}
                    />
                  ) : c.role === 'Survivor' ? (
                    <Shield className="h-6 w-6 text-slate-600" />
                  ) : (
                    <Skull className="h-6 w-6 text-slate-600" />
                  )}
                </div>
                <span
                  className={`absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-md ${
                    c.role === 'Survivor' ? 'bg-emerald-500/80 text-emerald-950' : 'bg-rose-500/80 text-rose-950'
                  }`}
                >
                  {c.role === 'Survivor' ? <Shield className="h-3 w-3" /> : <Skull className="h-3 w-3" />}
                </span>
                <span
                  className={`absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-950 ${
                    c.is_disabled ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                  }`}
                >
                  {c.is_disabled ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {perks.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => requestPerkToggle(p)}
                title={p.disabled_reason ? `${p.name} (${p.character}) — ${p.disabled_reason}` : `${p.name} (${p.character})`}
                className={`relative aspect-square rounded-xl border cursor-pointer transition-colors overflow-hidden ${
                  p.is_disabled
                    ? 'border-rose-500/40 bg-rose-500/[0.08] hover:bg-rose-500/[0.14]'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
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
                    <Sparkles className="h-6 w-6 text-slate-600" />
                  )}
                </div>
                <span
                  className={`absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-950 ${
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

      <AdminReasonModal
        isOpen={pendingAction !== null}
        title={modalCopy?.title || 'Disable?'}
        subtitle={modalCopy?.subtitle}
        confirmLabel="Disable"
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />
    </div>
  );
};
