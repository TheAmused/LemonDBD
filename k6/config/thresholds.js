export const smokeThresholds = {
  http_req_failed: ['rate==0'],
  http_req_duration: ['p(95)<400'],
  'http_req_duration{type:api}': ['p(95)<300'],
  'checks': ['rate>0.99'],
};

export const loadThresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<350', 'p(99)<700'],
  'http_req_duration{type:api}': ['p(95)<300'],
  'http_req_duration{type:search}': ['p(95)<150'],
  'http_req_duration{type:write}': ['p(95)<400'],
};

export const stressThresholds = {
  http_req_failed: ['rate<0.05'],
  http_req_duration: ['p(95)<1000', 'p(99)<2000'],
};

export const spikeThresholds = {
  http_req_failed: ['rate<0.03'],
  http_req_duration: ['p(95)<800'],
};

export const soakThresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<350'],
};

export const thresholds = {
  smoke: smokeThresholds,
  load: loadThresholds,
  stress: stressThresholds,
  spike: spikeThresholds,
  soak: soakThresholds,
};

export default thresholds;