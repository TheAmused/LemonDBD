// frontend/src/app/[locale]/quests/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';
import {
  Trophy,
  Zap,
  CheckCircle2,
  Calendar,
  Sparkles,
  Flame,
  Scroll,
} from 'lucide-react';
import { Quest } from '@/types/quest';
import { fetchQuests, claimQuest } from '@/services/questApi';

export default function QuestsPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();

  const [dict, setDict] = useState<any>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'daily' | 'weekly'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimedToast, setClaimedToast] = useState<string | null>(null);

  // Vault Stats for Sidebar
  const [totalPerksCount, setTotalPerksCount] = useState<number>(0);
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    document.title = dict?.quests?.pageTitle || dict?.app?.questsPageTitle || 'LemonDBD - Quests & Trials';
    getDictionary(locale).then(setDict);
    loadQuests();
  }, [locale]);


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

  const loadQuests = async () => {
    setLoading(true);
    try {
      const res = await fetchQuests();
      setQuests(res.quests || []);
    } catch (err) {
      console.error('Failed to fetch quests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (quest: Quest) => {
    if (quest.is_completed || quest.progress < quest.goal || claimingId !== null) return;
    setClaimingId(quest.id);
    try {
      const res = await claimQuest(quest.id);
      setQuests((prev) =>
        prev.map((q) => (q.id === quest.id ? { ...q, is_completed: true, progress: q.goal } : q))
      );
      setClaimedToast(`🎉 Claimed +${res.xp_reward || quest.xp_reward} XP for "${quest.title}"!`);
      setTimeout(() => setClaimedToast(null), 4000);
    } catch (err) {
      console.error('Failed to claim quest:', err);
    } finally {
      setClaimingId(null);
    }
  };

  const handleSelectCategory = (cat: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono">
        {dict?.quests?.loadingQuests || dict?.app?.loadingQuests || 'Loading Quests...'}
      </div>
    );
  }


  const filteredQuests = quests.filter((q) => {
    if (filterCategory === 'daily') return q.category === 'daily';
    if (filterCategory === 'weekly') return q.category === 'weekly';
    return true;
  });

  const totalXpEarned = quests
    .filter((q) => q.is_completed)
    .reduce((sum, q) => sum + q.xp_reward, 0);

  const totalQuestsCompleted = quests.filter((q) => q.is_completed).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="quests"
        onSelectCategory={handleSelectCategory}
        totalPerksCount={totalPerksCount}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-5 sm:p-7 lg:p-9 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        {/* ── Atmospheric Hero Header ── */}
        <div className="mb-7 flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-amber-50/80 via-white to-slate-100 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-950/90 p-6 sm:p-7 backdrop-blur-xl shadow-sm dark:shadow-2xl">
            {/* Background Glow Accents */}
            <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-12 -bottom-12 h-36 w-36 rounded-full bg-red-600/10 blur-3xl" />

            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Header Title & Subtitle */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-sm dark:shadow-lg dark:shadow-amber-950/40">
                  <Trophy className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight sm:text-3xl">
                      {dict?.quests?.title || dict?.landing?.questsTitle || 'Trial Quests & Milestones'}
                    </h1>
                    <span className="rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                      {dict?.quests?.xpSystem || 'XP System'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                    {dict?.quests?.subtitle || 'Complete daily and weekly trials to earn XP, level up your status, and unlock achievements.'}
                  </p>
                </div>
              </div>


              {/* Dynamic XP Counter Badges */}
              <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 shadow-sm">
                  <Zap className="h-4 w-4 text-amber-500 dark:text-amber-400 animate-pulse" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-500/80">
                      {dict?.stats?.totalXpEarned || 'Total XP'}
                    </span>
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300 font-mono">+{totalXpEarned} XP</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-500/80">
                      {dict?.stats?.completed || 'Completed'}
                    </span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 font-mono">
                      {totalQuestsCompleted} / {quests.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Claim Toast Notification */}
        {claimedToast && (
          <div className="mb-6 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 px-5 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 animate-in slide-in-from-top-2 shadow-sm">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{claimedToast}</span>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-1">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
            }`}
          >
            All Quests ({quests.length})
          </button>
          <button
            onClick={() => setFilterCategory('daily')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              filterCategory === 'daily'
                ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            {dict?.quests?.dailyQuests || 'Daily Quests'}
          </button>
          <button
            onClick={() => setFilterCategory('weekly')}

            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              filterCategory === 'weekly'
                ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
            {dict?.quests?.weeklyQuests || 'Weekly Quests'}
          </button>
        </div>

        {/* Quests List Grid */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-28 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80" />
              ))}
            </div>
          ) : filteredQuests.length === 0 ? (
            <div className="my-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-12 text-center backdrop-blur-sm shadow-sm">
              <Scroll className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600 mb-3" />
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-200">
                {dict?.empty?.title || 'No Quests Found'}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {dict?.quests?.noQuestsDesc || 'No quests available in this category right now. Check back soon for new trial objectives!'}
              </p>
            </div>
          ) : (

            filteredQuests.map((quest) => {
              const isReadyToClaim = quest.progress >= quest.goal && !quest.is_completed;
              const pct = Math.min(100, Math.round((quest.progress / quest.goal) * 100));

              return (
                <div
                  key={quest.id}
                  className={`rounded-3xl border p-5 transition-all shadow-sm ${
                    quest.is_completed
                      ? 'border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-slate-900/40 opacity-75'
                      : isReadyToClaim
                      ? 'border-amber-500/50 bg-gradient-to-r from-amber-50/90 via-white to-white dark:from-amber-950/30 dark:via-slate-900/90 dark:to-slate-900/90 shadow-md dark:shadow-amber-950/30'
                      : 'border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            quest.category === 'weekly'
                              ? 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30'
                              : 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {quest.category}
                        </span>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{quest.title}</h3>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-3.5 max-w-2xl">{quest.description}</p>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                          <span>{dict?.stats?.questProgress || 'Objective Progress'}</span>
                          <span>
                            {quest.progress} / {quest.goal} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full transition-all duration-500 ${
                              quest.is_completed
                                ? 'bg-emerald-500'
                                : isReadyToClaim
                                ? 'bg-gradient-to-r from-amber-500 to-emerald-400 animate-pulse'
                                : 'bg-amber-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action & Reward Badge */}
                    <div className="flex sm:flex-col items-center justify-between sm:items-end gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                      {/* XP Badge */}
                      <div className="flex items-center gap-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-black text-amber-700 dark:text-amber-400 shadow-sm">
                        <Zap className="h-4 w-4" />
                        <span>+{quest.xp_reward} XP</span>
                      </div>

                      {/* Claim Button */}
                      {quest.is_completed ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{dict?.stats?.claimed || 'Claimed'}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleClaim(quest)}
                          disabled={!isReadyToClaim || claimingId === quest.id}
                          className={`flex items-center gap-2 px-5 py-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                            isReadyToClaim
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-900/40 hover:from-amber-400 hover:to-amber-500 animate-bounce'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>
                            {claimingId === quest.id
                              ? 'Claiming...'
                              : isReadyToClaim
                              ? 'Claim Reward'
                              : 'In Progress'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
