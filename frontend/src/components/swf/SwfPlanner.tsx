'use client';
// frontend/src/components/swf/SwfPlanner.tsx
import type { Dictionary } from '@/locales/types';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Swords,
  Zap,
  HeartPulse,
  Anchor,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Plus,
  X,
  Search,
  ShieldAlert,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { fetchCached, fetchJson } from '@/services/dataCache';

export interface PerkItem {
  id?: string;
  name: string;
  category: string;
  character?: string;
  description?: string;
  icon_url?: string;
}

export type SquadRole = 'Chaser' | 'Gen Rusher' | 'Medic' | 'Unhooker';

export interface SurvivorBuild {
  id: number;
  name: string;
  role: SquadRole;
  perks: (string | null)[];
}

interface SynergyResult {
  score: number;
  positive_synergies: { perks: string[]; description: string }[];
  anti_synergies: { perks: string[]; description: string }[];
  tactical_badges: string[];
  details?: string;
}

interface SwfPlannerProps {
  dict?: Dictionary;
}

const DEFAULT_SURVIVORS: SurvivorBuild[] = [
  { id: 1, name: 'Survivor 1', role: 'Chaser', perks: ['Sprint Burst', 'Windows of Opportunity', 'Resilience', 'Adrenaline'] },
  { id: 2, name: 'Survivor 2', role: 'Gen Rusher', perks: ['Prove Thyself', 'Deja Vu', 'Hyperfocus', 'Stake Out'] },
  { id: 3, name: 'Survivor 3', role: 'Medic', perks: ['Botany Knowledge', 'We\'ll Make It', 'Self-Care', 'Desperate Measures'] },
  { id: 4, name: 'Survivor 4', role: 'Unhooker', perks: ['Borrowed Time', 'Deliverance', 'Reassurance', 'Kindred'] },
];

