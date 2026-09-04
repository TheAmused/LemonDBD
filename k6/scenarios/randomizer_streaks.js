import { defaultClient, thinkTime } from '../lib/http_client.js';

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
