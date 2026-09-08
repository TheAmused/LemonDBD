// frontend/src/components/generator/shared/useJackpotCelebration.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { playFanfare } from '@/utils/perkAudio';
import { triggerDbdBurst } from '../lib/dbdBurst';
import { Dictionary } from '@/locales/types';
import { RoleCategory } from '@/types/perks';

export const DEFAULT_SURVIVOR_JACKPOT_LINES: readonly string[] = [
  'The Entity approves. The Killer is already typing a thesis in endgame chat.',
  'With this build, maybe Meg will actually touch a generator instead of sprinting into a wall!',
  'Somewhere in the basement, Bubba just shed a single tear of joy.',
  'The Killer is hovering over Alt+F4 as we speak.',
  'Perfect for solo queue - you\'re still dying on first hook while Claudette self-cares in a corner.',
  'Ready for a 5-gen chase (or getting downed in 8 seconds flat at shack).',
  'The Entity is pleased. The Killer is actively questioning every life decision.',
  'Rank 1 gaming incoming - prepare the post-game salt shaker!',
  'Full meta or full meme? The Fog doesn\'t care, go pre-drop every pallet on the map!',
  'Deliverance primed! Which guarantees you are getting hooked first in the basement.',
  'Dead Hard directly into a solid tree trunk. Flawless execution, champ.',
  'Plot Twist into the killer\'s terror radius. Pure cinematic genius.',
  'Head On ready! Just wait in the locker for 3 gens while your teammates perish.',
  'Flashbang dropped, killer unaffected, entire survivor squad permanently blinded.',
  'Urban Evading around Midwich like a stealth navy seal while someone dies on hook.',
  'Teammate threw down the shack pallet at 5 gens. A true Dead by Daylight classic.',
  'Just leave! Oh wait, you\'re teabagging at the exit gate and Blood Warden just activated.',
  'Locker flashlight save attempted... Leon is now proudly displayed on the hook.',
  'Unhooked right in front of the camper with no Borrowed Time. Teamwork makes the dream work!',
  'Dramaturgy gave you exposed effect and an empty brown toolbox. Masterpiece.',
  'Object of Obsession gamer realizing the Killer has Lethal Pursuer and is sprinting at you.',
  'No Mither equipped: Entering the trial like an absolute gigachad.',
  'Brought a brand new part, hit the skill check, and the gen got kicked with Pop immediately.',
  'Ace in the Hole gave you a broken key with a prayer bead. Pure profit.',
  'Resilience gamer sitting at 99% injured all match just to get sniped by a cross-map hatchet.',
];

export const DEFAULT_KILLER_JACKPOT_LINES: readonly string[] = [
  'The Entity is pleased. 4K incoming, basement hooks are freshly polished.',
  'Bring on the flashlight clickers. They\'re not making it past the front gate.',
  'Someone is getting dragged to the basement before the first generator even hums.',
  'The Entity hungers, and you\'re about to serve up a four-course feast.',
  'Post-game chat salt incoming. Grab your popcorn and enjoy the show.',
  'Time to turn that 4-man SWF bully squad into a lobby of panicked screams.',
  'No Hatch for anyone. The Entity demands all four sacrifices.',
  'Hex: Ruin cleansed in 7 seconds flat. A brand new personal record!',
  'Hooked, camped, sacrificed. Just another lovely Tuesday in the Fog.',
  'Four flashlights and map offerings in the lobby? Time to equip Lightborn and smile.',
  'Camping basement Bubba is not just a build, it is a spiritual lifestyle.',
  'Blight pinballing at Mach 5 directly into a brick wall. Calculated.',
  'Nurse blinked under the basement floor and is currently contemplating existence.',
  'Tombstone Myers standing motionless in Tier 1... just staring menacingly.',
  'Hex: Devour Hope cleansed before you even got your first token. Typical.',
  'Wesker bound thrown directly into a tree while the survivor slid away like butter.',
  'Nemesis zombie got stuck on a shrub again, but at least it\'s emotional support.',
  'Spooky Ghostface stalk broken by a survivor hiding three zip codes away.',
  'Trapper stepped in his own bear trap in the shack doorway. Peak competitive gaming.',
  'Doctor shock therapy spammed until the server itself reaches Madness Tier 3.',
  'Starstruck active: watch the entire team drop their flashlights and scramble.',
  'Blood Warden triggered at 99% exit gates! Nobody leaves, everybody screams.',
  'Franklins Demise equipped: watching four purple flashlights bounce into the dirt.',
  'Mad Grit backpack build: carrying Dwight on your shoulder across the whole map while swinging.',
  'Endgame chat preview: \'-rep tunneling camping garbage killer\'. Music to your ears.',
];

export const DEFAULT_JACKPOT_LINES: readonly string[] = DEFAULT_SURVIVOR_JACKPOT_LINES;

export function getJackpotCelebrationLines(
  dict?: Dictionary,
  role?: RoleCategory
): readonly string[] {
  if (role === 'Killer') {
    const killerLines = dict?.generator?.jackpotLinesKiller;
    return killerLines && killerLines.length > 0
      ? killerLines
      : DEFAULT_KILLER_JACKPOT_LINES;
  }
  const survivorLines = dict?.generator?.jackpotLines;
  return survivorLines && survivorLines.length > 0
    ? survivorLines
    : DEFAULT_SURVIVOR_JACKPOT_LINES;
}

export function useJackpotCelebration(dict?: Dictionary) {
  const [flavorLine, setFlavorLine] = useState<string | null>(null);

  const clearFlavorLine = useCallback(() => {
    setFlavorLine(null);
  }, []);

  /**
   * `originEl` should be the actual on-screen element the result appeared
   * in (a results-grid wrapper, the wheel canvas, etc.) so the particle
   * burst is anchored to where the win really is instead of a fixed
   * viewport-relative point. Falls back to the viewport center if omitted.
   */
  const celebrate = useCallback(
    (role: RoleCategory, originEl?: HTMLElement | null) => {
      const lines = getJackpotCelebrationLines(dict, role);
      const line = lines[Math.floor(Math.random() * lines.length)];
      setFlavorLine(line);

      playFanfare();

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!prefersReducedMotion) {
        triggerDbdBurst(originEl ?? null, role);
      }
    },
    [dict]
  );

  return { flavorLine, celebrate, clearFlavorLine };
}
