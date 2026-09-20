// frontend/src/components/icons/DbdIcons.tsx
//
// Pure barrel file. Every DBD-themed custom icon replacing a generic
// lucide-react icon now lives in its own file under ./dbd/, one component
// per file, all matching lucide's own SVG contract (24x24 viewBox,
// currentColor stroke, strokeWidth 2, round caps/joins,
// React.SVGProps<SVGSVGElement> passthrough). This file just re-exports
// every one of them so every existing
// `import { X } from '@/components/icons/DbdIcons'` across the app keeps
// working unchanged -- only ./dbd/* needs touching to add, remove, or
// redesign an icon.

export type { DbdIconProps } from './dbd/types';

export { KillerIcon } from './dbd/KillerIcon';
export { SurvivorIcon } from './dbd/SurvivorIcon';
export { TierEasyIcon } from './dbd/TierEasyIcon';
export { TierMediumIcon } from './dbd/TierMediumIcon';
export { TierHellIcon } from './dbd/TierHellIcon';
export { MoriCharmIcon } from './dbd/MoriCharmIcon';
export { WardCharmIcon } from './dbd/WardCharmIcon';
export { FriendzoneIcon } from './dbd/FriendzoneIcon';
export { EldritchVoidIcon } from './dbd/EldritchVoidIcon';
export { AdeptBadgeIcon } from './dbd/AdeptBadgeIcon';
export { PerkHexIcon } from './dbd/PerkHexIcon';
export { BloodwebIcon } from './dbd/BloodwebIcon';
export { RiftPortalIcon } from './dbd/RiftPortalIcon';
export { RealmMapIcon } from './dbd/RealmMapIcon';
export { MaskIcon } from './dbd/MaskIcon';
export { GauntletGloveIcon } from './dbd/GauntletGloveIcon';
export { ChaosSwirlIcon } from './dbd/ChaosSwirlIcon';
export { VeiledCompassIcon } from './dbd/VeiledCompassIcon';
export { EntityMarkIcon } from './dbd/EntityMarkIcon';
export { RedStainIcon } from './dbd/RedStainIcon';
export { CampfireIcon } from './dbd/CampfireIcon';
export { EntityHeartIcon } from './dbd/EntityHeartIcon';
export { SkillCheckGaugeIcon } from './dbd/SkillCheckGaugeIcon';
export { FogDriftIcon } from './dbd/FogDriftIcon';
export { IridescentShardIcon } from './dbd/IridescentShardIcon';
export { CampfireMugIcon } from './dbd/CampfireMugIcon';
export { FogReportIcon } from './dbd/FogReportIcon';
export { OverseerEyeIcon } from './dbd/OverseerEyeIcon';
export { AuricCellIcon } from './dbd/AuricCellIcon';
export { FullRosterLaurelIcon } from './dbd/FullRosterLaurelIcon';
export { RankFirstIcon } from './dbd/RankFirstIcon';
export { RankPlacedIcon } from './dbd/RankPlacedIcon';
