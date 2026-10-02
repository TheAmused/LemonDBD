// frontend/src/components/streaks/lazyChallengeParts.ts
import dynamic from 'next/dynamic';

/** Client-only pieces every challenge board loads lazily, declared once. */
export const Confetti = dynamic(() => import('./Confetti').then((m) => m.Confetti), { ssr: false });
export const ResetConfirmModal = dynamic(
  () => import('./ResetConfirmModal').then((m) => m.ResetConfirmModal),
  { ssr: false }
);
export const ChallengeCompletionHistoryDrawer = dynamic(
  () => import('./ChallengeCompletionHistoryDrawer').then((m) => m.ChallengeCompletionHistoryDrawer),
  { ssr: false }
);
export const CheckpointCelebrationModal = dynamic(
  () => import('./CheckpointCelebrationModal').then((m) => m.CheckpointCelebrationModal),
  { ssr: false }
);
