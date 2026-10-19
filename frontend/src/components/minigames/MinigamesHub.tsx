'use client';

import { getErrorMessage } from "@/utils/api";
// frontend/src/components/minigames/MinigamesHub.tsx
import { Button, buttonClassName } from '@/components/common/Button';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSignInThen } from '@/hooks/useSignInThen';
import { AuthRequiredState } from '@/components/common/AuthRequiredState';
import {
  Gamepad2, Calendar, Sparkles, Flame, Plus, Play, Share2, Download, Upload, Trash2,
  Check, Trophy, AlertCircle, X, History, Layers, MapPin, Zap, Volume2, Eye, BookOpen,
} from 'lucide-react';
import { useGlobalNsfwPreference, hasSeenNsfwOnboarding } from '@/utils/nsfwAck';

const NsfwOnboardingModal = dynamic(
  () => import('@/components/common/NsfwOnboardingModal').then((m) => m.NsfwOnboardingModal),
  { ssr: false }
);
import { cn } from '@/utils/cn';
import type { ChallengeDefinition } from '@/types/minigame';
import { getCustomChallenges, deleteCustomChallenge, saveCustomChallenge, getDailyStreak, type DailyStreakData } from '@/utils/minigames/storage';
import { exportChallengeToJson, importChallengeFromJson } from '@/utils/minigames/jsonExportImport';
import { buildChallengeShareUrl, encodeChallengeShare } from '@/utils/minigames/shareLink';
import { signExportPayload } from '@/utils/contentSigning';
import { signingPayload } from '@/utils/contentPayload';
import { checkDocument } from '@/utils/contentRevocation';

import { tip } from '@/components/common/Tooltip';
import { NsfwBadge } from '@/components/common/NsfwBadge';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { EmptyState } from '@/components/common/EmptyState';
import { copyTextWithFallback } from '@/utils/clipboard';
import { useDictionary } from "@/context/DictionaryContext";
import { formatMessage } from '@/utils/i18nFormat';
import { Badge } from '@/components/common/Badge';
import { InfoChip } from '@/components/common/InfoChip';
import { Surface } from '@/components/common/Surface';

const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), { ssr: false });

interface MinigamesHubProps {
  locale: string;
}

