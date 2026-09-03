import { runScenario as browsePerks } from './browse_perks.js';
import { runScenario as searchAutocomplete } from './search_autocomplete.js';
import { runScenario as smashOrPass } from './smash_or_pass.js';
import { runScenario as randomizerStreaks } from './randomizer_streaks.js';
import { runScenario as authProfile } from './auth_profile.js';

export { runScenario as browsePerks, default as defaultBrowse } from './browse_perks.js';
export { runScenario as searchAutocomplete, default as defaultSearch } from './search_autocomplete.js';
export { runScenario as smashOrPass, default as defaultSmash } from './smash_or_pass.js';
export { runScenario as randomizerStreaks, default as defaultRandomizer } from './randomizer_streaks.js';
export { runScenario as authProfile, default as defaultAuth } from './auth_profile.js';

export function defaultTrafficMix() {
  const roll = Math.random();
  if (roll < 0.40) {
    browsePerks();
  } else if (roll < 0.65) {
    searchAutocomplete();
  } else if (roll < 0.85) {
    smashOrPass();
  } else if (roll < 0.95) {
    randomizerStreaks();
  } else {
    authProfile();
  }
}
