export const smokeStages = [
  { duration: '5s', target: 2 },
  { duration: '15s', target: 2 },
  { duration: '5s', target: 0 },
];

export const loadStages = [
  { duration: '30s', target: 20 },
  { duration: '1m', target: 40 },
  { duration: '30s', target: 40 },
  { duration: '20s', target: 0 },
];

export const stressStages = [
  { duration: '30s', target: 20 },
  { duration: '1m', target: 60 },
  { duration: '1m', target: 100 },
  { duration: '1m', target: 140 },
  { duration: '30s', target: 0 },
];

export const spikeStages = [
  { duration: '10s', target: 120 },
  { duration: '30s', target: 120 },
  { duration: '20s', target: 10 },
  { duration: '10s', target: 0 },
];

export const soakStages = [
  { duration: '1m', target: 15 },
  { duration: '5m', target: 15 },
  { duration: '30s', target: 0 },
];

export const frontendStages = [
  { duration: '10s', target: 15 },
  { duration: '30s', target: 25 },
  { duration: '10s', target: 0 },
];

export const writesStages = [
  { duration: '10s', target: 10 },
  { duration: '30s', target: 20 },
  { duration: '10s', target: 0 },
];

export const queriesStages = [
  { duration: '10s', target: 15 },
  { duration: '30s', target: 30 },
  { duration: '10s', target: 0 },
];

export const streaksStages = [
  { duration: '10s', target: 15 },
  { duration: '30s', target: 25 },
  { duration: '10s', target: 0 },
];

export const stages = {
  smoke: smokeStages,
  load: loadStages,
  stress: stressStages,
  spike: spikeStages,
  soak: soakStages,
  frontend: frontendStages,
  writes: writesStages,
  queries: queriesStages,
  streaks: streaksStages,
};

export default stages;
