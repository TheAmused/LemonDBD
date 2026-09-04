import { check } from 'k6';
import { getBaseUrl, getTimeout } from '../config/env.js';
import {
  smokeThresholds,
  loadThresholds,
  stressThresholds,
  spikeThresholds,
  soakThresholds,
  frontendThresholds,
  writesThresholds,
  queriesThresholds,
  thresholds,
} from '../config/thresholds.js';
import {
  smokeStages,
  loadStages,
  stressStages,
  spikeStages,
  soakStages,
  frontendStages,
  writesStages,
  queriesStages,
  stages,
} from '../config/stages.js';
import { ApiClient, defaultClient, browseDuration, searchDuration, voteDuration, authDuration, failedRequests } from './http_client.js';
import { registerAndLoginUser, getAuthHeaders, authHelper } from './auth.js';
import { dataGenerator, PERK_SEARCH_QUERIES, CHARACTER_SEARCH_QUERIES, LOCALES, getRandomPerkQuery, getRandomCharacterQuery, getRandomLocale } from './data_generator.js';
import { generateHtmlSummary } from './report_helper.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
    http_req_failed: ['rate==0'],
  },
};

export function testSanity() {
  // 1. Verify env.js
  check(null, {
    'env: getBaseUrl() returns string': () => typeof getBaseUrl() === 'string' && getBaseUrl().length > 0,
    'env: getTimeout() returns string': () => typeof getTimeout() === 'string' && getTimeout().length > 0,
  });

  // 2. Verify thresholds.js
  check(null, {
    'thresholds: smoke thresholds exist': () => Array.isArray(smokeThresholds.http_req_failed),
    'thresholds: load thresholds exist': () => Array.isArray(loadThresholds.http_req_failed),
    'thresholds: stress thresholds exist': () => Array.isArray(stressThresholds.http_req_failed),
    'thresholds: spike thresholds exist': () => Array.isArray(spikeThresholds.http_req_failed),
    'thresholds: soak thresholds exist': () => Array.isArray(soakThresholds.http_req_failed),
    'thresholds: frontend thresholds exist and have expected structure': () =>
      Array.isArray(frontendThresholds.http_req_failed) &&
      frontendThresholds.http_req_failed[0] === 'rate<0.01' &&
      Array.isArray(frontendThresholds.http_req_duration) &&
      frontendThresholds.http_req_duration[0] === 'p(95)<350' &&
      Array.isArray(frontendThresholds['http_req_duration{type:ssr}']) &&
      frontendThresholds['http_req_duration{type:ssr}'][0] === 'p(95)<350' &&
      Array.isArray(frontendThresholds['http_req_duration{type:static}']) &&
      frontendThresholds['http_req_duration{type:static}'][0] === 'p(95)<50',
    'thresholds: writes thresholds exist and have expected structure': () =>
      Array.isArray(writesThresholds.http_req_failed) &&
      writesThresholds.http_req_failed[0] === 'rate<0.01' &&
      Array.isArray(writesThresholds['http_req_duration{type:write}']) &&
      writesThresholds['http_req_duration{type:write}'][0] === 'p(95)<400',
    'thresholds: queries thresholds exist and have expected structure': () =>
      Array.isArray(queriesThresholds.http_req_failed) &&
      queriesThresholds.http_req_failed[0] === 'rate<0.005' &&
      Array.isArray(queriesThresholds.http_req_duration) &&
      queriesThresholds.http_req_duration[0] === 'p(95)<300' &&
      Array.isArray(queriesThresholds['http_req_duration{type:query}']) &&
      queriesThresholds['http_req_duration{type:query}'][0] === 'p(95)<300',
    'thresholds: unified object has all keys': () =>
      ['smoke', 'load', 'stress', 'spike', 'soak', 'frontend', 'writes', 'queries'].every((k) => k in thresholds),
  });

  // 3. Verify stages.js
  check(null, {
    'stages: smoke stages exist': () => Array.isArray(smokeStages) && smokeStages.length > 0,
    'stages: load stages exist': () => Array.isArray(loadStages) && loadStages.length > 0,
    'stages: stress stages exist': () => Array.isArray(stressStages) && stressStages.length > 0,
    'stages: spike stages exist': () => Array.isArray(spikeStages) && spikeStages.length > 0,
    'stages: soak stages exist': () => Array.isArray(soakStages) && soakStages.length > 0,
    'stages: frontend stages exist and have expected structure': () =>
      Array.isArray(frontendStages) &&
      frontendStages.length === 3 &&
      frontendStages[0].target === 15 && frontendStages[0].duration === '10s' &&
      frontendStages[1].target === 25 && frontendStages[1].duration === '30s' &&
      frontendStages[2].target === 0 && frontendStages[2].duration === '10s',
    'stages: writes stages exist and have expected structure': () =>
      Array.isArray(writesStages) &&
      writesStages.length === 3 &&
      writesStages[0].target === 10 && writesStages[0].duration === '10s' &&
      writesStages[1].target === 20 && writesStages[1].duration === '30s' &&
      writesStages[2].target === 0 && writesStages[2].duration === '10s',
    'stages: queries stages exist and have expected structure': () =>
      Array.isArray(queriesStages) &&
      queriesStages.length === 3 &&
      queriesStages[0].target === 15 && queriesStages[0].duration === '10s' &&
      queriesStages[1].target === 30 && queriesStages[1].duration === '30s' &&
      queriesStages[2].target === 0 && queriesStages[2].duration === '10s',
    'stages: unified object has all keys': () =>
      ['smoke', 'load', 'stress', 'spike', 'soak', 'frontend', 'writes', 'queries'].every((k) => k in stages),
  });

  // 4. Verify http_client.js
  check(null, {
    'http_client: ApiClient class is defined': () => typeof ApiClient === 'function',
    'http_client: defaultClient is ApiClient instance': () => defaultClient instanceof ApiClient,
    'http_client: defaultClient has get and post methods': () =>
      typeof defaultClient.get === 'function' && typeof defaultClient.post === 'function',
    'http_client: custom metrics are exported': () =>
      browseDuration !== undefined &&
      searchDuration !== undefined &&
      voteDuration !== undefined &&
      authDuration !== undefined &&
      failedRequests !== undefined,
  });

  // 5. Verify auth.js exports & helpers
  const sampleHeaders = getAuthHeaders('test-token-123');
  const emptyHeaders = getAuthHeaders(null);
  check(null, {
    'auth: registerAndLoginUser is function': () => typeof registerAndLoginUser === 'function',
    'auth: getAuthHeaders adds Bearer token': () => sampleHeaders['Authorization'] === 'Bearer test-token-123',
    'auth: getAuthHeaders returns empty object when null': () => Object.keys(emptyHeaders).length === 0,
    'auth: authHelper contains registerAndLoginUser and getAuthHeaders': () =>
      typeof authHelper.registerAndLoginUser === 'function' && typeof authHelper.getAuthHeaders === 'function',
  });

  // 6. Verify data_generator.js
  check(null, {
    'data_generator: PERK_SEARCH_QUERIES is non-empty array': () =>
      Array.isArray(PERK_SEARCH_QUERIES) && PERK_SEARCH_QUERIES.length > 0,
    'data_generator: CHARACTER_SEARCH_QUERIES is non-empty array': () =>
      Array.isArray(CHARACTER_SEARCH_QUERIES) && CHARACTER_SEARCH_QUERIES.length > 0,
    'data_generator: LOCALES is non-empty array': () =>
      Array.isArray(LOCALES) && LOCALES.length > 0,
    'data_generator: getRandomPerkQuery returns query': () =>
      typeof getRandomPerkQuery() === 'string' && PERK_SEARCH_QUERIES.includes(getRandomPerkQuery()),
    'data_generator: getRandomCharacterQuery returns character': () =>
      typeof getRandomCharacterQuery() === 'string' && CHARACTER_SEARCH_QUERIES.includes(getRandomCharacterQuery()),
    'data_generator: getRandomLocale returns locale': () =>
      typeof getRandomLocale() === 'string' && LOCALES.includes(getRandomLocale()),
    'data_generator: dataGenerator object export is valid': () =>
      typeof dataGenerator.getRandomPerkQuery === 'function',
  });

  // 7. Verify report_helper.js
  const mockSummary = generateHtmlSummary({
    state: { testRunDurationMs: 15400 },
    metrics: {
      http_req_duration: {
        values: { 'p(95)': 12.34, 'p(99)': 23.45, avg: 10.5, med: 9.8, min: 2.1, max: 45.0 },
        thresholds: { 'p(95)<400': { ok: true } },
      },
      'http_req_duration{type:write}': {
        values: { 'p(95)': 15.2, 'p(99)': 20.1, avg: 11.2, med: 10.5, max: 25.0 },
        thresholds: { 'p(95)<400': { ok: true } },
      },
      http_req_failed: {
        values: { rate: 0.0, fails: 0, passes: 42 },
        thresholds: { 'rate<0.01': { ok: true } },
      },
      http_reqs: { values: { count: 42, rate: 4.2 } },
      vus_max: { values: { value: 5 } },
      data_received: { values: { count: 50000 } },
      data_sent: { values: { count: 12000 } },
    },
  });
  check(null, {
    'report_helper: generateHtmlSummary returns HTML': () =>
      typeof mockSummary === 'string' &&
      mockSummary.includes('<!DOCTYPE html>') &&
      mockSummary.includes('&#127819;'),
    'report_helper: includes executive status and KPI metrics': () =>
      mockSummary.includes('PASSED') &&
      mockSummary.includes('Total Requests') &&
      mockSummary.includes('Max Concurrency'),
    'report_helper: includes SLA threshold checklist and SVG chart': () =>
      mockSummary.includes('SLA Threshold Compliance Checklist') &&
      mockSummary.includes('<svg') &&
      mockSummary.includes('Architectural Workload Breakdown'),
  });

  // 8. Test live backend endpoint with path normalization check (without leading slash)
  const healthRes = defaultClient.get('api/v1/health');
  check(healthRes, {
    'health check: status is 200': (r) => r.status === 200,
    'health check: response body is valid JSON': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.status === 'healthy' && body.service === 'dbd-backend-api';
      } catch (e) {
        return false;
      }
    },
  });

  // 9. Test live registration and login against stack
  const authUser = registerAndLoginUser(__VU, __ITER);
  check(authUser, {
    'auth: live registerAndLoginUser returns valid token': (u) =>
      u && typeof u.token === 'string' && u.token.length > 20,
    'auth: live registerAndLoginUser returns valid credentials': (u) =>
      u && typeof u.username === 'string' && u.email && u.email.endsWith('@example.com'),
  });
}

export default testSanity;
