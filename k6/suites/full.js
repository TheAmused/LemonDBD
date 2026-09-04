import {
  defaultClient,
  thinkTime,
  searchDuration,
  voteDuration,
  browseDuration,
  authDuration,
} from '../lib/http_client.js';
import { registerAndLoginUser, getAuthHeaders } from '../lib/auth.js';
import { generateHtmlSummary } from '../lib/report_helper.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { getRandomPerkQuery, getRandomCharacterQuery, getRandomLocale } from '../lib/data_generator.js';

// ====================================================================
// Dynamic VU Allocation Across All 8 Distinct Architectural Workloads
// ====================================================================
const totalVus = parseInt(__ENV.TARGET_VUS || __ENV.VUS_COUNT || '40', 10);
const duration = __ENV.TARGET_DURATION || '1m';

// Split total VUs evenly across all 8 dedicated areas (minimum 1 VU per pool)
const baseShare = Math.max(1, Math.floor(totalVus / 8));
const authVus = parseInt(__ENV.AUTH_VUS || '', 10) || baseShare;
const frontendVus = parseInt(__ENV.FRONTEND_VUS || '', 10) || baseShare;
const writeVus = parseInt(__ENV.WRITE_VUS || '', 10) || baseShare;
const queryVus = parseInt(__ENV.QUERY_VUS || '', 10) || baseShare;
const searchVus = parseInt(__ENV.SEARCH_VUS || '', 10) || baseShare;
const smashVus = parseInt(__ENV.SMASH_VUS || '', 10) || baseShare;
const randomizerVus = parseInt(__ENV.RANDOMIZER_VUS || '', 10) || baseShare;
const catalogVus = parseInt(__ENV.CATALOG_VUS || '', 10) || Math.max(1, totalVus - (authVus + frontendVus + writeVus + queryVus + searchVus + smashVus + randomizerVus));

