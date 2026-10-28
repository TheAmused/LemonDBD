// frontend/src/components/generator/lib/tarotCards.ts
//
// Which Tarot card a perk type is dealt as: its name in the locale and the art
// files under public/images/tarot. Totems and Killer healing have a card per side.
import type { RoleCategory } from '@/types/perks';
import type { TarotType } from './perkPicker';

/** The card named in the locale, by type -- except that Killer healing is dealt
 * as The Tormentor, the Killer-side counterpart of The Caregiver. */
export type TarotCardName = TarotType | 'tormentor';

export const DEFAULT_TYPE_NAMES: Record<TarotCardName, string> = {
  generator: 'The Machinist',
  healing: 'The Caregiver',
  chase: 'The Chase',
  stealth: 'The Shadow',
  tracking: 'The Watcher',
  exhaustion: 'The Exhaustion',
  sacrifice: 'The Sacrifice',
  obsession: 'The Obsession',
  totem: 'The Totems',
  hooks: 'The Hanged Man',
  downed: 'The Fallen',
  items: 'The Scavenger',
  endgame: 'The Escape',
  entity: 'The Entity',
  tormentor: 'The Tormentor',
};

/** The on-disk card-back filenames (public/images/tarot/the-*.webp) follow
 * each type's *display* name, not its internal TarotType key -- most line
 * up (sacrifice/exhaustion/obsession/chase/entity), but the rest don't:
 * 'tracking' ships as the-watcher.webp, 'generator' as the-machinist.webp,
 * 'healing' as the-caregiver.webp, 'stealth' as the-shadow.webp, 'hooks' as
 * the-hanged-man.webp, 'downed' as the-fallen.webp, 'items' as
 * the-scavenger.webp and 'endgame' as the-escape.webp. Using the raw type key
 * directly 404'd those and silently fell back to the solid-gradient
 * placeholder. Totems and Killer healing have a card per side, see
 * `tarotCard`. */
const TAROT_IMAGE_SLUG: Record<Exclude<TarotType, 'totem'>, string> = {
  generator: 'machinist',
  healing: 'caregiver',
  chase: 'chase',
  stealth: 'shadow',
  tracking: 'watcher',
  exhaustion: 'exhaustion',
  sacrifice: 'sacrifice',
  obsession: 'obsession',
  hooks: 'hanged-man',
  downed: 'fallen',
  items: 'scavenger',
  endgame: 'escape',
  entity: 'entity',
};

/** The card a perk type is dealt as on one side: its locale name key and its art slug. */
export const tarotCard = (type: TarotType, role: RoleCategory): { name: TarotCardName; slug: string } => {
  if (type === 'healing' && role === 'Killer') return { name: 'tormentor', slug: 'tormentor' };
  if (type === 'totem') return { name: 'totem', slug: role === 'Killer' ? 'totems-killer' : 'totems-survivor' };
  return { name: type, slug: TAROT_IMAGE_SLUG[type] };
};

/** Static card art lives under /images/ so the browser caches it
 * cache-first and next.config.ts serves it with long-lived headers. Faces are
 * produced by scripts/generate_tarot_card_faces.py from the art above. */
const TAROT_IMAGE_BASE = '/images/tarot';
const TAROT_FACE_DIR = 'faces';

export type TarotSide = 'back' | 'face';

export const tarotImageUrl = (slug: string, side: TarotSide): string =>
  `${TAROT_IMAGE_BASE}/${side === 'face' ? `${TAROT_FACE_DIR}/` : ''}the-${slug}.webp`;
