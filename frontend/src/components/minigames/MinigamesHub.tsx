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
import { Gamepad2, Flame, Plus, Upload, AlertCircle, X } from 'lucide-react';
import { useGlobalNsfwPreference, hasSeenNsfwOnboarding } from '@/utils/nsfwAck';
import { ThunderPulseIcon } from '@/components/icons/DbdIcons';

const NsfwOnboardingModal = dynamic(
  () => import('@/components/common/NsfwOnboardingModal').then((m) => m.NsfwOnboardingModal),
  { ssr: false }
);
import type { ChallengeDefinition } from '@/types/minigame';
import { saveCustomChallenge, getDailyStreak, wonDailyOn, type DailyStreakData } from '@/utils/minigames/storage';
import { useCustomChallenges } from '@/hooks/useCustomChallenges';
import { exportChallengeToJson, importChallengeFromJson } from '@/utils/minigames/jsonExportImport';
import { buildChallengeShareUrl, encodeChallengeShare } from '@/utils/minigames/shareLink';
import { signExportPayload } from '@/utils/contentSigning';
import { signingPayload } from '@/utils/contentPayload';
import { checkDocument } from '@/utils/contentRevocation';

import { tip } from '@/components/common/Tooltip';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { EmptyState } from '@/components/common/EmptyState';
import { copyTextWithFallback } from '@/utils/clipboard';
import { useDictionary } from "@/context/DictionaryContext";
import { Badge } from '@/components/common/Badge';
import { Surface } from '@/components/common/Surface';
import { FlagshipCard, GuesserCard, CustomTrialCard } from './MinigamesHubCards';
import { flagshipModes, guesserModes } from './hubModes';

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
  const { trials: customTrials, reload: reloadCustomTrials, pendingDeleteId, requestDelete, cancelDelete, confirmDelete } =
    useCustomChallenges();
  const [showNsfw, setShowNsfw] = useGlobalNsfwPreference();
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [streakData, setStreakData] = useState<DailyStreakData>({ currentStreak: 0, maxStreak: 0, lastCompletedDate: null });
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [shareLoadingId, setShareLoadingId] = useState<string | number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load streaks and check onboarding on mount
  useEffect(() => {
    setStreakData(getDailyStreak());
    if (!hasSeenNsfwOnboarding()) setOnboardingOpen(true);
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isCompletedToday = wonDailyOn(streakData, todayStr);

  const ensureSignedTrial = async (trial: ChallengeDefinition): Promise<ChallengeDefinition> => {
    if (trial._manifest) return trial;
    // No unsigned fallback: a trial only leaves the app signed with the author's account.
    if (!user) throw new Error(dict.tierLists.signFailed);
    const manifest = await signExportPayload('minigame', signingPayload('minigame', trial));
    if (!manifest) throw new Error(dict.tierLists.signFailed);
    const signed = { ...trial, _manifest: manifest };
    saveCustomChallenge(signed);
    reloadCustomTrials();
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
        reloadCustomTrials();
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

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {flagshipModes(t, locale).map((mode) => <FlagshipCard key={mode.href} {...mode} />)}
      </div>

      <div className="w-full mb-12">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-text-primary">{t.standaloneTitle}</h2>
          <p className="text-xs text-text-secondary mt-0.5">{t.standaloneSubtitle}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {guesserModes(t, locale).map((mode) => <GuesserCard key={mode.href} {...mode} />)}
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
              icon
              onClick={() => setOnboardingOpen(true)}
              {...tip(dict.smashOrPass.effectsPrefs.button, dict.smashOrPass.effectsPrefs.buttonDesc, 'action')}
              aria-label={dict.smashOrPass.effectsPrefs.button}
              className="h-9 w-9 min-h-9 min-w-9"
            >
              <ThunderPulseIcon className="w-4 h-4" aria-hidden="true" />
            </Button>
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
              {customTrials.map((trial) => (
                <CustomTrialCard
                  key={String(trial.id)}
                  trial={trial}
                  locale={locale}
                  showNsfw={showNsfw}
                  onRevealNsfw={() => setShowNsfw(true)}
                  isShareLoading={shareLoadingId === trial.id}
                  isCopied={copiedId === trial.id}
                  onShare={() => handleShare(trial)}
                  onExport={() => handleExport(trial)}
                  onDelete={() => requestDelete(trial.id!)}
                />
              ))}
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
        onCancel={cancelDelete}
      />

      {signIn.isAuthModalOpen && <AuthModal isOpen onClose={signIn.closeAuthModal} />}
      <NsfwOnboardingModal isOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </div>
  );
};
