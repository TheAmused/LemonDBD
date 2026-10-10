// frontend/src/components/onboarding/wizard/useOnboardingCompletion.ts
import { useState } from 'react';
import { ownershipKey } from '@/utils/characterUtils';
import { useAuth } from '@/context/AuthContext';
import { invalidate } from '@/services/dataCache';
import { clearOnboardingDraft } from '@/utils/onboardingStorage';
import {
  type OnboardingCharacter,
  type OnboardingPerk,
  isDefaultUnlockedPerk,
} from '../CharacterOnboardingWizardParts';

interface OnboardingCompletionInput {
  backendBase: string;
  characters: OnboardingCharacter[];
  allPerks: OnboardingPerk[];
  ownershipDraft: Record<string, boolean>;
  perkUnlockDraft: Record<number, boolean>;
  onFinished: () => void;
}

/** Saving the drafts (Continue) or leaving them unsaved (Skip), then handing control back. */
export function useOnboardingCompletion({
  backendBase,
  characters,
  allPerks,
  ownershipDraft,
  perkUnlockDraft,
  onFinished,
}: OnboardingCompletionInput) {
  const { user, bulkUpdateCharacterOwnership, bulkUpdatePerkOwnership, markOnboardingComplete } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      const characterUpdates = characters.map((c) => ({
        character_id: c.id,
        role: c.category,
        is_owned: c.is_free ? true : (ownershipDraft[ownershipKey(c.id, c.category)] ?? c.is_owned),
      }));
      const perkUpdates = allPerks.map((p) => ({
        perk_id: p.perk_id,
        is_unlocked: isDefaultUnlockedPerk(p, characters)
          ? true
          : (perkUnlockDraft[p.perk_id] ?? p.is_unlocked),
      }));
      await bulkUpdateCharacterOwnership(characterUpdates);
      await bulkUpdatePerkOwnership(perkUpdates);
      invalidate(`${backendBase}/api/v1/perks`);
      invalidate(`${backendBase}/api/v1/characters`);
      await markOnboardingComplete();
      clearOnboardingDraft(user?.id);
      setSaving(false);
      onFinished();
    } catch {
      setSaving(false);
    }
  };

  const handleSkipConfirm = async () => {
    setSaving(true);
    try {
      await markOnboardingComplete();
      clearOnboardingDraft(user?.id);
    } finally {
      setSaving(false);
      onFinished();
    }
  };

  return { saving, handleContinue, handleSkipConfirm };
}
