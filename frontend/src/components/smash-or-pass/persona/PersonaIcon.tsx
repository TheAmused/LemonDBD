// frontend/src/components/smash-or-pass/persona/PersonaIcon.tsx
import {
  CampfireIcon,
  EntityHeartIcon,
  EntityMarkIcon,
  FogDriftIcon,
  RedStainIcon,
  SkillCheckGaugeIcon,
  VeiledCompassIcon,
} from '@/components/icons/DbdIcons';
import type { RomancePersonaResult } from '@/utils/smashPersona';

/** The mark on a persona's badge: its own picture if it has one, else the icon its archetype names. */
export function PersonaIcon({ persona }: { persona: RomancePersonaResult }) {
  if (persona.iconUrl) {
    return <img src={persona.iconUrl} alt={persona.title} className="h-6 w-6 object-contain rounded" />;
  }
  switch (persona.iconName) {
    case 'compass':
      return <VeiledCompassIcon className="h-6 w-6 text-text-inverted animate-spin-slow" />;
    case 'skull':
      return <EntityMarkIcon className="h-6 w-6 text-text-inverted" />;
    case 'flame':
      return <RedStainIcon className="h-6 w-6 text-text-inverted" />;
    case 'shield':
      return <CampfireIcon className="h-6 w-6 text-text-inverted" />;
    case 'heart':
      return <EntityHeartIcon className="h-6 w-6 text-text-inverted fill-text-inverted" />;
    case 'zap':
      return <SkillCheckGaugeIcon className="h-6 w-6 text-text-inverted" />;
    case 'sparkles':
    default:
      return <FogDriftIcon className="h-6 w-6 text-text-inverted" />;
  }
}
