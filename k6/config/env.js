export function getBaseUrl() {
  return (typeof __ENV !== 'undefined' && __ENV.BASE_URL) || 'http://localhost';
}

export function getTimeout() {
  return (typeof __ENV !== 'undefined' && __ENV.K6_TIMEOUT) || '10s';
}

export default {
  getBaseUrl,
  getTimeout,
};
