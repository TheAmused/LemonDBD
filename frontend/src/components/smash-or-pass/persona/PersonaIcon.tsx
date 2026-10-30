// frontend/src/components/smash-or-pass/persona/PersonaIcon.tsx
import {
  CampfireIcon,
  EntityMarkIcon,
  FogDriftIcon,
  HeartbeatIcon,
  SkillCheckGaugeIcon,
  VeiledCompassIcon,
  HeartIcon,
} from '@/components/icons/DbdIcons';
import type { RomancePersonaResult } from '@/utils/smashPersona';
import { Img } from '@/components/common/Img';

/** The mark on a persona's badge: its own picture if it has one, else the icon its archetype names. */
export function PersonaIcon({ persona }: { persona: RomancePersonaResult }) {
  if (persona.iconUrl) {
    return <Img src={persona.iconUrl} alt={persona.title} className="h-6 w-6 object-contain rounded-chip" />;
  }
  switch (persona.iconName) {
    case 'compass':
      return <VeiledCompassIcon className="icon-xl text-text-inverted animate-spin-slow" />;
    case 'skull':
      return <EntityMarkIcon className="icon-xl text-text-inverted" />;
    case 'flame':
      return <HeartbeatIcon className="icon-xl text-text-inverted" />;
    case 'shield':
      return <CampfireIcon className="icon-xl text-text-inverted" />;
    case 'heart':
      return <HeartIcon className="icon-xl text-text-inverted fill-text-inverted" />;
    case 'zap':
      return <SkillCheckGaugeIcon className="icon-xl text-text-inverted" />;
    case 'sparkles':
    default:
      return <FogDriftIcon className="icon-xl text-text-inverted" />;
  }
}