export const options = {
  scenarios: {
    // 1. User Authentication, Registration & Profile
    auth_users: {
      executor: 'constant-vus',
      vus: authVus,
      duration: duration,
      exec: 'authScenario',
    },
    // 2. Next.js SSR Pages & Nginx Static Asset Delivery
    frontend_browsers: {
      executor: 'constant-vus',
      vus: frontendVus,
      duration: duration,
      exec: 'frontendScenario',
    },
    // 3. High-Concurrency Database Writes & Transactions
    write_bots: {
      executor: 'constant-vus',
      vus: writeVus,
      duration: duration,
      exec: 'writesScenario',
    },
    // 4. Heavy 100-Item Catalog Filtering, Locale & Calculations
    query_scanners: {
      executor: 'constant-vus',
      vus: queryVus,
      duration: duration,
      exec: 'queriesScenario',
    },
    // 5. Keystroke Prefix Search & Suggestions Autocomplete
    search_bots: {
      executor: 'constant-vus',
      vus: searchVus,
      duration: duration,
      exec: 'searchScenario',
    },
    // 6. Interactive Smash or Pass Game & Leaderboard
    smash_or_pass_bots: {
      executor: 'constant-vus',
      vus: smashVus,
      duration: duration,
      exec: 'smashScenario',
    },
    // 7. Perk Randomizer & Challenge Streak Engine
    randomizer_bots: {
      executor: 'constant-vus',
      vus: randomizerVus,
      duration: duration,
      exec: 'randomizerScenario',
    },
    // 8. Deep Catalog & Character Roster Exploration
    catalog_browsers: {
      executor: 'constant-vus',
      vus: catalogVus,
      duration: duration,
      exec: 'catalogScenario',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<400'],
    'http_req_duration{type:ssr}': ['p(95)<350'],
    'http_req_duration{type:static}': ['p(95)<50'],
    'http_req_duration{type:write}': ['p(95)<400'],
    'http_req_duration{type:query}': ['p(95)<300'],
    'auth_duration': ['p(95)<3500'],
    'search_duration': ['p(95)<1500'],
    'browse_duration': ['p(95)<1500'],
    'vote_duration': ['p(95)<1000'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ==========================================
// 1. User Authentication & Profile Worker
// ==========================================
export function authScenario() {
  const vuId = typeof __VU !== 'undefined' ? __VU : 1;
  const iter = typeof __ITER !== 'undefined' ? __ITER : 0;
  const tags = { type: 'api', scenario: 'auth' };

  // Register & Login dynamic user
  const authUser = registerAndLoginUser(vuId, iter, defaultClient);

  // Authenticated profile verification
  if (authUser && authUser.token) {
    defaultClient.get('/api/v1/auth/me', {
      headers: getAuthHeaders(authUser.token),
      tags: tags,
    });
  }

  thinkTime(0.5, 1.5);
}

// ==========================================
// 2. Frontend SSR & Static Browsing Worker
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
  thinkTime(0.3, 0.6);
}

// ==========================================
// 3. High-Concurrency Database Writes Worker
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

  // Voting transaction
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

  // Custom loadout creation
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

  // Read-after-write verification
  defaultClient.get('/api/v1/builds?sort_by=newest', {
    tags: { type: 'read', action: 'verify_builds' },
  });
  defaultClient.get('/api/v1/smash-or-pass/rosters/canon/leaderboard?limit=10', {
    tags: { type: 'read', action: 'verify_leaderboard' },
  });

  thinkTime(0.2, 0.5);
}

// ==========================================
// 4. Heavy Query & Filtering Stress Worker
// ==========================================
export function queriesScenario() {
  // Large 100-perk catalog queries
  defaultClient.get('/api/v1/perks?category=survivor&lang=pl&limit=100', {
    tags: { type: 'query', subtype: 'perks_filter' },
  });
  thinkTime(0.1, 0.3);

  defaultClient.get('/api/v1/perks?category=killer&lang=en&limit=100', {
    tags: { type: 'query', subtype: 'perks_filter' },
  });
  thinkTime(0.1, 0.2);

  // Broad prefix search autocomplete
  defaultClient.get('/api/v1/perks/suggestions?q=a', {
    tags: { type: 'query', subtype: 'autocomplete' },
  });
  defaultClient.get('/api/v1/characters/suggestions?q=t', {
    tags: { type: 'query', subtype: 'autocomplete' },
  });
  thinkTime(0.1, 0.2);

  // Randomizer & challenge calculations
  defaultClient.get('/api/v1/generator/drawn?role=Survivor&perks_count=4', {
    tags: { type: 'query', subtype: 'computation' },
  });
  defaultClient.get('/api/v1/challenge-modes', {
    tags: { type: 'query', subtype: 'computation' },
  });

  thinkTime(0.2, 0.5);
}

// ==========================================
// 5. Keystroke Prefix Search Autocomplete Worker
// ==========================================
export function searchScenario() {
  const startTime = Date.now();
  const tags = { type: 'search', scenario: 'search' };

  const query1 = getRandomPerkQuery() || 'dead';
  defaultClient.get(`/api/v1/perks/suggestions?q=${encodeURIComponent(query1)}`, { tags: tags });
  thinkTime(0.1, 0.3);

  const query2 = `${query1} hard`;
  defaultClient.get(`/api/v1/perks/suggestions?q=${encodeURIComponent(query2)}`, { tags: tags });
  thinkTime(0.1, 0.3);

  const charQuery = getRandomCharacterQuery() || 'hunt';
  defaultClient.get(`/api/v1/characters/suggestions?q=${encodeURIComponent(charQuery)}`, { tags: tags });

  searchDuration.add(Date.now() - startTime);
  thinkTime(0.2, 0.4);
}

// ==========================================
// 6. Interactive Smash or Pass Game Worker
// ==========================================
let smashEntityList = [];

export function smashScenario() {
  const startTime = Date.now();
  const apiTags = { type: 'api', scenario: 'smash_or_pass' };
  const writeTags = { type: 'write', scenario: 'smash_or_pass' };

  if (smashEntityList.length === 0) {
    const feedRes = defaultClient.get('/api/v1/smash-or-pass/rosters/canon/feed', { tags: apiTags });
    if (feedRes && feedRes.status === 200) {
      try {
        const parsed = JSON.parse(feedRes.body);
        const feedData = (parsed && parsed.data) || parsed;
        const entities = (feedData && feedData.entities) || feedData;
        if (Array.isArray(entities) && entities.length > 0) {
          smashEntityList = entities.map((e) => (typeof e === 'string' ? e : e.id)).filter(Boolean);
        }
      } catch (e) {}
    }
  }

  if (smashEntityList.length > 0) {
    const targetId = smashEntityList[Math.floor(Math.random() * smashEntityList.length)];
    const sessionId = `k6_smash_${__VU}_${__ITER}`;
    defaultClient.post(
      '/api/v1/smash-or-pass/vote',
      {
        entity_id: targetId,
        vote_type: Math.random() < 0.5 ? 'smash' : 'pass',
        roster_slug: 'canon',
        session_id: sessionId,
      },
      { tags: writeTags }
    );
  }

  defaultClient.get('/api/v1/smash-or-pass/rosters/canon/leaderboard?limit=20', { tags: apiTags });

  voteDuration.add(Date.now() - startTime);
  thinkTime(0.3, 0.7);
}

// ==========================================
// 7. Perk Randomizer & Challenge Streak Worker
// ==========================================
export function randomizerScenario() {
  const tags = { type: 'api', scenario: 'randomizer' };

  // Survivor 4-perk draw
  defaultClient.get('/api/v1/generator/drawn?role=Survivor&perks_count=4', { tags: tags });
  thinkTime(0.1, 0.3);

  // Killer 4-perk draw
  defaultClient.get('/api/v1/generator/drawn?role=Killer&perks_count=4', { tags: tags });
  thinkTime(0.1, 0.3);

  // Challenge modes list & streaks
  defaultClient.get('/api/v1/challenge-modes', { tags: tags });

  thinkTime(0.2, 0.5);
}

// ==========================================
// 8. Deep Catalog & Character Roster Exploration Worker
// ==========================================
export function catalogScenario() {
  const startTime = Date.now();
  const tags = { type: 'browse', scenario: 'catalog' };
  const locale = getRandomLocale() || 'en';

  defaultClient.get(`/api/v1/perks?page=1&limit=24&lang=${locale}`, { tags: tags });
  thinkTime(0.1, 0.3);

  defaultClient.get('/api/v1/characters?role=survivor', { tags: tags });
  thinkTime(0.1, 0.3);

  defaultClient.get('/api/v1/characters?role=killer', { tags: tags });
  thinkTime(0.1, 0.3);

  defaultClient.get(`/api/v1/perks/sprint-burst?lang=${locale}`, { tags: tags });

  browseDuration.add(Date.now() - startTime);
  thinkTime(0.3, 0.6);
}

// ==========================================
// Fallback Default Function (Runs all 8 workloads in sequence)
// ==========================================
export default function () {
  authScenario();
  frontendScenario();
  writesScenario();
  queriesScenario();
  searchScenario();
  smashScenario();
  randomizerScenario();
  catalogScenario();
}

// ==========================================
// Summary & Reporting
// ==========================================
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6/reports/full-report.html': generateHtmlSummary(data, {
      title: 'LemonDBD All-in-One Comprehensive Performance Report (All 8 Workload Areas)',
    }),
  };
}
