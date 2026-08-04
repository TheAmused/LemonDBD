'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Role, ChallengeRun, ChallengeStats } from '@/types/challenge';
import {
  fetchActiveRun,
  rollChallenge,
  submitMatchResult,
  fetchChallengeStats,
} from '@/services/challengeApi';
import { ChallengeHeader } from '@/components/challenge/ChallengeHeader';
import { ActiveTargetStage } from '@/components/challenge/ActiveTargetStage';
import { CharacterRosterGrid, CharacterItem } from '@/components/challenge/CharacterRosterGrid';
import { ChallengeStatsDrawer } from '@/components/challenge/ChallengeStatsDrawer';
import { Sidebar } from '@/components/Sidebar';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';

export default function ChallengePage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';

  const [dict, setDict] = useState<any>(null);
  const [activeRole, setActiveRole] = useState<Role>('survivor');
  const [run, setRun] = useState<ChallengeRun | null>(null);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [stats, setStats] = useState<ChallengeStats | null>(null);

  const [loadingRun, setLoadingRun] = useState<boolean>(true);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(true);
  const [submittingResult, setSubmittingResult] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Vault Stats for Sidebar
  const [totalPerksCount, setTotalPerksCount] = useState<number>(0);
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    getDictionary(locale).then(setDict);
  }, [locale]);

  // Load Vault counters for sidebar display
  useEffect(() => {
    async function loadVaultStats() {
      try {
        const [perksRes, charsRes] = await Promise.all([
          fetch(`${backendBase}/api/v1/perks?limit=1000`),
          fetch(`${backendBase}/api/v1/characters`),
        ]);
        if (perksRes.ok) {
          const pData = await perksRes.json();
          const list = pData.data || [];
          setTotalPerksCount(pData.pagination?.total || list.length);
          setSurvivorCount(list.filter((p: any) => p.category === 'Survivor').length);
          setKillerCount(list.filter((p: any) => p.category === 'Killer').length);
        }
        if (charsRes.ok) {
          const cData = await charsRes.json();
          setCharacterCount(cData.count || (cData.data || []).length);
        }
      } catch (err) {
        console.error('Failed to load sidebar vault stats:', err);
      }
    }
    loadVaultStats();
  }, [backendBase]);

  // Fetch characters for active role
  const loadCharacters = useCallback(async (role: Role) => {
    setLoadingRoster(true);
    try {
      const categoryParam = role === 'survivor' ? 'Survivor' : 'Killer';
      const res = await fetch(`${backendBase}/api/v1/characters?category=${categoryParam}`);
      if (res.ok) {
        const data = await res.json();
        setCharacters(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch roster characters:', err);
    } finally {
      setLoadingRoster(false);
    }
  }, [backendBase]);

  // Fetch active run for active role
  const loadRun = useCallback(async (role: Role) => {
    setLoadingRun(true);
    setError(null);
    try {
      const resp = await fetchActiveRun(role);
      setRun(resp.run);
    } catch (err: any) {
      console.error('Failed to fetch active challenge run:', err);
      setError(err.message || 'Failed to load challenge run');
    } finally {
      setLoadingRun(false);
    }
  }, []);

  // Fetch challenge stats
  const loadStats = useCallback(async () => {
    try {
      const resp = await fetchChallengeStats();
      setStats(resp.stats);
    } catch (err) {
      console.error('Failed to fetch challenge stats:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadRun(activeRole);
    loadCharacters(activeRole);
    loadStats();
  }, [activeRole, loadRun, loadCharacters, loadStats]);

  // Role Switcher Handler
  const handleRoleChange = (newRole: Role) => {
    if (newRole === activeRole) return;
    setActiveRole(newRole);
  };

  // Match Win Handler
  const handleWin = async () => {
    if (!run || submittingResult) return;
    setSubmittingResult(true);
    try {
      const resp = await submitMatchResult(run.id, 'win', activeRole);
      setRun(resp.run);
      loadStats();
    } catch (err: any) {
      console.error('Failed to submit win result:', err);
      setError(err.message || 'Failed to record win');
    } finally {
      setSubmittingResult(false);
    }
  };

  // Match Loss Handler
  const handleLoss = async () => {
    if (!run || submittingResult) return;
    setSubmittingResult(true);
    try {
      const resp = await submitMatchResult(run.id, 'loss', activeRole);
      setRun(resp.run);
      loadStats();
    } catch (err: any) {
      console.error('Failed to submit loss result:', err);
      setError(err.message || 'Failed to record loss');
    } finally {
      setSubmittingResult(false);
    }
  };

  // Reroll Handler
  const handleReroll = async () => {
    if (submittingResult || loadingRun) return;
    setLoadingRun(true);
    try {
      const resp = await rollChallenge(activeRole);
      setRun(resp.run);
    } catch (err: any) {
      console.error('Failed to reroll loadout:', err);
      setError(err.message || 'Failed to reroll loadout');
    } finally {
      setLoadingRun(false);
    }
  };

  // Handle category navigation from sidebar
  const handleSelectCategory = (cat: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  // Active target character portrait path from roster
  const activeChar = characters.find(
    (c) => c.name.toLowerCase().trim() === run?.current_character_id?.toLowerCase().trim()
  );
  const characterAvatarPath = activeChar?.avatar_local_path;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row dbd-fog-overlay selection:bg-amber-500 selection:text-slate-950">
      {/* Sidebar Navigation */}
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="challenge"
        onSelectCategory={handleSelectCategory}
        totalPerksCount={totalPerksCount}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      {/* Main Challenge Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-sm flex items-center justify-between shadow-lg">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-white font-bold text-xs underline cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Challenge Header */}
        <ChallengeHeader
          activeRole={activeRole}
          onRoleChange={handleRoleChange}
          currentStreak={run?.current_streak || 0}
          bestStreak={run?.best_streak || 0}
          lastCheckpointStreak={run?.last_checkpoint_streak || 0}
          onOpenStats={() => setIsStatsOpen(true)}
        />

        {/* Active Target Stage */}
        <ActiveTargetStage
          run={run}
          role={activeRole}
          loading={loadingRun || submittingResult}
          onWin={handleWin}
          onLoss={handleLoss}
          onReroll={handleReroll}
          characterAvatarPath={characterAvatarPath}
        />

        {/* Character Roster Progress Grid */}
        <CharacterRosterGrid
          role={activeRole}
          characters={characters}
          completedCharacters={run?.completed_characters || []}
          checkpointCharacters={run?.checkpoint_characters || []}
          activeCharacterId={run?.current_character_id}
          loading={loadingRoster}
        />

        {/* Stats Drawer */}
        <ChallengeStatsDrawer
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          stats={stats}
        />
      </main>
    </div>
  );
}
