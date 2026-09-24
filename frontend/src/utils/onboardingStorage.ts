// frontend/src/utils/onboardingStorage.ts

export interface OnboardingStoredDraft {
  ownershipDraft: Record<string, boolean>;
  perkUnlockDraft: Record<number, boolean>;
  updatedAt: number;
}

export function getOnboardingStorageKey(userId?: string | number | null): string {
  if (userId !== undefined && userId !== null && String(userId).trim().length > 0) {
    return `lemondbd_onboarding_draft_${userId}`;
  }
  return 'lemondbd_onboarding_draft_guest';
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return null;
}

export function loadOnboardingDraft(userId?: string | number | null): OnboardingStoredDraft | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(getOnboardingStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      ownershipDraft: parsed.ownershipDraft && typeof parsed.ownershipDraft === 'object' ? parsed.ownershipDraft : {},
      perkUnlockDraft: parsed.perkUnlockDraft && typeof parsed.perkUnlockDraft === 'object' ? parsed.perkUnlockDraft : {},
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveOnboardingDraft(
  userId: string | number | undefined | null,
  draft: {
    ownershipDraft: Record<string, boolean>;
    perkUnlockDraft: Record<number, boolean>;
  }
): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const payload: OnboardingStoredDraft = {
      ownershipDraft: draft.ownershipDraft,
      perkUnlockDraft: draft.perkUnlockDraft,
      updatedAt: Date.now(),
    };
    storage.setItem(getOnboardingStorageKey(userId), JSON.stringify(payload));
  } catch {
    // Graceful fallback for restricted storage or quota exceeded
  }
}

export function clearOnboardingDraft(userId?: string | number | null): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(getOnboardingStorageKey(userId));
  } catch {
    // Graceful fallback
  }
}
