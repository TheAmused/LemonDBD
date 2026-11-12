'use client';
// frontend/src/components/onboarding/wizard/useOnboardingCompletion.ts
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { catalogKey, invalidate } from '@/services/dataCache';
import { clearOnboardingDraft } from '@/utils/onboardingStorage';
import { trackEvent } from '@/utils/analytics';
import { buildOnboardingCompleteProps } from '../onboardingTracking';
import {
  type OnboardingCharacter,
  type OnboardingPerk,
  isDefaultUnlockedPerk,
  isOwnedInDraft,
} from '../CharacterOnboardingWizardParts';

interface OnboardingCompletionInput {
  characters: OnboardingCharacter[];
  allPerks: OnboardingPerk[];
  ownershipDraft: Record<string, boolean>;
  perkUnlockDraft: Record<number, boolean>;
  onFinished: () => void;
}

/** Saving the drafts (Continue), then handing control back. */
export function useOnboardingCompletion({
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
        is_owned: c.is_free ? true : isOwnedInDraft(c, ownershipDraft),
      }));
      const perkUpdates = allPerks.map((p) => ({
        perk_id: p.perk_id,
        is_unlocked: isDefaultUnlockedPerk(p, characters)
          ? true
          : (perkUnlockDraft[p.perk_id] ?? p.is_unlocked),
      }));
      await bulkUpdateCharacterOwnership(characterUpdates);
      await bulkUpdatePerkOwnership(perkUpdates);
      invalidate(catalogKey('perks'));
      invalidate(catalogKey('characters'));
      await markOnboardingComplete();
      trackEvent('onboarding_complete', buildOnboardingCompleteProps(characters, ownershipDraft));
      clearOnboardingDraft(user?.id);
      setSaving(false);
      onFinished();
    } catch {
      setSaving(false);
    }
  };

  return { saving, handleContinue };
}
