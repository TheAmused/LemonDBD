export const smokeThresholds = {
  http_req_failed: ['rate==0'],
  http_req_duration: ['p(95)<400'],
  'http_req_duration{type:api}': ['p(95)<300', 'p(99)<600'],
  'checks': ['rate>0.99'],
};

export const loadThresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<350'],
  'http_req_duration{type:api}': ['p(95)<300', 'p(99)<600'],
  'http_req_duration{type:search}': ['p(95)<200'],
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

export const frontendThresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<350'],
  'http_req_duration{type:ssr}': ['p(95)<350'],
  'http_req_duration{type:static}': ['p(95)<50'],
};

export const writesThresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<400'],
  'http_req_duration{type:write}': ['p(95)<400'],
};

export const queriesThresholds = {
  http_req_failed: ['rate<0.005'],
  http_req_duration: ['p(95)<300'],
  'http_req_duration{type:query}': ['p(95)<300'],
};

export const thresholds = {
  smoke: smokeThresholds,
  load: loadThresholds,
  stress: stressThresholds,
  spike: spikeThresholds,
  soak: soakThresholds,
  frontend: frontendThresholds,
  writes: writesThresholds,
  queries: queriesThresholds,
};

export default thresholds;
