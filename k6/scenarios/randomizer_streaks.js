import { sleep } from 'k6';
import { defaultClient } from '../lib/http_client.js';

function thinkTime(min, max) {
  if (typeof __ENV !== 'undefined' && (__ENV.K6_FAST_TEST === 'true' || __ENV.K6_FAST_TEST === '1')) {
    sleep(0.05);
    return;
  }
  sleep(min + Math.random() * (max - min));
}

export function runScenario(client = defaultClient) {
  const randomizerTags = { type: 'api', scenario: 'randomizer' };
  const streaksTags = { type: 'api', scenario: 'streaks' };

  // 1. Fetch generator active configuration
  client.get('/api/v1/generator/config', { tags: randomizerTags });

  // 2. Query drawn perks for Survivor role
  client.get('/api/v1/generator/drawn?role=Survivor', { tags: randomizerTags });

  // 3. Query drawn perks for Killer role
  client.get('/api/v1/generator/drawn?role=Killer', { tags: randomizerTags });

  // 4. Public streaks & challenge modes governance overview
  client.get('/api/v1/challenge-modes', { tags: streaksTags });

  thinkTime(1.0, 2.0);
}

export const randomizerStreaks = runScenario;
export default function () {
  runScenario();
}
