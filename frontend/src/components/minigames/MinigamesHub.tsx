// frontend/src/components/minigames/MinigamesHub.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Gamepad2,
  Calendar,
  Sparkles,
  Flame,
  Plus,
  Play,
  Share2,
  Download,
  Upload,
  Trash2,
  Check,
  Trophy,
  History,
  Layers,
  MapPin,
  Zap,
  Volume2,
  Eye,
  BookOpen,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { ChallengeDefinition } from '@/types/minigame';
import {
  getCustomChallenges,
  deleteCustomChallenge,
  saveCustomChallenge,
  getDailyStreak,
  type DailyStreakData,
} from '@/utils/minigames/storage';
import { exportChallengeToJson, importChallengeFromJson } from '@/utils/minigames/jsonExportImport';
import { createSharedLink } from '@/services/minigameApi';

interface MinigamesHubProps {
  locale: string;
  dict: Dictionary;
}

export const MinigamesHub: React.FC<MinigamesHubProps> = ({ locale, dict }) => {
  const t = dict.minigames;
  const [customTrials, setCustomTrials] = useState<ChallengeDefinition[]>([]);
  const [streakData, setStreakData] = useState<DailyStreakData>({
    currentStreak: 0,
    maxStreak: 0,
    lastCompletedDate: null,
  });
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [shareLoadingId, setShareLoadingId] = useState<string | number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom trials and streaks on mount
  useEffect(() => {
    setCustomTrials(getCustomChallenges());
    setStreakData(getDailyStreak());
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isCompletedToday = streakData.lastCompletedDate === todayStr;

  const handleDelete = (id: string | number) => {
    if (window.confirm(t.confirmDelete)) {
      deleteCustomChallenge(id);
      setCustomTrials(getCustomChallenges());
    }
  };

  const handleExport = (trial: ChallengeDefinition) => {
    exportChallengeToJson(trial);
  };

  const handleShare = async (trial: ChallengeDefinition) => {
    if (!trial.id) return;
    setShareLoadingId(trial.id);
    try {
      const res = await createSharedLink(trial);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = res.share_url.startsWith('http') ? res.share_url : `${origin}${res.share_url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(trial.id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      console.error('Failed to create share link:', err);
    } finally {
      setShareLoadingId(null);
    }
  };


  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = importChallengeFromJson(content);
        const saved = saveCustomChallenge(imported);
        setCustomTrials(getCustomChallenges());
      } catch (err: any) {
        alert(err.message || 'Failed to import trial.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Hero Header */}
      <div className="w-full text-center mb-8 relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs font-bold uppercase tracking-wider mb-3">
          <Gamepad2 className="w-4 h-4" />
          <span>DBD Idle & Minigames Hub</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text-primary tracking-tight">
          {t.hubTitle}
        </h1>
        <p className="text-sm sm:text-base text-text-secondary mt-2 max-w-xl mx-auto">
          {t.hubSubtitle}
        </p>


        {/* Daily Streak Banner */}
        <div className="mt-6 inline-flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-amber-500 font-extrabold text-sm sm:text-base">
            <Flame className="w-5 h-5 fill-current animate-pulse" />
            <span>
              {t.streak.current}: {streakData.currentStreak} {t.streak.days}
            </span>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="text-xs sm:text-sm text-zinc-400 font-semibold">
            {t.streak.best}: {streakData.maxStreak}
          </div>
          {isCompletedToday && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
              {t.alreadyCompletedToday}
            </span>
          )}
        </div>
      </div>

      {/* Flagship Game Mode Cards Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {/* Daily Fog Gauntlet */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-700/80 shadow-xl flex flex-col justify-between hover:border-accent-red/60 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-red/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/30">
                Daily Trial
              </span>
            </div>
            <h2 className="text-xl font-black text-zinc-100 mb-1.5">{t.dailyTrial}</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Multi-round interchangeable gauntlet (Realm, Power, Audio & Classic Idle) synchronized every 24h.
            </p>
          </div>
          <Link
            href={`/${locale}/minigames/play?type=daily&mode=fog_trial`}
            className="mt-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent-red hover:bg-accent-red/90 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-accent-red/20 transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t.playDaily}</span>
          </Link>
        </div>

        {/* Classic DBD Idle */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-700/80 shadow-xl flex flex-col justify-between hover:border-amber-500/60 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                DBD Idle
              </span>
            </div>
            <h2 className="text-xl font-black text-zinc-100 mb-1.5">DBD Idle Classic</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Full 98 survivor & killer roster attribute comparison. Role, gender, chapter, year, height deduction.
            </p>
          </div>
          <Link
            href={`/${locale}/minigames/idle`}
            className="mt-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-600/20 transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play DBD Idle</span>
          </Link>
        </div>

        {/* Challenge Creator */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-700/80 shadow-xl flex flex-col justify-between hover:border-purple-500/60 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Creator
              </span>
            </div>
            <h2 className="text-xl font-black text-zinc-100 mb-1.5">{t.creatorTitle}</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">{t.creatorSubtitle}</p>
          </div>
          <Link
            href={`/${locale}/minigames/creator`}
            className="mt-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createChallenge}</span>
          </Link>
        </div>
      </div>

      {/* Standalone Interactive Guesser Modes Section */}
      <div className="w-full mb-12">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Standalone Guesser Modes</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Targeted single-mode endless challenges to test specific Dead by Daylight skills.
            </p>

          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Realm Guesser */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-lg flex flex-col justify-between hover:border-emerald-500/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">Realm & Map Guesser</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Identify the Fog realm from cropped landmarks and tiles. Zooms out progressively with each incorrect guess.
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=realm`}
              className="mt-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Realm Guesser</span>
            </Link>
          </div>

          {/* Perk Decryption */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-lg flex flex-col justify-between hover:border-violet-500/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">Perk Decryption</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Identify the perk from a distorted, blurred icon. Unlock archetype and teachable hints as you guess.
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=perk`}
              className="mt-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-violet-600/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Perk Guesser</span>
            </Link>
          </div>

          {/* Killer Power Guesser */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-lg flex flex-col justify-between hover:border-amber-500/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">Killer Power Guesser</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Deduce the Killer from their unique power icon, mechanics, and redacted power lore descriptions.
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=power`}
              className="mt-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-amber-600/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Power Guesser</span>
            </Link>
          </div>

          {/* Terror Radius Audio */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-lg flex flex-col justify-between hover:border-rose-500/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 group-hover:scale-105 transition-transform">
                <Volume2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">Terror Radius Audio</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Listen to synthesized heartbeats and soundscape layers from 32m down to direct chase to identify the Killer.
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=audio`}
              className="mt-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-rose-600/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Audio Guesser</span>
            </Link>
          </div>

          {/* Pixel Avatar Guesser */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-lg flex flex-col justify-between hover:border-sky-500/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3 group-hover:scale-105 transition-transform">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">Pixel Avatar Guesser</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Guess the survivor or killer from heavily pixelated portraits that de-pixelate with each attempt.
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=pixel`}
              className="mt-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-sky-600/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Pixel Guesser</span>
            </Link>
          </div>

          {/* Quote & Lore Riddle */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-lg flex flex-col justify-between hover:border-indigo-500/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">Quote & Lore Guesser</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Fog character voice lines, perk lore snippets, and backstory trivia deduction.
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=quote`}
              className="mt-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Lore Guesser</span>
            </Link>
          </div>
        </div>
      </div>


      {/* Custom Player Trials Section */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">{t.myCustomTrials}</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Saved strictly in your browser local storage.
            </p>

          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs border border-zinc-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t.importJson}</span>
            </button>
            <Link
              href={`/${locale}/minigames/creator`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-red hover:bg-accent-red/90 text-white font-semibold text-xs shadow-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.createChallenge}</span>
            </Link>
          </div>
        </div>

        {customTrials.length === 0 ? (
          <div className="w-full p-8 rounded-3xl bg-zinc-900/60 border border-dashed border-zinc-800 text-center">
            <p className="text-sm text-zinc-400">{t.noCustomTrials}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTrials.map((trial) => {
              const id = trial.id!;
              const isShareLoading = shareLoadingId === id;
              const isCopied = copiedId === id;

              return (
                <div
                  key={String(id)}
                  className="p-5 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-lg flex flex-col justify-between hover:border-zinc-600 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-zinc-100 text-base truncate">{trial.title}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 flex-shrink-0">
                        {trial.rounds.length} {trial.rounds.length === 1 ? 'Round' : 'Rounds'}
                      </span>
                    </div>
                    {trial.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {trial.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                    <Link
                      href={`/${locale}/minigames/play?id=${encodeURIComponent(String(id))}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{t.playTrial}</span>
                    </Link>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleShare(trial)}
                        disabled={isShareLoading}
                        title={t.shareTrial}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExport(trial)}
                        title={t.exportJson}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(id)}
                        title={t.deleteTrial}
                        className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-900/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
