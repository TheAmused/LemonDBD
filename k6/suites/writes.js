import { defaultClient, thinkTime } from '../lib/http_client.js';
import { writesStages } from '../config/stages.js';
import { writesThresholds } from '../config/thresholds.js';
import { registerAndLoginUser, getAuthHeaders } from '../lib/auth.js';
import { generateHtmlSummary } from '../lib/report_helper.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  stages: writesStages,
  thresholds: writesThresholds,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

let authToken = null;
let entityList = [];

function fetchEntities() {
  const feedRes = defaultClient.get('/api/v1/smash-or-pass/rosters/canon/feed');
  if (feedRes && feedRes.status === 200) {
    try {
      const parsed = typeof feedRes.body === 'string' ? JSON.parse(feedRes.body) : feedRes.body;
      const feedData = parsed.data || parsed;
      const entities = feedData.entities || (Array.isArray(feedData) ? feedData : []);
      return entities
        .map((e) => (typeof e === 'object' && e !== null ? e.id : e))
        .filter((id) => id !== undefined && id !== null);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export default function () {
  // Setup / VU auth
  if (!authToken) {
    const authResult = registerAndLoginUser(__VU, __ITER, defaultClient);
    if (authResult && authResult.token) {
      authToken = authResult.token;
    }
    entityList = fetchEntities();
  }

  // Ensure entity feed recovery if empty
  if (entityList.length === 0) {
    entityList = fetchEntities();
  }

  // 1. Voting write:
  if (entityList.length > 0) {
    const entityId = entityList[Math.floor(Math.random() * entityList.length)];
    const voteType = Math.random() < 0.5 ? 'smash' : 'pass';

    defaultClient.post(
      '/api/v1/smash-or-pass/vote',
      {
        entity_id: entityId,
        vote_type: voteType,
        roster_slug: 'canon',
        session_id: `k6_vu_${__VU}_${__ITER}`,
      },
      {
        headers: getAuthHeaders(authToken),
        tags: { type: 'write', action: 'vote' },
      }
    );
  }

  // 2. Think time:
  thinkTime(0.1, 0.3);

  // 3. Custom Build write:
  defaultClient.post(
    '/api/v1/builds',
    {
      title: 'Perf Loadout ' + Date.now(),
      description: 'High concurrency write test loadout',
      role: 'Survivor',
      category: 'meta',
      character_id: 'all',
      perks: ['Sprint Burst', 'Adrenaline'],
      author: 'VU_' + __VU,
    },
    {
      headers: getAuthHeaders(authToken),
      tags: { type: 'write', action: 'build' },
    }
  );

  // 4. Read-after-write verification:
  defaultClient.get('/api/v1/builds?sort_by=newest', {
    tags: { type: 'read', action: 'verify_builds' },
  });
  defaultClient.get('/api/v1/smash-or-pass/rosters/canon/leaderboard?limit=10', {
    tags: { type: 'read', action: 'verify_leaderboard' },
  });

  // 5. Think time:
  thinkTime(0.2, 0.5);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6/reports/writes-report.html': generateHtmlSummary(data, {
      title: 'LemonDBD High-Concurrency Writes Performance Report',
    }),
  };
}
