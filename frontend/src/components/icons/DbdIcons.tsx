// frontend/src/components/icons/DbdIcons.tsx
//
// Pure barrel file, and the ONE entry point for every custom icon. Icons live in
// directories beside it, one component per file:
//   ./dbd/    the DBD-themed set replacing generic lucide icons
//   ./smash/  the Smash or Pass set (lore blocks, card, hub header)
//   ./brand/  third-party logos
// Every DBD-themed custom icon replacing a generic
// lucide-react icon lives in its own file under ./dbd/, one component
// per file, all matching lucide's own SVG contract (24x24 viewBox,
// currentColor stroke, strokeWidth 2, round caps/joins,
// React.SVGProps<SVGSVGElement> passthrough). This file just re-exports
// every one of them so every existing
// `import { X } from '@/components/icons/DbdIcons'` across the app keeps
// working unchanged -- only the icon files need touching to add, remove, or
// redesign an icon.

export type { DbdIconProps } from './dbd/types';
export { IconSvg } from './IconSvg';

export { MoriCharmIcon } from './dbd/MoriCharmIcon';
export { WardCharmIcon } from './dbd/WardCharmIcon';
export { FriendzoneIcon } from './dbd/FriendzoneIcon';
export { EldritchVoidIcon } from './dbd/EldritchVoidIcon';
export { PerkHexIcon } from './dbd/PerkHexIcon';
export { TrophyIcon } from './dbd/TrophyIcon';
export { DiceIcon } from './dbd/DiceIcon';
export { TargetIcon } from './dbd/TargetIcon';
export { MapIcon } from './dbd/MapIcon';
export { MaskIcon } from './dbd/MaskIcon';
export { ClapperboardIcon } from './dbd/ClapperboardIcon';
export { WheelIcon } from './dbd/WheelIcon';
export { EntityMarkIcon } from './dbd/EntityMarkIcon';
export { FogDriftIcon } from './dbd/FogDriftIcon';
export { HeartbeatIcon } from './dbd/HeartbeatIcon';
export { CampfireIcon } from './dbd/CampfireIcon';
export { SkillCheckGaugeIcon } from './dbd/SkillCheckGaugeIcon';
export { VeiledCompassIcon } from './dbd/VeiledCompassIcon';
export { CrownIcon } from './dbd/CrownIcon';
export { FogReportIcon } from './dbd/FogReportIcon';
export { CampfireMugIcon } from './dbd/CampfireMugIcon';
export { FullRosterLaurelIcon } from './dbd/FullRosterLaurelIcon';
export { RankFirstIcon } from './dbd/RankFirstIcon';
export { RankPlacedIcon } from './dbd/RankPlacedIcon';

// Smash or Pass
export { HeartIcon } from './smash/HeartIcon';
export { PassIcon } from './smash/PassIcon';
export { CardStackIcon } from './smash/CardStackIcon';

// Generic UI icons
export { PersonIcon } from './ui/PersonIcon';
export { MedkitIcon } from './ui/MedkitIcon';
export { GridIcon } from './ui/GridIcon';
export { WarningIcon } from './ui/WarningIcon';
export { MatureIcon } from './ui/MatureIcon';
export { GlobeIcon } from './ui/GlobeIcon';
export { InfoIcon } from './ui/InfoIcon';
export { MusicIcon } from './ui/MusicIcon';
export { VolumeIcon } from './ui/VolumeIcon';
export { UploadIcon } from './ui/UploadIcon';
export { ChevronIcon } from './ui/ChevronIcon';
export { CheckIcon } from './ui/CheckIcon';
export { LockIcon } from './ui/LockIcon';
export { SparkleIcon } from './ui/SparkleIcon';
export { CardFlipIcon } from './ui/CardFlipIcon';
export { MinusIcon } from './ui/MinusIcon';
export { PlusIcon } from './ui/PlusIcon';
export { FitIcon } from './ui/FitIcon';
export { ImageIcon } from './ui/ImageIcon';
export { TrashIcon } from './ui/TrashIcon';

// Brand logos
export { DiscordIcon } from './brand/DiscordIcon';
export { BuyMeACoffeeIcon } from './brand/BuyMeACoffeeIcon';
export { KofiIcon } from './brand/KofiIcon';
