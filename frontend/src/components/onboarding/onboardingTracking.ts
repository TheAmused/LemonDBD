// frontend/src/components/onboarding/onboardingTracking.ts
//
// What the welcome wizard tells Umami (see utils/analytics.ts for the catalogue).
import type { AnalyticsEvents } from '@/utils/analytics';
import { type OnboardingCharacter, isOwnedInDraft } from './CharacterOnboardingWizardParts';

/**
 * The props of `onboarding_complete`: how many characters the visitor marked as owned. Free characters
 * are owned by everyone, so they are left out, otherwise every visitor would start with the same number.
 */
export function buildOnboardingCompleteProps(
  characters: readonly OnboardingCharacter[],
  ownershipDraft: Readonly<Record<string, boolean>>
): AnalyticsEvents['onboarding_complete'] {
  return { characters_owned: characters.filter((c) => !c.is_free && isOwnedInDraft(c, ownershipDraft)).length };
}
