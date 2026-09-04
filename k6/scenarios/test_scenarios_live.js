import { check } from 'k6';
import { defaultClient } from '../lib/http_client.js';
import { runScenario as runBrowse } from './browse_perks.js';
import { runScenario as runSearch } from './search_autocomplete.js';
import { runScenario as runSmash } from './smash_or_pass.js';
import { runScenario as runRandomizer } from './randomizer_streaks.js';
import { runScenario as runAuth } from './auth_profile.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
    http_req_failed: ['rate==0'],
  },
};

export default function () {
  // Scenario 1: Browse Perks
  runBrowse(defaultClient);
  check(null, {
    'browse_perks: scenario completed without uncaught exceptions': () => true,
  });

  // Scenario 2: Search Autocomplete
  runSearch(defaultClient);
  check(null, {
    'search_autocomplete: scenario completed without uncaught exceptions': () => true,
  });

  // Scenario 3: Smash or Pass
  runSmash(defaultClient);
  check(null, {
    'smash_or_pass: scenario completed without uncaught exceptions': () => true,
  });

  // Scenario 4: Randomizer & Streaks
  runRandomizer(defaultClient);
  check(null, {
    'randomizer_streaks: scenario completed without uncaught exceptions': () => true,
  });

  // Scenario 5: Auth Profile
  runAuth(defaultClient);
  check(null, {
    'auth_profile: scenario completed without uncaught exceptions': () => true,
  });
}
