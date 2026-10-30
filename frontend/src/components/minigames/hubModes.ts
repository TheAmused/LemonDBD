import { PerkHexIcon, MaskIcon } from '@/components/icons/DbdIcons';
// frontend/src/components/minigames/hubModes.ts
//
// The fixed game modes the minigames hub offers, as data for FlagshipCard / GuesserCard.
import { Calendar, MapPin, Zap, Volume2, Eye, BookOpen, Plus } from 'lucide-react';
import type { Dictionary } from '@/locales/types';

type MinigamesCopy = Dictionary['minigames'];

/** The daily trial, the idle game and the challenge creator. */
export function flagshipModes(t: MinigamesCopy, locale: string) {
  return [
    {
      tone: 'red', icon: Calendar, badge: t.dailyTrial, title: t.dailyTrial, description: t.dailySubtitle,
      href: `/${locale}/minigames/play?type=daily&mode=fog_trial`, cta: t.playDaily, button: 'primary',
    },
    {
      tone: 'amber', icon: MaskIcon, badge: t.dbdIdleClassic, title: t.dbdIdleClassic, description: t.dbdIdleClassicDesc,
      href: `/${locale}/minigames/idle`, cta: t.playIdle, button: 'amber',
    },
    {
      tone: 'red', icon: Plus, badge: t.creatorBadge, title: t.creatorTitle, description: t.creatorSubtitle,
      href: `/${locale}/minigames/creator`, cta: t.createChallenge, button: 'primary', ctaIcon: Plus,
    },
  ] as const;
}

/** The standalone guessers, each a repeatable round of one mode. */
export function guesserModes(t: MinigamesCopy, locale: string) {
  const play = (mode: string) => `/${locale}/minigames/play?type=repeatable&mode=${mode}`;
  return [
    { tone: 'green', icon: MapPin, title: t.modes.realm_guesser, description: t.modeDescriptions.realm_guesser, href: play('realm'), cta: t.playRealmGuesser, button: 'success' },
    { tone: 'amber', icon: PerkHexIcon, title: t.modes.perk_icon, description: t.modeDescriptions.perk_icon, href: play('perk'), cta: t.playPerkGuesser, button: 'amber' },
    { tone: 'red', icon: Zap, title: t.modes.killer_power, description: t.modeDescriptions.killer_power, href: play('power'), cta: t.playPowerGuesser, button: 'primary' },
    { tone: 'red', icon: Volume2, title: t.modes.terror_radius, description: t.modeDescriptions.terror_radius, href: play('audio'), cta: t.playAudioGuesser, button: 'primary' },
    { tone: 'amber', icon: Eye, title: t.modes.pixel_avatar, description: t.modeDescriptions.pixel_avatar, href: play('pixel'), cta: t.playPixelGuesser, button: 'amber' },
    { tone: 'green', icon: BookOpen, title: t.modes.quote_lore, description: t.modeDescriptions.quote_lore, href: play('quote'), cta: t.playLoreGuesser, button: 'success' },
  ] as const;
}
