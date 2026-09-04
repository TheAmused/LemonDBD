import {
  browsePerks,
  searchAutocomplete,
  smashOrPass,
  randomizerStreaks,
  authProfile,
} from '../scenarios/index.js';
import { smokeThresholds } from '../config/thresholds.js';
import { smokeStages } from '../config/stages.js';
import { generateHtmlSummary } from '../lib/report_helper.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  stages: smokeStages,
  thresholds: smokeThresholds,
};

let authTested = false;

const scenarios = [
  browsePerks,
  searchAutocomplete,
  smashOrPass,
  randomizerStreaks,
];

export default function () {
  if (__VU === 1 && !authTested) {
    authTested = true;
    authProfile();
    return;
  }

  const scenario = scenarios[__ITER % scenarios.length];
  scenario();
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6/reports/smoke-report.html': generateHtmlSummary(data, {
      title: 'LemonDBD Smoke Performance Report',
    }),
  };
}