export const MinigamesHub: React.FC<MinigamesHubProps> = ({ locale }) => {
  const dict = useDictionary();
  const t = dict.minigames;
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const signIn = useSignInThen();
  const [customTrials, setCustomTrials] = useState<ChallengeDefinition[]>([]);
  const [showNsfw, setShowNsfw] = useGlobalNsfwPreference();
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [streakData, setStreakData] = useState<DailyStreakData>({ currentStreak: 0, maxStreak: 0, lastCompletedDate: null });
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [shareLoadingId, setShareLoadingId] = useState<string | number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom trials, streaks, and check onboarding on mount
  useEffect(() => {
    setCustomTrials(getCustomChallenges());
    setStreakData(getDailyStreak());
    if (!hasSeenNsfwOnboarding()) setOnboardingOpen(true);
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

  const ensureSignedTrial = async (trial: ChallengeDefinition): Promise<ChallengeDefinition> => {
    if (trial._manifest) return trial;
    // No unsigned fallback: a trial only leaves the app signed with the author's account.
    if (!user) throw new Error(dict.tierLists.signFailed);
    const manifest = await signExportPayload('minigame', signingPayload('minigame', trial));
    if (!manifest) throw new Error(dict.tierLists.signFailed);
    const signed = { ...trial, _manifest: manifest };
    saveCustomChallenge(signed);
    setCustomTrials(getCustomChallenges());
    return signed;
  };

  const handleExport = async (trial: ChallengeDefinition) => {
    try {
      exportChallengeToJson(await ensureSignedTrial(trial));
    } catch (err) {
      setImportError(getErrorMessage(err, dict.tierLists.signFailed));
    }
  };

  const handleShare = async (trial: ChallengeDefinition) => {
    if (!trial.id) return;
    setShareLoadingId(trial.id);
    try {
      const signed = await ensureSignedTrial(trial);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = buildChallengeShareUrl(origin, await encodeChallengeShare(signed));
      if (!(await copyTextWithFallback(fullUrl))) throw new Error('Copy failed');
      setCopiedId(trial.id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      console.error('Failed to create share link:', err);
      setImportError(getErrorMessage(err, dict.tierLists.signFailed));
    } finally {
      setShareLoadingId(null);
    }
  };


  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const imported = importChallengeFromJson(content);
        const check = await checkDocument('minigame', imported);
        if (check.revoked) {
          setImportError(dict.tierLists.contentRevoked);
          return;
        }
        if (check.signed === false) {
          setImportError(dict.tierLists.unsignedContent);
          return;
        }
        saveCustomChallenge(imported);
        setCustomTrials(getCustomChallenges());
      } catch (err) {
        setImportError(getErrorMessage(err, 'Failed to import trial.'));
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
        <Surface padding="none" className="mt-6 inline-flex items-center gap-4 px-5 py-2.5 shadow-xl backdrop-blur-md">
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
            <Badge tone="green" size="md" plain>
              {t.alreadyCompletedToday}
            </Badge>
          )}
        </Surface>
      </div>

      {importError && (
        <div
          role="alert"
          className="w-full mb-6 flex items-center gap-2.5 rounded-card border border-accent-red/30 bg-accent-red/10 p-3 type-strong text-accent-red animate-in fade-in duration-150 shadow-xs"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{importError}</span>
          <Button
            type="button"
            onClick={() => setImportError(null)}
            aria-label={dict.modal.close}
            variant="ghostDanger" size="xs" icon className="shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Flagship Game Mode Cards Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {/* Daily Fog Gauntlet */}
        <Surface padding="none" className="p-6 shadow-xl flex flex-col justify-between hover:border-accent-red/60 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-red/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-card bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <Badge tone="red" size="sm">
                {t.dailyTrial}
              </Badge>
            </div>
            <h2 className="text-xl font-black text-text-primary mb-1.5">{t.dailyTrial}</h2>
            <p className="type-body text-text-secondary">
              {t.dailySubtitle}
            </p>
          </div>
          <Link
            href={`/${locale}/minigames/play?type=daily&mode=fog_trial`}
            className={buttonClassName('primary', 'md', 'mt-6 w-full')}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t.playDaily}</span>
          </Link>
        </Surface>

        {/* Classic DBD Idle */}
        <Surface padding="none" className="p-6 shadow-xl flex flex-col justify-between hover:border-accent-amber/60 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-amber/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-card bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <Badge tone="amber" size="sm">
                {t.dbdIdleClassic}
              </Badge>
            </div>
            <h2 className="text-xl font-black text-text-primary mb-1.5">{t.dbdIdleClassic}</h2>
            <p className="type-body text-text-secondary">
              {t.dbdIdleClassicDesc}
            </p>
          </div>
          <Link
            href={`/${locale}/minigames/idle`}
            className={buttonClassName('amber', 'md', 'mt-6 w-full')}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t.playIdle}</span>
          </Link>
        </Surface>

        {/* Challenge Creator */}
        <Surface padding="none" className="p-6 shadow-xl flex flex-col justify-between hover:border-accent-red/60 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-red/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-card bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <Badge tone="red" size="sm">
                {t.creatorBadge}
              </Badge>
            </div>
            <h2 className="text-xl font-black text-text-primary mb-1.5">{t.creatorTitle}</h2>
            <p className="type-body text-text-secondary">{t.creatorSubtitle}</p>
          </div>
          <Link
            href={`/${locale}/minigames/creator`}
            className={buttonClassName('primary', 'md', 'mt-6 w-full')}
          >
            <Plus className="w-4 h-4" />
            <span>{t.createChallenge}</span>
          </Link>
        </Surface>
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
          <Surface padding="none" className="p-5 shadow-lg flex flex-col justify-between hover:border-accent-green/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-card bg-accent-green/10 border border-accent-green/30 flex items-center justify-center text-accent-green mb-3 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">{t.modes.realm_guesser}</h3>
              <p className="type-body text-text-secondary">
                {t.modeDescriptions.realm_guesser}
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=realm`}
              className={buttonClassName('success', 'md', 'mt-5 w-full')}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.playRealmGuesser}</span>
            </Link>
          </Surface>

          {/* Perk Decryption */}
          <Surface padding="none" className="p-5 shadow-lg flex flex-col justify-between hover:border-accent-amber/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-card bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">{t.modes.perk_icon}</h3>
              <p className="type-body text-text-secondary">
                {t.modeDescriptions.perk_icon}
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=perk`}
              className={buttonClassName('amber', 'md', 'mt-5 w-full')}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.playPerkGuesser}</span>
            </Link>
          </Surface>

          {/* Killer Power Guesser */}
          <Surface padding="none" className="p-5 shadow-lg flex flex-col justify-between hover:border-accent-red/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-card bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red mb-3 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">{t.modes.killer_power}</h3>
              <p className="type-body text-text-secondary">
                {t.modeDescriptions.killer_power}
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=power`}
              className={buttonClassName('primary', 'md', 'mt-5 w-full')}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.playPowerGuesser}</span>
            </Link>
          </Surface>

          {/* Terror Radius Audio */}
          <Surface padding="none" className="p-5 shadow-lg flex flex-col justify-between hover:border-accent-red/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-card bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red mb-3 group-hover:scale-105 transition-transform">
                <Volume2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">{t.modes.terror_radius}</h3>
              <p className="type-body text-text-secondary">
                {t.modeDescriptions.terror_radius}
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=audio`}
              className={buttonClassName('primary', 'md', 'mt-5 w-full')}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.playAudioGuesser}</span>
            </Link>
          </Surface>

          {/* Pixel Avatar Guesser */}
          <Surface padding="none" className="p-5 shadow-lg flex flex-col justify-between hover:border-accent-amber/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-card bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber mb-3 group-hover:scale-105 transition-transform">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">{t.modes.pixel_avatar}</h3>
              <p className="type-body text-text-secondary">
                {t.modeDescriptions.pixel_avatar}
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=pixel`}
              className={buttonClassName('amber', 'md', 'mt-5 w-full')}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.playPixelGuesser}</span>
            </Link>
          </Surface>

          {/* Quote & Lore Riddle */}
          <Surface padding="none" className="p-5 shadow-lg flex flex-col justify-between hover:border-accent-green/60 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-card bg-accent-green/10 border border-accent-green/30 flex items-center justify-center text-accent-green mb-3 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">{t.modes.quote_lore}</h3>
              <p className="type-body text-text-secondary">
                {t.modeDescriptions.quote_lore}
              </p>
            </div>
            <Link
              href={`/${locale}/minigames/play?type=repeatable&mode=quote`}
              className={buttonClassName('success', 'md', 'mt-5 w-full')}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.playLoreGuesser}</span>
            </Link>
          </Surface>
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
              onClick={() => {
                if (!isAuthenticated) {
                  signIn.run(() => {}); // sign in only: a file picker cannot open without a fresh click
                  return;
                }
                fileInputRef.current?.click();
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t.importJson}</span>
            </Button>
            <Link
              href={`/${locale}/minigames/creator`}
              onClick={(e) => {
                if (!isAuthenticated) {
                  e.preventDefault();
                  signIn.run(() => router.push(`/${locale}/minigames/creator`));
                }
              }}
              className={buttonClassName('primary', 'sm')}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.createChallenge}</span>
            </Link>
          </div>
        </div>

        {!isAuthenticated ? (
          <AuthRequiredState
            variant="compact"
            title={t.loginToManage}
            subtitle={t.loginToManageDesc}
          />
        ) : customTrials.length === 0 ? (
          <EmptyState variant="compact" title={t.noCustomTrials} />
        ) : (
          <div className="max-h-128 overflow-y-auto overflow-x-hidden p-1 rounded-card border border-border-color/60 bg-bg-surface/30">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customTrials.map((trial) => {
                const id = trial.id!;
                const isShareLoading = shareLoadingId === id;
                const isCopied = copiedId === id;

                return (
                  <Surface
                    key={String(id)}
                    padding="none" className="p-5 shadow-lg flex flex-col justify-between hover:border-border-color transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-text-primary text-base truncate">{trial.title}</h3>
                        <InfoChip>
                          {formatMessage(t.roundsCount, { count: trial.rounds.length }, locale)}
                        </InfoChip>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {trial.is_nsfw && <NsfwBadge label={t.nsfw.badge} />}
                        {trial.is_nsfw && !showNsfw && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            onClick={() => setShowNsfw(true)}
                          >
                            {dict.tierLists.nsfw.reveal}
                          </Button>
                        )}
                      </div>
                      {trial.description && (
                        <p className={cn("text-xs text-text-secondary mt-1 line-clamp-2", trial.is_nsfw && !showNsfw && "blur-xs select-none")}>
                          {trial.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-border-color flex items-center justify-between gap-2">
                      <Link
                        href={`/${locale}/minigames/play?id=${encodeURIComponent(String(id))}`}
                        className={buttonClassName('success', 'sm')}
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
                  </Surface>
                );
              })}
            </div>
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

      {signIn.isAuthModalOpen && <AuthModal isOpen onClose={signIn.closeAuthModal} />}
      <NsfwOnboardingModal isOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </div>
  );
};
