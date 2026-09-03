'use client';
// frontend/src/components/QuestsModal.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Trophy,
  Zap,
  CheckCircle2,
  Calendar,
  Sparkles,
  Flame,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { Quest } from '@/types/quest';
import { fetchQuests, claimQuest } from '@/services/questApi';
import { DbdSpinner } from '@/components/DbdSpinner';

interface QuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: Dictionary;
}

export const QuestsModal: React.FC<QuestsModalProps> = ({ isOpen, onClose, dict }) => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'daily' | 'weekly'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimedToast, setClaimedToast] = useState<string | null>(null);

  const loadQuests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchQuests();
      setQuests(res.quests || []);
    } catch (err: unknown) {
      console.error('Failed to fetch quests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadQuests();
    }
  }, [isOpen, loadQuests]);

  const handleClaim = async (quest: Quest) => {
    if (quest.is_completed || quest.progress < quest.goal || claimingId !== null) return;
    setClaimingId(quest.id);
    try {
      const res = await claimQuest(quest.id);
      setQuests((prev) =>
        prev.map((q) => (q.id === quest.id ? { ...q, is_completed: true, progress: q.goal } : q))
      );
      setClaimedToast(`+${res.xp_reward || quest.xp_reward} XP: ${quest.title}`);
      setTimeout(() => setClaimedToast(null), 4000);
    } catch (err: unknown) {
      console.error('Failed to claim quest:', err);
    } finally {
      setClaimingId(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quests-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border-color bg-bg-surface shadow-2xl text-text-primary animate-in zoom-in-95 duration-200 cursor-default transition-colors"
      >
        <div className="relative bg-bg-elevated/40 p-6 border-b border-border-color">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
            aria-label={dict?.modal?.close}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-amber/15 border border-accent-amber/30 text-accent-amber shadow-xs">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="quests-modal-title" className="text-xl font-black tracking-wide text-text-primary">
                  {dict?.quests?.title}
                </h2>
                {dict?.quests?.xpSystem && (
                  <span className="rounded-full bg-accent-amber/15 border border-accent-amber/30 px-2.5 py-0.5 text-[10px] font-bold text-accent-amber uppercase">
                    {dict.quests.xpSystem}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center justify-between rounded-xl bg-bg-surface border border-border-color p-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent-amber animate-pulse" />
                {dict?.stats?.totalXpClaimed && (
                  <span className="text-xs font-semibold text-text-secondary">
                    {dict.stats.totalXpClaimed}
                  </span>
                )}
              </div>
              <span className="text-sm font-black font-mono text-accent-amber">
                {dict?.quests?.xpPrefix}
                {totalXpEarned} {dict?.quests?.xpSuffix}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-bg-surface border border-border-color p-3 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {dict?.stats?.completed && (
                  <span className="text-xs font-semibold text-text-secondary">
                    {dict.stats.completed}
                  </span>
                )}
              </div>
              <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400">
                {totalQuestsCompleted} / {quests.length}
              </span>
            </div>
          </div>
        </div>

        {claimedToast && (
          <div
            role="status"
            className="bg-emerald-50 text-emerald-800 border-b border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30 px-6 py-2.5 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2"
          >
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{claimedToast}</span>
          </div>
        )}

        <div className="flex items-center gap-2 px-6 pt-4 border-b border-border-color bg-bg-primary">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-bg-surface text-accent-amber border-t-2 border-accent-amber shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>{dict?.quests?.allQuestsPrefix}</span> ({quests.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('daily')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              filterCategory === 'daily'
                ? 'bg-bg-surface text-accent-amber border-t-2 border-accent-amber shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>{dict?.quests?.dailyQuests}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('weekly')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              filterCategory === 'weekly'
                ? 'bg-bg-surface text-accent-amber border-t-2 border-accent-amber shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-accent-red" />
            <span>{dict?.quests?.weeklyQuests}</span>
          </button>
        </div>

        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="w-full py-8 flex items-center justify-center">
              <DbdSpinner
                size="lg"
                layout="inline"
                accent="violet"
                needleSpeed={1.1}
                label={dict?.quests?.loadingQuests}
                dict={dict}
              />
            </div>
          ) : filteredQuests.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              {dict?.quests?.noQuestsFound}
            </div>
          ) : (
            filteredQuests.map((quest) => {
              const isReadyToClaim = quest.progress >= quest.goal && !quest.is_completed;
              const pct = Math.min(100, Math.round((quest.progress / quest.goal) * 100));

              return (
                <div
                  key={quest.id}
                  className={`rounded-2xl border p-4 transition-all shadow-xs ${
                    quest.is_completed
                      ? 'border-border-color bg-bg-elevated/40 opacity-75'
                      : isReadyToClaim
                        ? 'border-accent-amber/50 bg-bg-surface shadow-xs'
                        : 'border-border-color bg-bg-surface'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                            quest.category === 'weekly'
                              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30'
                              : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {quest.category}
                        </span>
                        <h3 className="font-bold text-sm text-text-primary">{quest.title}</h3>
                      </div>
                      <p className="text-xs text-text-secondary mb-3">{quest.description}</p>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-text-muted font-mono">
                          <span>{dict?.streaks?.runProgress}</span>
                          <span>
                            {quest.progress} / {quest.goal} ({pct}
                            {dict?.quests?.percentCloseParen || '%)'}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full transition-all duration-500 ${
                              quest.is_completed
                                ? 'bg-emerald-500'
                                : isReadyToClaim
                                  ? 'bg-accent-amber animate-pulse'
                                  : 'bg-accent-amber'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center justify-between sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-color">
                      <div className="flex items-center gap-1 rounded-xl bg-accent-amber/15 border border-accent-amber/30 px-2.5 py-1 text-xs font-black text-accent-amber shadow-xs">
                        <Zap className="h-3.5 w-3.5" />
                        <span>
                          {dict?.quests?.xpPrefix}
                          {quest.xp_reward} {dict?.quests?.xpSuffix}
                        </span>
                      </div>

                      {quest.is_completed ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{dict?.sidebar?.claimed}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleClaim(quest)}
                          disabled={!isReadyToClaim || claimingId === quest.id}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isReadyToClaim
                              ? 'bg-accent-amber hover:bg-accent-amber-hover text-text-inverted shadow-md shadow-accent-amber/20 animate-bounce'
                              : 'bg-bg-elevated text-text-muted cursor-not-allowed opacity-60'
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>
                            {claimingId === quest.id
                              ? dict?.quests?.claiming
                              : isReadyToClaim
                                ? dict?.quests?.claimReward
                                : dict?.quests?.inProgress}
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

        <div className="flex justify-end p-4 border-t border-border-color bg-bg-primary">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber shadow-xs"
          >
            {dict?.modal?.close}
          </button>
        </div>
      </div>
    </div>
  );
};

