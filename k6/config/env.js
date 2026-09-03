export function getBaseUrl() {
  return (__ENV && __ENV.BASE_URL) || 'http://localhost';
}

export function getTimeout() {
  return (__ENV && __ENV.K6_TIMEOUT) || '10s';
}

export default {
  getBaseUrl,
  getTimeout,
};