// frontend/src/components/minigames/creator/MinigameCreator.tsx
'use client';

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
import { createSharedLink, publishOfficialChallenge } from '@/services/minigameApi';
import { RoundEditorCard } from './RoundEditorCard';

interface MinigameCreatorProps {
  catalog: MinigameCatalog;
  dict: Dictionary;
  locale: string;
}

export const MinigameCreator: React.FC<MinigameCreatorProps> = ({
  catalog,
  dict,
  locale,
}) => {
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
        setErrorMsg(c.targetRequired.replace('{number}', String(i + 1)));
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
      const res = await createSharedLink(validated);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = res.share_url.startsWith('http') ? res.share_url : `${origin}${res.share_url}`;
      await navigator.clipboard.writeText(fullUrl);
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
        <div className="w-full max-w-2xl mb-6 p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-semibold flex items-center gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="w-full max-w-2xl mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs font-semibold flex items-center gap-2 shadow-lg">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Challenge Title & Description Form */}
      <div className="w-full max-w-2xl p-6 rounded-3xl bg-bg-surface border border-border-color shadow-xl mb-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            {c.challengeTitleLabel} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={c.challengeTitlePlaceholder}
            className="w-full px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-color text-text-primary text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent-red/50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            {c.descriptionLabel}
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={c.descriptionPlaceholder}
            className="w-full px-4 py-2 rounded-xl bg-bg-elevated border border-border-color text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-accent-red/50"
          />
        </div>
      </div>

      {/* Challenge Rounds Section */}
      <div className="w-full max-w-2xl mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">{c.roundsHeading}</h2>
          <span className="text-xs text-text-secondary">
            {rounds.length} {rounds.length === 1 ? 'Round' : 'Rounds'}
          </span>
        </div>

        {rounds.map((round, idx) => (
          <RoundEditorCard
            key={`round-card-${idx}`}
            round={round}
            index={idx}
            totalRounds={rounds.length}
            catalog={catalog}
            dict={dict}
            onUpdate={(updated) => handleUpdateRound(idx, updated)}
            onRemove={() => handleRemoveRound(idx)}
            onMoveUp={() => handleMoveRound(idx, 'up')}
            onMoveDown={() => handleMoveRound(idx, 'down')}
          />
        ))}

        <button
          type="button"
          onClick={handleAddRound}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-accent-red/60 text-zinc-300 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-all group"
        >
          <Plus className="w-4 h-4 group-hover:scale-125 transition-transform text-accent-red" />
          <span>{c.addRound}</span>
        </button>
      </div>

      {/* Action Buttons Row */}
      <div className="w-full max-w-2xl flex flex-wrap gap-3 justify-center mb-8">
        <button
          type="button"
          onClick={handleSaveToMyTrials}
          className="flex items-center gap-2 py-3 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-sm border border-zinc-700 shadow-md transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>{c.saveToMyTrials}</span>
        </button>

        <button
          type="button"
          onClick={handleSaveAndPlay}
          className="flex items-center gap-2 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all active:scale-95"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{c.saveAndPlay}</span>
        </button>

        <button
          type="button"
          onClick={handleExportJson}
          className="flex items-center gap-2 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm border border-zinc-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>{t.exportJson}</span>
        </button>

        <button
          type="button"
          onClick={handleShareLink}
          disabled={isSharing}
          className="flex items-center gap-2 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm border border-zinc-700 transition-colors"
        >
          {shareSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">{t.linkCopied}</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>{t.shareTrial}</span>
            </>
          )}
        </button>
      </div>

      {/* Admin Official Publishing Section */}
      {isAdmin && (
        <div className="w-full max-w-2xl p-6 rounded-3xl bg-zinc-950 border border-amber-600/40 shadow-2xl relative">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
            <ShieldCheck className="w-5 h-5" />
            <span>{c.publishOfficialModalTitle}</span>
          </div>
          <p className="text-xs text-zinc-400 mb-4">
            Only administrators can post official challenges to PostgreSQL that synchronize for all players.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                {c.publishDateLabel}
              </label>
              <input
                type="date"
                value={officialDate}
                onChange={(e) => setOfficialDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <button
              type="button"
              onClick={handlePublishOfficial}
              disabled={isPublishingOfficial}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isPublishingOfficial ? 'Publishing...' : c.confirmPublish}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
