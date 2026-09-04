import { defaultTrafficMix } from '../scenarios/index.js';
import { spikeThresholds } from '../config/thresholds.js';
import { spikeStages } from '../config/stages.js';
import { generateHtmlSummary } from '../lib/report_helper.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  stages: spikeStages,
  thresholds: spikeThresholds,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  defaultTrafficMix();
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6/reports/spike-report.html': generateHtmlSummary(data, {
      title: 'LemonDBD Spike Performance Report',
    }),
  };
}
