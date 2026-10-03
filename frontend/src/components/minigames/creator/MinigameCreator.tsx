// frontend/src/components/minigames/creator/MinigameCreator.tsx
'use client';

import { Input, Textarea } from '@/components/common/Field';
import { Button } from '@/components/common/Button';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Save,
  Play,
  Download,
  Share2,
  ShieldCheck,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type {
  ChallengeDefinition,
  RoundConfig,
  MinigameCatalog,
} from '@/types/minigame';
import type { Dictionary } from '@/locales/types';
import { useAuth } from '@/context/AuthContext';
import { saveCustomChallenge } from '@/utils/minigames/storage';
import { exportChallengeToJson } from '@/utils/minigames/jsonExportImport';
import { buildChallengeShareUrl, encodeChallengeShare } from '@/utils/minigames/shareLink';
import { publishOfficialChallenge } from '@/services/minigameApi';
import { RoundEditorCard } from './RoundEditorCard';
import { copyTextWithFallback } from '@/utils/clipboard';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";

interface MinigameCreatorProps {
  catalog: MinigameCatalog;
  locale: string;
}

export const MinigameCreator: React.FC<MinigameCreatorProps> = ({ catalog, locale }) => {
  const dict = useDictionary();
  const t = dict.minigames;
  const c = t.creator;
  const router = useRouter();
  const { user, isAdmin, token } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rounds, setRounds] = useState<RoundConfig[]>([
    {
      round_number: 1,
      mode: 'realm_guesser',
      target_type: 'realm',
      max_attempts: 6,
    },
    {
      round_number: 2,
      mode: 'classic_character',
      target_type: 'killer',
      max_attempts: 6,
    },
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Admin publish state
  const [officialDate, setOfficialDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isPublishingOfficial, setIsPublishingOfficial] = useState(false);

  const handleAddRound = () => {
    const nextNum = rounds.length + 1;
    setRounds([
      ...rounds,
      {
        round_number: nextNum,
        mode: 'classic_character',
        target_type: 'killer',
        max_attempts: 6,
      },
    ]);
  };

  const handleUpdateRound = (idx: number, updated: RoundConfig) => {
    const copy = [...rounds];
    copy[idx] = updated;
    setRounds(copy);
  };

  const handleRemoveRound = (idx: number) => {
    if (rounds.length <= 1) {
      setErrorMsg(c.atLeastOneRoundRequired);
      return;
    }
    const filtered = rounds.filter((_, i) => i !== idx).map((r, i) => ({
      ...r,
      round_number: i + 1,
    }));
    setRounds(filtered);
  };

  const handleMoveRound = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= rounds.length) return;

    const copy = [...rounds];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);

    const renumbered = copy.map((r, i) => ({ ...r, round_number: i + 1 }));
    setRounds(renumbered);
  };

  const validateChallenge = (): ChallengeDefinition | null => {
    setErrorMsg(null);
    if (!title.trim()) {
      setErrorMsg(c.titleRequired);
      return null;
    }
    if (rounds.length === 0) {
      setErrorMsg(c.atLeastOneRoundRequired);
      return null;
    }
    for (let i = 0; i < rounds.length; i++) {
      if (!rounds[i].target_id) {
        setErrorMsg(formatMessage(c.targetRequired, { number: i + 1 }));
        return null;
      }
    }

    return {
      title: title.trim(),
      description: description.trim(),
      game_mode: 'custom',
      rounds,
    };
  };

  const handleSaveToMyTrials = () => {
    const validated = validateChallenge();
    if (!validated) return;

    const saved = saveCustomChallenge(validated);
    setSuccessMsg('Challenge saved to My Trials in your browser!');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleSaveAndPlay = () => {
    const validated = validateChallenge();
    if (!validated) return;

    const saved = saveCustomChallenge(validated);
    router.push(`/${locale}/minigames/play?id=${encodeURIComponent(String(saved.id))}`);
  };

  const handleExportJson = () => {
    const validated = validateChallenge();
    if (!validated) return;

    exportChallengeToJson(validated);
  };

  const handleShareLink = async () => {
    const validated = validateChallenge();
    if (!validated) return;

    setIsSharing(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = buildChallengeShareUrl(origin, await encodeChallengeShare(validated));
      if (!(await copyTextWithFallback(fullUrl))) throw new Error('Failed to copy share link.');
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 4000);

    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate share link.');
    } finally {
      setIsSharing(false);
    }
  };

  const handlePublishOfficial = async () => {
    const validated = validateChallenge();
    if (!validated) return;
    if (!token) {
      setErrorMsg('Admin authentication required.');
      return;
    }

    setIsPublishingOfficial(true);
    try {
      await publishOfficialChallenge(token, {
        ...validated,
        challenge_date: officialDate,
        is_official: true,
      });
      setSuccessMsg(t.adminPublishSuccess);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to publish official challenge.');
    } finally {
      setIsPublishingOfficial(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* Header */}
      <div className="w-full text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
          {c.title}
        </h1>
        <p className="text-sm text-text-secondary mt-2 max-w-lg mx-auto">{c.subtitle}</p>
      </div>

      {/* Validation / Success Notices */}
      {errorMsg && (
        <div className="w-full max-w-2xl mb-6 p-4 rounded-xl bg-accent-red/20 border border-accent-red/40 text-accent-red type-strong flex items-center gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="w-full max-w-2xl mb-6 p-4 rounded-xl bg-accent-green/20 border border-accent-green/40 text-accent-green type-strong flex items-center gap-2 shadow-lg">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Challenge Title & Description Form */}
      <div className="w-full max-w-2xl p-6 rounded-3xl bg-bg-surface border border-border-color shadow-xl mb-6 space-y-4">
        <div>
          <label className="block type-strong text-text-secondary mb-1.5">
            {c.challengeTitleLabel} *
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={c.challengeTitlePlaceholder}
            className="font-semibold"
          />
        </div>

        <div>
          <label className="block type-strong text-text-secondary mb-1.5">
            {c.descriptionLabel}
          </label>
          <Textarea
            rows={2}
            fieldSize="sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={c.descriptionPlaceholder}
          />
        </div>
      </div>

      {/* Challenge Rounds Section */}
      <div className="w-full max-w-2xl mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">{c.roundsHeading}</h2>
          <span className="text-xs text-text-secondary">
            {rounds.length} {rounds.length === 1 ? dict.minigames.roundSingular : dict.minigames.roundPlural}
          </span>
        </div>

        {rounds.map((round, idx) => (
          <RoundEditorCard
            key={`round-card-${idx}`}
            round={round}
            index={idx}
            totalRounds={rounds.length}
            catalog={catalog}
            onUpdate={(updated) => handleUpdateRound(idx, updated)}
            onRemove={() => handleRemoveRound(idx)}
            onMoveUp={() => handleMoveRound(idx, 'up')}
            onMoveDown={() => handleMoveRound(idx, 'down')}
          />
        ))}

        <button
          type="button"
          onClick={handleAddRound}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-border-color hover:border-accent-red/60 text-text-secondary hover:text-text-primary type-card-title flex items-center justify-center gap-2 transition-all group"
        >
          <Plus className="w-4 h-4 group-hover:scale-125 transition-transform text-accent-red" />
          <span>{c.addRound}</span>
        </button>
      </div>

      {/* Action Buttons Row */}
      <div className="w-full max-w-2xl flex flex-wrap gap-3 justify-center mb-8">
        <Button
          variant="secondary"
          size="lg"
          onClick={handleSaveToMyTrials}
        >
          <Save className="w-4 h-4" />
          <span>{c.saveToMyTrials}</span>
        </Button>

        <Button
          variant="success"
          size="lg"
          onClick={handleSaveAndPlay}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{c.saveAndPlay}</span>
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={handleExportJson}
        >
          <Download className="w-4 h-4" />
          <span>{t.exportJson}</span>
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={handleShareLink}
          disabled={isSharing}
        >
          {shareSuccess ? (
            <>
              <Check className="w-4 h-4 text-accent-green" />
              <span className="text-accent-green">{t.linkCopied}</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>{t.shareTrial}</span>
            </>
          )}
        </Button>
      </div>

      {/* Admin Official Publishing Section */}
      {isAdmin && (
        <div className="w-full max-w-2xl p-6 rounded-3xl bg-bg-surface border border-accent-amber/40 shadow-2xl relative">
          <div className="flex items-center gap-2 text-accent-amber type-card-title mb-2">
            <ShieldCheck className="w-5 h-5" />
            <span>{c.publishOfficialModalTitle}</span>
          </div>
          <p className="text-xs text-text-muted mb-4">
            {c.adminNotice}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block type-strong text-text-muted mb-1">
                {c.publishDateLabel}
              </label>
              <Input
                type="date"
                fieldSize="sm"
                value={officialDate}
                onChange={(e) => setOfficialDate(e.target.value)}
                className="font-semibold"
              />
            </div>

            <button
              type="button"
              onClick={handlePublishOfficial}
              disabled={isPublishingOfficial}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-accent-amber hover:bg-accent-amber-hover text-text-inverted type-label-sm shadow-lg shadow-accent-amber/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isPublishingOfficial ? c.publishing : c.confirmPublish}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
