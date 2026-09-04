import { defaultClient, thinkTime } from '../lib/http_client.js';
import { registerAndLoginUser, getAuthHeaders } from '../lib/auth.js';
import { defaultTrafficMix } from '../scenarios/index.js';
import { generateHtmlSummary } from '../lib/report_helper.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// Dynamic VU allocation & duration configuration
// Use TARGET_VUS / TARGET_DURATION to avoid collision with k6 internal K6_VUS
const totalVus = parseInt(__ENV.TARGET_VUS || __ENV.VUS_COUNT || '40', 10);
const duration = __ENV.TARGET_DURATION || '1m';

const baseShare = Math.max(1, Math.floor(totalVus / 4));
const frontendVus = parseInt(__ENV.FRONTEND_VUS || '', 10) || baseShare;
const writeVus = parseInt(__ENV.WRITE_VUS || '', 10) || baseShare;
const queryVus = parseInt(__ENV.QUERY_VUS || '', 10) || baseShare;
const journeyVus = parseInt(__ENV.JOURNEY_VUS || '', 10) || Math.max(1, totalVus - (frontendVus + writeVus + queryVus));

export const options = {
  scenarios: {
    frontend_browsers: {
      executor: 'constant-vus',
      vus: frontendVus,
      duration: duration,
      exec: 'frontendScenario',
    },
    write_bots: {
      executor: 'constant-vus',
      vus: writeVus,
      duration: duration,
      exec: 'writesScenario',
    },
    query_scanners: {
      executor: 'constant-vus',
      vus: queryVus,
      duration: duration,
      exec: 'queriesScenario',
    },
    journey_users: {
      executor: 'constant-vus',
      vus: journeyVus,
      duration: duration,
      exec: 'journeysScenario',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<400'],
    'http_req_duration{type:ssr}': ['p(95)<350'],
    'http_req_duration{type:static}': ['p(95)<50'],
    'http_req_duration{type:write}': ['p(95)<400'],
    'http_req_duration{type:query}': ['p(95)<300'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ==========================================
// 1. Frontend SSR & Static Browsing Worker
// ==========================================
const ssrHeaders = { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };

export function frontendScenario() {
  defaultClient.get('/', { headers: ssrHeaders, tags: { type: 'ssr', page: 'home' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/perks', { headers: ssrHeaders, tags: { type: 'ssr', page: 'perks' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/characters', { headers: ssrHeaders, tags: { type: 'ssr', page: 'characters' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/randomizer', { headers: ssrHeaders, tags: { type: 'ssr', page: 'generator' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/smash-or-pass', { headers: ssrHeaders, tags: { type: 'ssr', page: 'smash_or_pass' } });
  defaultClient.get('/favicon.ico', { tags: { type: 'static', asset: 'favicon' } });
  thinkTime(0.4, 0.8);
}

// ==========================================
// 2. High-Concurrency Database Writes Worker
// ==========================================
let writeAuthToken = null;
let entityList = [];

function fetchEntities() {
  const feedRes = defaultClient.get('/api/v1/smash-or-pass/rosters/canon/feed');
  if (feedRes && feedRes.status === 200) {
    try {
      const parsed = JSON.parse(feedRes.body);
      const feedData = (parsed && parsed.data) || parsed;
      const entities = (feedData && feedData.entities) || feedData;
      if (Array.isArray(entities) && entities.length > 0) {
        return entities.map((e) => (typeof e === 'string' ? e : e.id)).filter(Boolean);
      }
    } catch (e) {}
  }
  return [];
}

export function writesScenario() {
  if (!writeAuthToken) {
    const creds = registerAndLoginUser(__VU, __ITER, defaultClient);
    if (creds && creds.token) {
      writeAuthToken = creds.token;
    }
  }

  if (entityList.length === 0) {
    entityList = fetchEntities();
  }

  // 1. Voting transaction
  if (entityList.length > 0) {
    const randomIdx = Math.floor(Math.random() * entityList.length);
    const entityId = entityList[randomIdx];
    const voteType = Math.random() < 0.5 ? 'smash' : 'pass';
    const sessionId = `k6_full_write_${__VU}_${__ITER}`;

    defaultClient.post(
      '/api/v1/smash-or-pass/vote',
      {
        entity_id: entityId,
        vote_type: voteType,
        roster_slug: 'canon',
        session_id: sessionId,
      },
      {
        headers: getAuthHeaders(writeAuthToken),
        tags: { type: 'write', action: 'vote' },
      }
    );
  }

  thinkTime(0.1, 0.3);

  // 2. Custom loadout creation
  const buildPayload = {
    title: `Full Benchmark Loadout ${Date.now()}_${__VU}`,
    description: 'All-in-One automated benchmark build',
    role: 'Survivor',
    category: 'meta',
    character_id: 'all',
    perks: ['Sprint Burst', 'Adrenaline', 'Kindred', 'Decisive Strike'],
    author: `VU_${__VU}`,
  };

  defaultClient.post('/api/v1/builds', buildPayload, {
    headers: getAuthHeaders(writeAuthToken),
    tags: { type: 'write', action: 'build' },
  });

  // 3. Read-after-write verification
  defaultClient.get('/api/v1/builds?sort_by=newest', {
    tags: { type: 'read', action: 'verify_builds' },
  });
  defaultClient.get('/api/v1/smash-or-pass/rosters/canon/leaderboard?limit=10', {
    tags: { type: 'read', action: 'verify_leaderboard' },
  });

  thinkTime(0.3, 0.6);
}

// ==========================================
// 3. Heavy Query & Filtering Stress Worker
// ==========================================
export function queriesScenario() {
  // 1. Large 100-perk catalog queries
  defaultClient.get('/api/v1/perks?category=survivor&lang=pl&limit=100', {
    tags: { type: 'query', subtype: 'perks_filter' },
  });
  thinkTime(0.1, 0.3);

  defaultClient.get('/api/v1/perks?category=killer&lang=en&limit=100', {
    tags: { type: 'query', subtype: 'perks_filter' },
  });
  thinkTime(0.1, 0.2);

  // 2. Broad prefix search autocomplete
  defaultClient.get('/api/v1/perks/suggestions?q=a', {
    tags: { type: 'query', subtype: 'autocomplete' },
  });
  defaultClient.get('/api/v1/characters/suggestions?q=t', {
    tags: { type: 'query', subtype: 'autocomplete' },
  });
  thinkTime(0.1, 0.2);

  // 3. Randomizer & challenge calculations
  defaultClient.get('/api/v1/generator/drawn?role=Survivor&perks_count=4', {
    tags: { type: 'query', subtype: 'computation' },
  });
  defaultClient.get('/api/v1/challenge-modes', {
    tags: { type: 'query', subtype: 'computation' },
  });

  thinkTime(0.3, 0.6);
}

// ==========================================
// 4. End-to-End User Journey Worker
// ==========================================
let journeyAuthToken = null;

export function journeysScenario() {
  if (!journeyAuthToken) {
    const creds = registerAndLoginUser(__VU + 1000, __ITER, defaultClient);
    if (creds && creds.token) {
      journeyAuthToken = creds.token;
    }
  }

  defaultTrafficMix(defaultClient, journeyAuthToken);
}

// ==========================================
// Fallback Default Function (Runs all workloads)
// ==========================================
export default function () {
  frontendScenario();
  writesScenario();
  queriesScenario();
  journeysScenario();
}

// ==========================================
// Summary & Reporting
// ==========================================
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6/reports/full-report.html': generateHtmlSummary(data, {
      title: 'LemonDBD All-in-One Comprehensive Performance Report',
    }),
  };
}
