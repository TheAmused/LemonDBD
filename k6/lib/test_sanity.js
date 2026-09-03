import { check } from 'k6';
import { getBaseUrl, getTimeout } from '../config/env.js';
import { smokeThresholds, loadThresholds, stressThresholds, spikeThresholds, soakThresholds, thresholds } from '../config/thresholds.js';
import { smokeStages, loadStages, stressStages, spikeStages, soakStages, stages } from '../config/stages.js';
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

export default function () {
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
    'thresholds: unified object has all keys': () =>
      ['smoke', 'load', 'stress', 'spike', 'soak'].every((k) => k in thresholds),
  });

  // 3. Verify stages.js
  check(null, {
    'stages: smoke stages exist': () => Array.isArray(smokeStages) && smokeStages.length > 0,
    'stages: load stages exist': () => Array.isArray(loadStages) && loadStages.length > 0,
    'stages: stress stages exist': () => Array.isArray(stressStages) && stressStages.length > 0,
    'stages: spike stages exist': () => Array.isArray(spikeStages) && spikeStages.length > 0,
    'stages: soak stages exist': () => Array.isArray(soakStages) && soakStages.length > 0,
    'stages: unified object has all keys': () =>
      ['smoke', 'load', 'stress', 'spike', 'soak'].every((k) => k in stages),
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

  // 5. Verify auth.js
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
    metrics: {
      http_req_duration: { values: { 'p(95)': 12.34, 'p(99)': 23.45, avg: 10.5 } },
      http_req_failed: { values: { rate: 0.0 } },
      http_reqs: { values: { count: 42 } },
      vus_max: { values: { value: 5 } },
    },
  });
  check(null, {
    'report_helper: generateHtmlSummary returns HTML': () =>
      typeof mockSummary === 'string' &&
      mockSummary.includes('<!DOCTYPE html>') &&
      mockSummary.includes('🍋'),
  });

  // 8. Test live backend endpoint via defaultClient.get('/api/v1/health')
  const res = defaultClient.get('/api/v1/health');
  check(res, {
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
}
