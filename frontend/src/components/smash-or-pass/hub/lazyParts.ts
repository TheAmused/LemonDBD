// frontend/src/components/smash-or-pass/hub/lazyParts.ts
//
// The heavy visual layers and interactive modals, loaded client-side only and on demand so none
// of them weighs on the Hub's first paint.
import dynamic from 'next/dynamic';

export const SmashAnimations = dynamic(
  () => import('../SmashAnimations').then((m) => m.SmashAnimations),
  { ssr: false }
);

export const InteractiveDragBackground = dynamic(
  () => import('../InteractiveDragBackground').then((m) => m.InteractiveDragBackground),
  { ssr: false }
);

export const FloatingLoreScattered = dynamic(
  () => import('../FloatingLoreScattered').then((m) => m.FloatingLoreScattered),
  { ssr: false }
);

export const TactileKeycaps = dynamic(
  () => import('../TactileKeycaps').then((m) => m.TactileKeycaps),
  { ssr: false }
);

export const SmashLeaderboardModal = dynamic(
  () => import('../SmashLeaderboardModal').then((m) => m.SmashLeaderboardModal),
  { ssr: false }
);

export const CharacterStatsModal = dynamic(
  () => import('../CharacterStatsModal').then((m) => m.CharacterStatsModal),
  { ssr: false }
);

export const RomancePersonaModal = dynamic(
  () => import('../RomancePersonaModal').then((m) => m.RomancePersonaModal),
  { ssr: false }
);

export const RosterSelectModal = dynamic(
  () => import('../RosterSelectModal').then((m) => m.RosterSelectModal),
  { ssr: false }
);

export const SmashRosterImportModal = dynamic(
  () => import('../SmashRosterImportModal').then((m) => m.SmashRosterImportModal),
  { ssr: false }
);

export const SmashRosterExportModal = dynamic(
  () => import('../SmashRosterExportModal').then((m) => m.SmashRosterExportModal),
  { ssr: false }
);
