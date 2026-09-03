import { sleep } from 'k6';
﻿import http from 'k6/http';
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

  _checkResponse(res, params = {}) {
    if (params.skipStatusCheck) {
      return true;
    }
    const checkName = params.expectedStatus !== undefined ? `status is ${params.expectedStatus}` : 'status is 2xx';
    const isOk = check(res, {
      [checkName]: (r) =>
        params.expectedStatus !== undefined
          ? r.status === params.expectedStatus
          : r.status >= 200 && r.status < 300,
    });
    if (!isOk) {
      failedRequests.add(1);
    }
    return isOk;
  }

  get(path, params = {}) {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const url = `${this.baseUrl}${cleanPath}`;
    const tags = Object.assign({ type: 'api' }, params.tags || {});
    const headers = Object.assign({ 'Accept': 'application/json' }, params.headers || {});
    const requestParams = Object.assign({}, params, {
      headers: headers,
      tags: tags,
      timeout: params.timeout || getTimeout(),
    });

    const res = http.get(url, requestParams);
    this._checkResponse(res, params);
    return res;
  }

  post(path, body = {}, params = {}) {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const url = `${this.baseUrl}${cleanPath}`;
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
    this._checkResponse(res, params);
    return res;
  }

  put(path, body = {}, params = {}) {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const url = `${this.baseUrl}${cleanPath}`;
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
    this._checkResponse(res, params);
    return res;
  }

  del(path, params = {}) {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const url = `${this.baseUrl}${cleanPath}`;
    const tags = Object.assign({ type: 'write' }, params.tags || {});
    const headers = Object.assign({ 'Accept': 'application/json' }, params.headers || {});
    const payload = params.body ? (typeof params.body === 'string' ? params.body : JSON.stringify(params.body)) : null;
    const requestParams = Object.assign({}, params, {
      headers: headers,
      tags: tags,
      timeout: params.timeout || getTimeout(),
    });

    const res = http.del(url, payload, requestParams);
    this._checkResponse(res, params);
    return res;
  }
}

export const defaultClient = new ApiClient();
export const apiClient = defaultClient;
export default defaultClient;

export function thinkTime(min, max) {
  if (typeof __ENV !== 'undefined' && (__ENV.K6_FAST_TEST === 'true' || __ENV.K6_FAST_TEST === '1')) {
    sleep(0.05);
    return;
  }
  sleep(min + Math.random() * (max - min));
}
