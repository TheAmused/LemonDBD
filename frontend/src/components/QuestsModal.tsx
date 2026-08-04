'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Zap,
  CheckCircle2,
  Calendar,
  Sparkles,
  Flame,
} from 'lucide-react';
import { Quest } from '@/types/quest';
import { fetchQuests, claimQuest } from '@/services/questApi';

interface QuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: any;
}

export const QuestsModal: React.FC<QuestsModalProps> = ({ isOpen, onClose, dict }) => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'daily' | 'weekly'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimedToast, setClaimedToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadQuests();
    }
  }, [isOpen]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900 shadow-2xl text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="relative bg-gradient-to-r from-amber-600/30 via-slate-900 to-red-600/20 p-6 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-950/50">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-wide text-white">
                  Trial Quests & Milestones
                </h2>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase">
                  XP System
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete daily and weekly trials to earn XP and level up your status.
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-4 grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-400">Total XP Claimed</span>
              </div>
              <span className="text-sm font-black font-mono text-amber-400">
                +{totalXpEarned} XP
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-400">Completed</span>
              </div>
              <span className="text-sm font-black font-mono text-emerald-400">
                {totalQuestsCompleted} / {quests.length}
              </span>
            </div>
          </div>
        </div>

        {/* Claim Toast Notification */}
        {claimedToast && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-6 py-2.5 text-xs font-bold text-emerald-300 flex items-center gap-2 animate-in slide-in-from-top-2">
            <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{claimedToast}</span>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 bg-slate-900/60">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Quests ({quests.length})
          </button>
          <button
            onClick={() => setFilterCategory('daily')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              filterCategory === 'daily'
                ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Daily Quests
          </button>
          <button
            onClick={() => setFilterCategory('weekly')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              filterCategory === 'weekly'
                ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-rose-400" />
            Weekly Quests
          </button>
        </div>

        {/* Quests List Container */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-800/50" />
              ))}
            </div>
          ) : filteredQuests.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No quests found in this category.
            </div>
          ) : (
            filteredQuests.map((quest) => {
              const isReadyToClaim = quest.progress >= quest.goal && !quest.is_completed;
              const pct = Math.min(100, Math.round((quest.progress / quest.goal) * 100));

              return (
                <div
                  key={quest.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    quest.is_completed
                      ? 'border-slate-800 bg-slate-950/40 opacity-75'
                      : isReadyToClaim
                      ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 shadow-lg shadow-amber-950/20'
                      : 'border-slate-800 bg-slate-950/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                            quest.category === 'weekly'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {quest.category}
                        </span>
                        <h3 className="font-bold text-sm text-slate-100">{quest.title}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{quest.description}</p>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-400 font-mono">
                          <span>Progress</span>
                          <span>
                            {quest.progress} / {quest.goal} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
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
                    <div className="flex sm:flex-col items-center justify-between sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      {/* XP Badge */}
                      <div className="flex items-center gap-1 rounded-xl bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs font-black text-amber-400">
                        <Zap className="h-3.5 w-3.5" />
                        <span>+{quest.xp_reward} XP</span>
                      </div>

                      {/* Claim Button */}
                      {quest.is_completed ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Claimed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleClaim(quest)}
                          disabled={!isReadyToClaim || claimingId === quest.id}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isReadyToClaim
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-900/40 hover:from-amber-400 hover:to-amber-500 animate-bounce'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
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

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
