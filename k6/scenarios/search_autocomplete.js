import { sleep } from 'k6';
import { defaultClient, searchDuration } from '../lib/http_client.js';
import { getRandomPerkQuery, getRandomCharacterQuery } from '../lib/data_generator.js';

function thinkTime(min, max) {
  if (typeof __ENV !== 'undefined' && (__ENV.K6_FAST_TEST === 'true' || __ENV.K6_FAST_TEST === '1')) {
    sleep(0.05);
    return;
  }
  sleep(min + Math.random() * (max - min));
}

export function runScenario(client = defaultClient) {
  const startTime = Date.now();
  const tags = { type: 'search', scenario: 'search' };

  // 1. Keystroke query 1: suggestions for initial perk search prefix
  const query1 = getRandomPerkQuery() || 'dead';
  client.get(`/api/v1/perks/suggestions?q=${encodeURIComponent(query1)}`, { tags: tags });
  thinkTime(0.3, 0.7);

  // 2. Keystroke query 2: suggestions for refined multi-word perk search
  const query2 = `${query1} hard`;
  client.get(`/api/v1/perks/suggestions?q=${encodeURIComponent(query2)}`, { tags: tags });
  thinkTime(0.3, 0.7);

  // 3. Keystroke query 3: character suggestion lookup
  const charQuery = getRandomCharacterQuery() || 'hunt';
  client.get(`/api/v1/characters/suggestions?q=${encodeURIComponent(charQuery)}`, { tags: tags });

  searchDuration.add(Date.now() - startTime);
  thinkTime(0.3, 0.7);
}

export const searchAutocomplete = runScenario;
export default function () {
  runScenario();
}
