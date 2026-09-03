import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { getBaseUrl, getTimeout } from '../config/env.js';

export const browseDuration = new Trend('browse_duration', true);
export const searchDuration = new Trend('search_duration', true);
export const voteDuration = new Trend('vote_duration', true);
export const authDuration = new Trend('auth_duration', true);
export const failedRequests = new Counter('failed_requests');

export class ApiClient {
  constructor(baseUrl = getBaseUrl()) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  get(path, params = {}) {
    const url = `${this.baseUrl}${path}`;
    const tags = Object.assign({ type: 'api' }, params.tags || {});
    const headers = Object.assign({ 'Accept': 'application/json' }, params.headers || {});
    const requestParams = Object.assign({}, params, {
      headers: headers,
      tags: tags,
      timeout: params.timeout || getTimeout(),
    });

    const res = http.get(url, requestParams);

    const isOk = check(res, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    if (!isOk) {
      failedRequests.add(1);
    }
    return res;
  }

  post(path, body = {}, params = {}) {
    const url = `${this.baseUrl}${path}`;
    const tags = Object.assign({ type: 'write' }, params.tags || {});
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const headers = Object.assign(
      { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      params.headers || {}
    );
    const requestParams = Object.assign({}, params, {
      headers: headers,
      tags: tags,
      timeout: params.timeout || getTimeout(),
    });

    const res = http.post(url, payload, requestParams);

    const isOk = check(res, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    if (!isOk) {
      failedRequests.add(1);
    }
    return res;
  }

  put(path, body = {}, params = {}) {
    const url = `${this.baseUrl}${path}`;
    const tags = Object.assign({ type: 'write' }, params.tags || {});
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const headers = Object.assign(
      { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      params.headers || {}
    );
    const requestParams = Object.assign({}, params, {
      headers: headers,
      tags: tags,
      timeout: params.timeout || getTimeout(),
    });

    const res = http.put(url, payload, requestParams);

    const isOk = check(res, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    if (!isOk) {
      failedRequests.add(1);
    }
    return res;
  }

  del(path, params = {}) {
    const url = `${this.baseUrl}${path}`;
    const tags = Object.assign({ type: 'write' }, params.tags || {});
    const headers = Object.assign({ 'Accept': 'application/json' }, params.headers || {});
    const payload = params.body ? (typeof params.body === 'string' ? params.body : JSON.stringify(params.body)) : null;
    const requestParams = Object.assign({}, params, {
      headers: headers,
      tags: tags,
      timeout: params.timeout || getTimeout(),
    });

    const res = http.del(url, payload, requestParams);

    const isOk = check(res, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    if (!isOk) {
      failedRequests.add(1);
    }
    return res;
  }
}

export const defaultClient = new ApiClient();
export const apiClient = defaultClient;
export default defaultClient;