export const SwfPlanner: React.FC<SwfPlannerProps> = ({ dict }) => {
  const t: Record<string, string> = dict?.swf || {};
  const tModal: Record<string, string> = dict?.modal || {};
  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const roleConfig: Record<SquadRole, { icon: React.ElementType; label: string; color: string; bg: string; desc: string }> = {
    'Chaser': {
      icon: Swords,
      label: t.roleChaser || 'Chaser',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-400',
      desc: t.roleChaserDesc || 'Leads chases, drops pallets, and draws killer aggression.',
    },
    'Gen Rusher': {
      icon: Zap,
      label: t.roleGenRusher || 'Gen Rusher',
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-800 dark:text-cyan-400',
      desc: t.roleGenRusherDesc || 'Focuses on repairing generators rapidly with speed perks.',
    },
    'Medic': {
      icon: HeartPulse,
      label: t.roleMedic || 'Medic',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-400',
      desc: t.roleMedicDesc || 'Keeps team healthy and resets injuries swiftly.',
    },
    'Unhooker': {
      icon: Anchor,
      label: t.roleUnhooker || 'Unhooker',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-400',
      desc: t.roleUnhookerDesc || 'Specializes in safe unhooks and endgame rescues.',
    },
  };

  const [survivors, setSurvivors] = useState<SurvivorBuild[]>(DEFAULT_SURVIVORS);
  const [allPerks, setAllPerks] = useState<PerkItem[]>([]);
  const [perkMap, setPerkMap] = useState<Record<string, PerkItem>>({});
  const [loadingPerks, setLoadingPerks] = useState<boolean>(true);

  // Synergy Results for each survivor index
  const [synergies, setSynergies] = useState<Record<number, SynergyResult>>({});
  const [loadingSynergy, setLoadingSynergy] = useState<Record<number, boolean>>({});

  // Perk Selector Modal state
  const [activeSlot, setActiveSlot] = useState<{ survivorId: number; perkIndex: number } | null>(null);
  const [perkSearch, setPerkSearch] = useState<string>('');
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  // Fetch all perks
  useEffect(() => {
    async function loadPerks() {
      try {
        setLoadingPerks(true);
        // Shared cache key -- free after any other page has loaded the vault.
        const key = `${backendBase}/api/v1/perks?limit=1000`;
        const data = await fetchCached<{ data?: PerkItem[] }>(key, () => fetchJson(key));
        {
          const survivorOnly = (data.data || []).filter((p: PerkItem) => p.category === 'Survivor');
          setAllPerks(survivorOnly);

          const mapping: Record<string, PerkItem> = {};
          survivorOnly.forEach((p: PerkItem) => {
            mapping[p.name.toLowerCase()] = p;
          });
          setPerkMap(mapping);
        }
      } catch (err) {
        console.error('Failed to load perks for SWF Planner:', err);
      } finally {
        setLoadingPerks(false);
      }
    }
    loadPerks();
  }, [backendBase]);

  // Analyze Synergy for a given survivor
  const analyzeSurvivorSynergy = useCallback(
    async (survivorId: number, perks: (string | null)[]) => {
      const activePerks = perks.filter(Boolean) as string[];
      if (activePerks.length < 2) {
        setSynergies((prev) => ({
          ...prev,
          [survivorId]: {
            score: activePerks.length === 1 ? 25 : 0,
            positive_synergies: [],
            anti_synergies: [],
            tactical_badges: [],
          },
        }));
        return;
      }

      setLoadingSynergy((prev) => ({ ...prev, [survivorId]: true }));
      try {
        const res = await fetch(`${backendBase}/api/v1/perks/synergy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ perks: activePerks }),
        });

        if (res.ok) {
          const data = await res.json();
          setSynergies((prev) => ({
            ...prev,
            [survivorId]: {
              score: data.score ?? 50,
              positive_synergies: data.positive_synergies || [],
              anti_synergies: data.anti_synergies || [],
              tactical_badges: data.tactical_badges || [],
              details: data.details,
            },
          }));
        }
      } catch (err) {
        console.error('Failed to analyze survivor synergy:', err);
      } finally {
        setLoadingSynergy((prev) => ({ ...prev, [survivorId]: false }));
      }
    },
    [backendBase]
  );

  // Initial Synergy calculation on mount
  useEffect(() => {
    survivors.forEach((s) => {
      analyzeSurvivorSynergy(s.id, s.perks);
    });
  }, [analyzeSurvivorSynergy]);

  // Decode Squad configuration from URL hash or query params if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const squadParam = searchParams.get('squad');

    if (squadParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(squadParam))));
        if (Array.isArray(decoded) && decoded.length === 4) {
          setSurvivors(decoded);
          decoded.forEach((s: SurvivorBuild) => {
            analyzeSurvivorSynergy(s.id, s.perks);
          });
        }
      } catch (e) {
        console.warn('Failed to parse squad URL parameter', e);
      }
    }
  }, [analyzeSurvivorSynergy]);

  // Share Squad Loadout Link generator
  const handleShareLink = () => {
    if (typeof window === 'undefined') return;
    try {
      const serialized = btoa(unescape(encodeURIComponent(JSON.stringify(survivors))));
      const url = new URL(window.location.href);
      url.searchParams.set('squad', serialized);
      navigator.clipboard.writeText(url.toString());
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3500);
    } catch (e) {
      console.error('Failed to encode squad link:', e);
    }
  };

  // Change Role
  const handleRoleChange = (survivorId: number, newRole: SquadRole) => {
    setSurvivors((prev) =>
      prev.map((s) => (s.id === survivorId ? { ...s, role: newRole } : s))
    );
  };

  // Select Perk from modal
  const handleSelectPerk = (perkName: string) => {
    if (!activeSlot) return;
    const { survivorId, perkIndex } = activeSlot;

    setSurvivors((prev) => {
      const updated = prev.map((s) => {
        if (s.id === survivorId) {
          const newPerks = [...s.perks];
          newPerks[perkIndex] = perkName;
          analyzeSurvivorSynergy(s.id, newPerks);
          return { ...s, perks: newPerks };
        }
        return s;
      });
      return updated;
    });

    setActiveSlot(null);
    setPerkSearch('');
  };

  // Clear Perk from slot
  const handleClearPerk = (survivorId: number, perkIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSurvivors((prev) => {
      const updated = prev.map((s) => {
        if (s.id === survivorId) {
          const newPerks = [...s.perks];
          newPerks[perkIndex] = null;
          analyzeSurvivorSynergy(s.id, newPerks);
          return { ...s, perks: newPerks };
        }
        return s;
      });
      return updated;
    });
  };

  // Redundancy Analysis: detect duplicate perks across all 4 players
  const redundancyList = useMemo(() => {
    const counts: Record<string, number[]> = {};
    survivors.forEach((s) => {
      s.perks.forEach((p) => {
        if (p) {
          const lower = p.toLowerCase();
          if (!counts[lower]) counts[lower] = [];
          counts[lower].push(s.id);
        }
      });
    });

    return Object.entries(counts)
      .filter(([_, survivorIds]) => survivorIds.length > 1)
      .map(([perkLower, survivorIds]) => {
        const perkOriginal = perkMap[perkLower]?.name || perkLower;
        return {
          perk: perkOriginal,
          survivors: survivorIds,
        };
      });
  }, [survivors, perkMap]);

  // Filtered perks for search in modal
  const filteredPerks = useMemo(() => {
    if (!perkSearch.trim()) return allPerks;
    const q = perkSearch.toLowerCase();
    return allPerks.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.character && p.character.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [allPerks, perkSearch]);

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t.engineBadge || 'SWF Squad Team Engine'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {t.pageTitle || '4-Player Team Loadout Planner'}
            </h1>
          </div>

          <button
            onClick={handleShareLink}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer shrink-0"
          >
            <Share2 className="h-4 w-4" />
            <span>{t.shareLoadout || 'Share Squad Loadout'}</span>
          </button>
        </div>
      </div>

      {/* Copy Toast Alert */}
      {copiedToast && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-4 text-sm font-bold text-emerald-700 dark:text-emerald-400 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {t.copiedToast || 'Squad Loadout URL copied to clipboard! Share it with your teammates.'}
          </span>
        </div>
      )}

      {/* Team Perk Redundancy Detector Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/50 p-5 backdrop-blur-xl shadow-sm dark:shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
              {t.redundancyDetector || 'Team Perk Redundancy Detector'}
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {redundancyList.length === 0
              ? t.optimal || 'Optimal'
              : (t.redundantPerksCount || '{count} Redundant Perk(s)').replace(
                  '{count}',
                  String(redundancyList.length)
                )}
          </span>
        </div>

        {redundancyList.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
              <span>
                {t.duplicateWarning ||
                  'Duplicate perks detected! Stacking identical perks across teammates may decrease overall team versatility.'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {redundancyList.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300 font-medium shadow-sm"
                >
                  <span className="font-bold text-amber-700 dark:text-amber-400">{item.perk}</span>
                  <span className="text-[11px] bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                    {t.equippedBy || 'Equipped by'}:{' '}
                    {item.survivors
                      .map((sId) => `${t.survivor || 'Survivor'} ${sId}`)
                      .join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {t.zeroRedundancy || 'Zero Team Redundancy: All 16 team perk slots are unique!'}
            </span>
          </div>
        )}
      </div>

      {/* 4 Survivor Loadout Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {survivors.map((survivor) => {
          const roleConf = roleConfig[survivor.role];
          const RoleIcon = roleConf.icon;
          const syn = synergies[survivor.id];
          const isAnalyzing = loadingSynergy[survivor.id];

          return (
            <div
              key={survivor.id}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm dark:shadow-xl flex flex-col justify-between space-y-5 transition-all hover:border-slate-300 dark:hover:border-slate-700/60"
            >
              {/* Survivor Header & Role Selector */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/10 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold font-mono text-sm shadow-sm">
                      {'P'}
                      {survivor.id}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 font-mono">
                        {`${t.survivor || 'Survivor'} ${survivor.id}`}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t.perkLoadout || '4 Perk Loadout'}
                      </p>
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div className="flex items-center gap-1.5">
                    <RoleIcon className={`h-4 w-4 ${roleConf.color}`} />
                    <select
                      value={survivor.role}
                      onChange={(e) => handleRoleChange(survivor.id, e.target.value as SquadRole)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
                    >
                      <option value="Chaser" className="dark:bg-slate-900">
                        {roleConfig['Chaser'].label}
                      </option>
                      <option value="Gen Rusher" className="dark:bg-slate-900">
                        {roleConfig['Gen Rusher'].label}
                      </option>
                      <option value="Medic" className="dark:bg-slate-900">
                        {roleConfig['Medic'].label}
                      </option>
                      <option value="Unhooker" className="dark:bg-slate-900">
                        {roleConfig['Unhooker'].label}
                      </option>
                    </select>
                  </div>
                </div>

                {/* Role Description Badge */}
                <div className={`mt-3 flex items-center gap-2 rounded-xl border p-2.5 text-xs shadow-sm ${roleConf.bg}`}>
                  <RoleIcon className="h-4 w-4 shrink-0" />
                  <span className="text-[11px] font-medium">{roleConf.desc}</span>
                </div>

                {/* 4 Perk Slots */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {survivor.perks.map((perkName, slotIdx) => {
                    const perkObj = perkName ? perkMap[perkName.toLowerCase()] : null;

                    return (
                      <div
                        key={slotIdx}
                        onClick={() => setActiveSlot({ survivorId: survivor.id, perkIndex: slotIdx })}
                        className={`group relative flex h-20 items-center justify-between rounded-2xl border p-3 cursor-pointer transition-all shadow-sm ${
                          perkName
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 hover:border-emerald-500/50 hover:bg-slate-100 dark:hover:bg-slate-900'
                            : 'border-dashed border-slate-300 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                        }`}
                      >
                        {perkName ? (
                          <div className="flex items-center gap-2.5 overflow-hidden w-full">
                            {perkObj?.icon_url ? (
                              <img
                                src={`${backendBase}${perkObj.icon_url}`}
                                alt={perkName}
                                className="h-10 w-10 shrink-0 object-contain drop-shadow-md"
                              />
                                     ) : (
                                       <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 font-bold text-xs">
                                         {t.dbdBadge}
                                       </div>
                                     )}

                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-4">
                              {perkName}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                            <Plus className="h-4 w-4" />
                            <span>{`${t.slot || 'Slot'} ${slotIdx + 1}`}</span>
                          </div>
                        )}

                        {perkName && (
                          <button
                            onClick={(e) => handleClearPerk(survivor.id, slotIdx, e)}
                            title={t.removePerk || 'Remove Perk'}
                            aria-label={t.removePerk || 'Remove Perk'}
                            className="absolute right-2 top-2 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Survivor Perk Synergy Engine Analysis Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-4 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                      {t.synergyRating || 'Synergy Rating'}
                    </span>
                  </div>
                  {isAnalyzing ? (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <RefreshCw className="h-3 w-3 animate-spin text-emerald-500 dark:text-emerald-400" />
                      <span>{t.analyzing || 'Analyzing...'}</span>
                    </div>
                  ) : (
                    <span
                      className={`text-sm font-black font-mono ${
                        (syn?.score || 0) >= 75
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : (syn?.score || 0) >= 50
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {syn?.score ?? 0}
                      {'%'}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    style={{ width: `${syn?.score ?? 0}%` }}
                    className={`h-full transition-all duration-500 ${
                      (syn?.score || 0) >= 75
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : (syn?.score || 0) >= 50
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-gradient-to-r from-rose-600 to-red-500'
                    }`}
                  />
                </div>

                {/* Tactical Badges */}
                {syn?.tactical_badges && syn.tactical_badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {syn.tactical_badges.map((badge, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400"
                      >
                        {'⚡'} {badge}
                      </span>
                    ))}
                  </div>
                )}

                {/* Positive Synergies list */}
                {syn?.positive_synergies && syn.positive_synergies.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {syn.positive_synergies.map((ps, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/20"
                      >
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {t.synergyLabel || 'Synergy'} ({ps.perks.join(' + ')}):{' '}
                        </span>
                        <span>{ps.description}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Anti Synergies warnings */}
                {syn?.anti_synergies && syn.anti_synergies.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {syn.anti_synergies.map((as, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-500/20 flex items-start gap-1.5"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-rose-700 dark:text-rose-400">
                            {t.conflictLabel || 'Conflict'} ({as.perks.join(' + ')}):{' '}
                          </span>
                          <span>{as.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Perk Selector Modal */}
      {activeSlot && (
        <div
          onClick={() => setActiveSlot(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl flex flex-col space-y-4 cursor-default"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {(t.selectPerkTitle || 'Select Perk for Survivor {id} (Slot {slot})')
                    .replace('{id}', String(activeSlot.survivorId))
                    .replace('{slot}', String(activeSlot.perkIndex + 1))}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.choosePerkVault || 'Choose from Survivor perk vault'}
                </p>
              </div>
              <button
                onClick={() => setActiveSlot(null)}
                aria-label={tModal.close || 'Close'}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t.searchPlaceholder || 'Search survivor perks...'}
                value={perkSearch}
                onChange={(e) => setPerkSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
            </div>

            {/* Perk Grid List */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[300px]">
              {loadingPerks ? (
                <div className="col-span-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs py-12">
                  {t.loadingPerks || 'Loading survivor perks...'}
                </div>
              ) : filteredPerks.length === 0 ? (
                <div className="col-span-full text-center text-slate-500 dark:text-slate-400 text-xs py-12">
                  {t.noPerksFound || 'No matching perks found.'}
                </div>
              ) : (
                filteredPerks.map((perk, idx) => (
                  <div
                    key={`${perk.name}-${idx}`}
                    onClick={() => handleSelectPerk(perk.name)}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 hover:border-emerald-500/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer group shadow-sm"
                  >
                    {perk.icon_url ? (
                      <img
                        src={`${backendBase}${perk.icon_url}`}
                        alt={perk.name}
                        className="h-10 w-10 shrink-0 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                      />
                                     ) : (
                                       <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 font-bold text-xs">
                                         {t.dbdBadge}
                                       </div>
                                     )}

                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                        {perk.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {perk.character ? perk.character : (dict?.characterDetail?.generalPerk || 'General Perk')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
