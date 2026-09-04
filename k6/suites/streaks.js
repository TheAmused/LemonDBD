import { defaultClient, thinkTime } from '../lib/http_client.js';
import { streaksStages } from '../config/stages.js';
import { streaksThresholds } from '../config/thresholds.js';
import { generateHtmlSummary } from '../lib/report_helper.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  stages: streaksStages,
  thresholds: streaksThresholds,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

const ssrHeaders = { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };

export default function () {
  // 1. Streaks & Challenges Main Hub
  defaultClient.get('/streaks', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_hub' } });
  thinkTime(0.2, 0.4);

  // 2. Streaks Challenge Details & Governance
  defaultClient.get('/streaks/challenge', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_challenge' } });
  defaultClient.get('/api/v1/challenge-modes', { tags: { type: 'api', resource: 'challenge_modes' } });
  thinkTime(0.2, 0.4);

  // 3. Killer Chaos Streak
  defaultClient.get('/streaks/killer/chaos-streak', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_chaos' } });
  thinkTime(0.2, 0.4);

  // 4. Killer Gauntlet Streak
  defaultClient.get('/streaks/killer/gauntlet-streak', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_gauntlet_killer' } });
  thinkTime(0.2, 0.4);

  // 5. Killer History Streak
  defaultClient.get('/streaks/killer/history-streak', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_history' } });
  thinkTime(0.2, 0.4);

  // 6. Killer Page Streak Overview & Specific Killer (The Trapper)
  defaultClient.get('/streaks/killer/page-streak', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_page_overview' } });
  thinkTime(0.1, 0.3);
  defaultClient.get('/streaks/killer/page-streak/trapper', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_page_trapper' } });
  thinkTime(0.2, 0.4);

  // 7. Survivor Gauntlet Streak
  defaultClient.get('/streaks/survivor/gauntlet-streak', { headers: ssrHeaders, tags: { type: 'ssr', page: 'streaks_gauntlet_surv' } });
  thinkTime(0.3, 0.6);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6/reports/streaks-report.html': generateHtmlSummary(data, {
      title: 'LemonDBD Streaks & Challenges Performance Report',
    }),
  };
}
