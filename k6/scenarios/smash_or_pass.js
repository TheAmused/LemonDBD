import { sleep } from 'k6';
import { defaultClient, voteDuration } from '../lib/http_client.js';

function thinkTime(min, max) {
  if (typeof __ENV !== 'undefined' && (__ENV.K6_FAST_TEST === 'true' || __ENV.K6_FAST_TEST === '1')) {
    sleep(0.05);
    return;
  }
  sleep(min + Math.random() * (max - min));
}

export function runScenario(client = defaultClient) {
  const startTime = Date.now();
  const apiTags = { type: 'api', scenario: 'smash_or_pass' };
  const writeTags = { type: 'write', scenario: 'smash_or_pass' };

  // 1. Retrieve voting candidate feed for canon roster
  const feedRes = client.get('/api/v1/smash-or-pass/rosters/canon/feed', { tags: apiTags });

  let targetEntityId = null;
  if (feedRes && feedRes.status === 200) {
    try {
      const parsed = typeof feedRes.body === 'string' ? JSON.parse(feedRes.body) : feedRes.body;
      const feedData = parsed.data || parsed;
      const entities = feedData.entities || (Array.isArray(feedData) ? feedData : []);
      if (entities.length > 0) {
        targetEntityId = entities[0].id;
      }
    } catch (e) {
      targetEntityId = null;
    }
  }

  // 2. Cast interactive vote if candidate is present
  if (targetEntityId) {
    client.post('/api/v1/smash-or-pass/vote', {
      entity_id: targetEntityId,
      vote_type: 'smash',
      roster_slug: 'canon',
    }, { tags: writeTags });
  }

  // 3. Check updated ranked leaderboard
  client.get('/api/v1/smash-or-pass/rosters/canon/leaderboard?limit=20', { tags: apiTags });

  voteDuration.add(Date.now() - startTime);
  thinkTime(1.0, 2.5);
}

export const smashOrPass = runScenario;
export default function () {
  runScenario();
}
