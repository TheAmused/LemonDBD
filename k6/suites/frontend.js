import { defaultClient, thinkTime } from '../lib/http_client.js';
import { frontendStages } from '../config/stages.js';
import { frontendThresholds } from '../config/thresholds.js';
import { generateHtmlSummary } from '../lib/report_helper.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  stages: frontendStages,
  thresholds: frontendThresholds,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

const ssrHeaders = { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };

export default function () {
  defaultClient.get('/', { headers: ssrHeaders, tags: { type: 'ssr', page: 'home' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/perks', { headers: ssrHeaders, tags: { type: 'ssr', page: 'perks' } });
  thinkTime(0.2, 0.5);
  defaultClient.get('/characters', { headers: ssrHeaders, tags: { type: 'ssr', page: 'characters' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/randomizer', { headers: ssrHeaders, tags: { type: 'ssr', page: 'generator' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/smash-or-pass', { headers: ssrHeaders, tags: { type: 'ssr', page: 'smash_or_pass' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/streaks', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_hub' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/streaks/challenge', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_challenge' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/streaks/killer/chaos-streak', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_chaos' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/streaks/killer/gauntlet-streak', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_gauntlet_killer' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/streaks/killer/history-streak', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_history' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/streaks/killer/page-streak', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_page_killer' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/streaks/killer/page-streak/trapper', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_page_trapper' } });
  thinkTime(0.2, 0.4);
  defaultClient.get('/streaks/survivor/gauntlet-streak', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_gauntlet_surv' } });
  defaultClient.get('/favicon.ico', { tags: { type: 'static', asset: 'favicon' } });
  thinkTime(0.5, 1.0);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6/reports/frontend-report.html': generateHtmlSummary(data, {
      title: 'LemonDBD Frontend SSR & Static Delivery Report',
    }),
  };
}
