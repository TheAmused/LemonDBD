import {
  browsePerks,
  searchAutocomplete,
  smashOrPass,
  randomizerStreaks,
  authProfile,
} from '../scenarios/index.js';
import { spikeThresholds } from '../config/thresholds.js';
import { spikeStages } from '../config/stages.js';
import { generateHtmlSummary } from '../lib/report_helper.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  stages: spikeStages,
  thresholds: spikeThresholds,
};

export default function () {
  const roll = Math.random();
  if (roll < 0.40) {
    browsePerks();
  } else if (roll < 0.65) {
    searchAutocomplete();
  } else if (roll < 0.85) {
    smashOrPass();
  } else if (roll < 0.95) {
    randomizerStreaks();
  } else {
    authProfile();
  }
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6/reports/spike-report.html': generateHtmlSummary(data, {
      title: 'LemonDBD Spike Performance Report',
    }),
  };
}