// frontend/src/components/minigames/MinigamesHub.tsx
'use client';

import { Button } from '@/components/common/Button';
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
import { buildChallengeShareUrl, encodeChallengeShare } from '@/utils/minigames/shareLink';

import { tip } from '@/components/common/Tooltip';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { EmptyState } from '@/components/common/EmptyState';
import { copyTextWithFallback } from '@/utils/clipboard';
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

  const [pendingDeleteId, setPendingDeleteId] = useState<string | number | null>(null);

  const handleDelete = (id: string | number) => setPendingDeleteId(id);

  const confirmDelete = () => {
    if (pendingDeleteId === null) return;
    deleteCustomChallenge(pendingDeleteId);
    setCustomTrials(getCustomChallenges());
    setPendingDeleteId(null);
  };

  const handleExport = (trial: ChallengeDefinition) => {
    exportChallengeToJson(trial);
  };

  const handleShare = async (trial: ChallengeDefinition) => {
    if (!trial.id) return;
    setShareLoadingId(trial.id);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = buildChallengeShareUrl(origin, await encodeChallengeShare(trial));
      if (!(await copyTextWithFallback(fullUrl))) throw new Error('Copy failed');
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-red/10 border border-accent-red/30 text-accent-red type-label-sm mb-3">
          <Gamepad2 className="w-4 h-4" />
          <span>{t.hubBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text-primary tracking-tight">
          {t.hubTitle}
        </h1>
        <p className="text-sm sm:text-base text-text-secondary mt-2 max-w-xl mx-auto">
          {t.hubSubtitle}
        </p>


        {/* Daily Streak Banner */}
        <div className="mt-6 inline-flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-bg-surface border border-border-color shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-accent-amber font-extrabold text-sm sm:text-base">
            <Flame className="w-5 h-5 fill-current animate-pulse" />
            <span>
              {t.streak.current}: {streakData.currentStreak} {t.streak.days}
            </span>
          </div>
          <div className="h-4 w-px bg-border-color" />
          <div className="type-strong-fluid text-text-muted">
            {t.streak.best}: {streakData.maxStreak}
          </div>
          {isCompletedToday && (
            <span className="type-strong px-2.5 py-0.5 rounded-full bg-accent-green/20 text-accent-green border border-accent-green/40">
              {t.alreadyCompletedToday}
            </span>
          )}
        </div>
      </div>

      {/* Flagship Game Mode Cards Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {/* Daily Fog Gauntlet */}
        <div className="p-6 rounded-3xl bg-bg-surface border border-border-color shadow-xl flex flex-col justify-between hover:border-accent-red/60 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-red/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <span className="type-label-2xs px-2.5 py-1 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/30">
                {t.dailyTrial}
              </span>
            </div>
            <h2 className="text-xl font-black text-text-primary mb-1.5">{t.dailyTrial}</h2>
            <p className="type-body text-text-secondary">
              {t.dailySubtitle}
            </p>
          </div>
          <Link
            href={`/${locale}/minigames/play?type=daily&mode=fog_trial`}
            className="mt-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent-red hover:bg-accent-red-hover text-text-inverted type-label-sm shadow-lg shadow-accent-red/20 transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t.playDaily}</span>
          </Link>
        </div>

        {/* Classic DBD Idle */}
        <div className="p-6 rounded-3xl bg-bg-surface border border-border-color shadow-xl flex flex-col justify-between hover:border-accent-amber/60 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-amber/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="type-label-2xs px-2.5 py-1 rounded-full bg-accent-amber/20 text-accent-amber border border-accent-amber/30">
                {t.dbdIdleClassic}
              </span>
            </div>
            <h2 className="text-xl font-black text-text-primary mb-1.5">{t.dbdIdleClassic}</h2>
            <p className="type-body text-text-secondary">
              {t.dbdIdleClassicDesc}
            </p>
          </div>
          <Link
            href={`/${locale}/minigames/idle`}
            className="mt-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent-amber hover:bg-accent-amber-hover text-text-inverted type-label-sm shadow-lg shadow-accent-amber/20 transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t.playIdle}</span>
          </Link>
        </div>

        {/* Challenge Creator */}
        <div className="p-6 rounded-3xl bg-bg-surface border border-border-color shadow-xl flex flex-col justify-between hover:border-accent-red/60 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-red/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <span className="type-label-2xs px-2.5 py-1 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/30">
                {t.creatorBadge}
              </span>
            </div>
            <h2 className="text-xl font-black text-text-primary mb-1.5">{t.creatorTitle}</h2>
            <p className="type-body text-text-secondary">{t.creatorSubtitle}</p>
          </div>
          <Link
            href={`/${locale}/minigames/creator`}
            className="mt-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent-red hover:bg-accent-red-hover text-text-inverted type-label-sm shadow-lg shadow-accent-red/20 transition-all active:scale-95"
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
            <h2 className="text-2xl font-bold text-text-primary">{t.standaloneTitle}</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {t.standaloneSubtitle}
            </p>

          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Realm Guesser */}
          <div className="p-5 rounded-2xl bg-bg-surface border border-border-color shadow-lg flex flex-col justify-between hover:border-accent-green/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-accent-green/10 border border-accent-green/30 flex items-center justify-center text-accent-green mb-3 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">{t.modes.realm_guesser}</h3>
              <p className="type-body text-text-secondary">
                {t.modeDescriptions.realm_guesser}
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=realm`}
              className="mt-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent-green hover:bg-accent-green-hover text-text-inverted type-label-sm shadow-md shadow-accent-green/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.playRealmGuesser}</span>
            </Link>
          </div>

          {/* Perk Decryption */}
          <div className="p-5 rounded-2xl bg-bg-surface border border-border-color shadow-lg flex flex-col justify-between hover:border-accent-amber/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">{t.modes.perk_icon}</h3>
              <p className="type-body text-text-secondary">
                {t.modeDescriptions.perk_icon}
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=perk`}
              className="mt-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent-amber hover:bg-accent-amber-hover text-text-inverted type-label-sm shadow-md shadow-accent-amber/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.playPerkGuesser}</span>
            </Link>
          </div>

          {/* Killer Power Guesser */}
          <div className="p-5 rounded-2xl bg-bg-surface border border-border-color shadow-lg flex flex-col justify-between hover:border-accent-red/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red mb-3 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">{t.modes.killer_power}</h3>
              <p className="type-body text-text-secondary">
                {t.modeDescriptions.killer_power}
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=power`}
              className="mt-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent-red hover:bg-accent-red-hover text-text-inverted type-label-sm shadow-md shadow-accent-red/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.playPowerGuesser}</span>
            </Link>
          </div>

          {/* Terror Radius Audio */}
          <div className="p-5 rounded-2xl bg-bg-surface border border-border-color shadow-lg flex flex-col justify-between hover:border-accent-red/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red mb-3 group-hover:scale-105 transition-transform">
                <Volume2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">{t.modes.terror_radius}</h3>
              <p className="type-body text-text-secondary">
                {t.modeDescriptions.terror_radius}
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=audio`}
              className="mt-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent-red hover:bg-accent-red-hover text-text-inverted type-label-sm shadow-md shadow-accent-red/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.playAudioGuesser}</span>
            </Link>
          </div>

          {/* Pixel Avatar Guesser */}
          <div className="p-5 rounded-2xl bg-bg-surface border border-border-color shadow-lg flex flex-col justify-between hover:border-accent-amber/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber mb-3 group-hover:scale-105 transition-transform">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">{t.modes.pixel_avatar}</h3>
              <p className="type-body text-text-secondary">
                {t.modeDescriptions.pixel_avatar}
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=pixel`}
              className="mt-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent-amber hover:bg-accent-amber-hover text-text-inverted type-label-sm shadow-md shadow-accent-amber/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.playPixelGuesser}</span>
            </Link>
          </div>

          {/* Quote & Lore Riddle */}
          <div className="p-5 rounded-2xl bg-bg-surface border border-border-color shadow-lg flex flex-col justify-between hover:border-accent-green/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-accent-green/10 border border-accent-green/30 flex items-center justify-center text-accent-green mb-3 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">{t.modes.quote_lore}</h3>
              <p className="type-body text-text-secondary">
                {t.modeDescriptions.quote_lore}
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=quote`}
              className="mt-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent-green hover:bg-accent-green-hover text-text-inverted type-label-sm shadow-md shadow-accent-green/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.playLoreGuesser}</span>
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
              {t.localStorageNotice}
            </p>

          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t.importJson}</span>
            </Button>
            <Link
              href={`/${locale}/minigames/creator`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-red hover:bg-accent-red-hover text-text-inverted type-strong shadow-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.createChallenge}</span>
            </Link>
          </div>
        </div>

        {customTrials.length === 0 ? (
          <EmptyState variant="compact" title={t.noCustomTrials} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTrials.map((trial) => {
              const id = trial.id!;
              const isShareLoading = shareLoadingId === id;
              const isCopied = copiedId === id;

              return (
                <div
                  key={String(id)}
                  className="p-5 rounded-2xl bg-bg-surface border border-border-color shadow-lg flex flex-col justify-between hover:border-border-color transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-text-primary text-base truncate">{trial.title}</h3>
                      <span className="type-strong-2xs px-2 py-0.5 rounded bg-bg-elevated text-text-muted border border-border-subtle flex-shrink-0">
                        {trial.rounds.length} {trial.rounds.length === 1 ? t.roundSingular : t.roundPlural}
                      </span>
                    </div>
                    {trial.description && (
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                        {trial.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-border-color flex items-center justify-between gap-2">
                    <Link
                      href={`/${locale}/minigames/play?id=${encodeURIComponent(String(id))}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green hover:bg-accent-green-hover text-text-inverted type-strong transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{t.playTrial}</span>
                    </Link>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon
                        onClick={() => handleShare(trial)}
                        disabled={isShareLoading}
                        {...tip(t.shareTrial, undefined, 'action')}
                        aria-label={t.shareTrial}
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-accent-green" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        icon
                        onClick={() => handleExport(trial)}
                        {...tip(t.exportJson, undefined, 'action')}
                        aria-label={t.exportJson}
                      >
                        <Download className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        icon
                        onClick={() => handleDelete(id)}
                        {...tip(t.deleteTrial, undefined, 'action')}
                        aria-label={t.deleteTrial}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmModal
        open={pendingDeleteId !== null}
        title={t.deleteTrial}
        message={t.confirmDelete}
        confirmLabel={t.deleteTrial}
        cancelLabel={t.cancel}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
};
