import { defaultClient, thinkTime } from '../lib/http_client.js';
import { queriesStages } from '../config/stages.js';
import { queriesThresholds } from '../config/thresholds.js';
import { generateHtmlSummary } from '../lib/report_helper.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  stages: queriesStages,
  thresholds: queriesThresholds,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  // 1. Large catalog filtered query:
  defaultClient.get('/api/v1/perks?category=survivor&lang=pl&limit=100', {
    tags: { type: 'query', subtype: 'perks_filter' },
  });

  // 2. Think time:
  thinkTime(0.1, 0.3);

  // 3. Cross-category large catalog query:
  defaultClient.get('/api/v1/perks?category=killer&lang=en&limit=100', {
    tags: { type: 'query', subtype: 'perks_filter' },
  });

  // 4. Think time:
  thinkTime(0.1, 0.2);

  // 5. Broad prefix search autocomplete (scans perk and character indexes):
  defaultClient.get('/api/v1/perks/suggestions?q=a', {
    tags: { type: 'query', subtype: 'autocomplete' },
  });
  defaultClient.get('/api/v1/characters/suggestions?q=t', {
    tags: { type: 'query', subtype: 'autocomplete' },
  });

  // 6. Think time:
  thinkTime(0.1, 0.2);

  // 7. Randomizer / computation query:
  defaultClient.get('/api/v1/generator/drawn?role=Survivor&perks_count=4', {
    tags: { type: 'query', subtype: 'computation' },
  });
  defaultClient.get('/api/v1/challenge-modes', {
    tags: { type: 'query', subtype: 'computation' },
  });

  // 8. Think time:
  thinkTime(0.2, 0.4);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6/reports/queries-report.html': generateHtmlSummary(data, {
      title: 'LemonDBD Heavy Queries & Filtering Performance Report',
    }),
  };
}
