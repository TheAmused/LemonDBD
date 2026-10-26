// frontend/src/__tests__/helpers/dom.ts
//
// A browser-like DOM (happy-dom) for tests that need effects, events or hooks -- import this module
// FIRST in such a test file. Each test file runs in its own process, so the globals stay local to it.
// Static output (labels, aria attributes, markup) does not need it: use renderWithDictionary.
//
//   import { renderHook, render, screen, act, fireEvent, waitFor, withDictionary, stubFetch } from '../../helpers/dom';
import './domGlobals';
import React from 'react';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'node:test';
import { DictionaryProvider } from '@/context/DictionaryContext';
import type { Dictionary } from '@/locales/types';
import type { Locale } from '@/i18n/config';
import enDict from '@/locales/en';
import { AuthProvider } from '@/context/AuthContext';
import { SiteConfigProvider } from '@/context/SiteConfigContext';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext, SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';

afterEach(() => cleanup());

export * from '@testing-library/react';

/** A `wrapper` for render / renderHook that provides the dictionary, as `[locale]/layout.tsx` does. */
export function withDictionary(dict: Dictionary = enDict as Dictionary, locale: Locale = 'en') {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(DictionaryProvider, { dict, locale, children });
  };
}

export interface StubbedCall {
  url: string;
  method: string;
  body: unknown;
}

type Responder = (call: StubbedCall) => unknown | Promise<unknown>;

/**
 * Replace `fetch` with `respond`, which gets each call and returns the JSON body to answer with (or a
 * Response, or a Promise of either -- a promise you resolve later lets a test control the order in
 * which answers arrive). Returns the recorded calls and a `restore` function.
 */
export function stubFetch(respond: Responder) {
  const original = globalThis.fetch;
  const calls: StubbedCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const call = { url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    const answer = await respond(call);
    if (answer instanceof Response) return answer;
    return new Response(JSON.stringify(answer ?? {}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  return { calls, restore: () => void (globalThis.fetch = original) };
}

/** A promise plus its resolve function, for answering a stubbed request later. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/**
 * A `wrapper` with the Next.js app-router contexts (useRouter, usePathname, useSearchParams) plus the
 * dictionary, for components that navigate. `router.pushes` records every push / replace.
 */
export function withNextApp(options: { pathname?: string; search?: string; dict?: Dictionary; locale?: Locale } = {}) {
  const { pathname = '/en', search = '', dict = enDict as Dictionary, locale = 'en' } = options;
  const pushes: string[] = [];
  const router = {
    push: (href: string) => void pushes.push(href),
    replace: (href: string) => void pushes.push(href),
    back: () => void pushes.push('<back>'),
    forward: () => undefined,
    refresh: () => undefined,
    prefetch: () => undefined,
  };
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      AppRouterContext.Provider,
      { value: router as never },
      React.createElement(
        PathnameContext.Provider,
        { value: pathname },
        React.createElement(
          SearchParamsContext.Provider,
          { value: new URLSearchParams(search) },
          React.createElement(DictionaryProvider, { dict, locale, children })
        )
      )
    );
  }
  return { wrapper: Wrapper, router: { ...router, pushes } };
}

type RouteAnswer = { status?: number; body: unknown } | ((call: StubbedCall) => { status?: number; body: unknown } | Promise<{ status?: number; body: unknown }>);

/**
 * `stubFetch` by API path: `routeFetch({ 'GET /auth/me': { body: {...} }, '/site-config': {...} })`.
 * A key is `[METHOD ]/path` under /api/v1; the longest matching path wins and a path matches with or
 * without a query string. Unknown calls answer 404 and are listed in `unmatched`.
 */
export function routeFetch(routes: Record<string, RouteAnswer>) {
  const unmatched: string[] = [];
  const entries = Object.entries(routes)
    .map(([key, answer]) => {
      const [method, path] = key.includes(' ') ? key.split(' ', 2) : [null, key];
      return { method, path, answer };
    })
    .sort((a, b) => b.path.length - a.path.length);
  const stub = stubFetch(async (call) => {
    const apiPath = call.url.replace(/^.*?\/api\/v1/, '').split('?')[0];
    const hit = entries.find((e) => (e.method === null || e.method === call.method) && apiPath === e.path);
    if (!hit) {
      unmatched.push(`${call.method} ${apiPath}`);
      return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    const answer = typeof hit.answer === 'function' ? await hit.answer(call) : hit.answer;
    return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  });
  return { ...stub, unmatched };
}

/** A signed-in, verified user as GET /auth/me returns it. */
export const TEST_USER = {
  id: 1,
  login: 'alice',
  username: 'Alice',
  email: 'alice@example.com',
  role: 'user' as const,
  is_verified: true,
  onboarding_completed_at: '2026-01-01T00:00:00Z',
};

/**
 * The providers a page has: Next router contexts, dictionary, site config and auth. Pair it with
 * `routeFetch` answering `/auth/me` (and `/site-config` when a test needs other settings).
 */
export function withAppProviders(options: { pathname?: string } = {}) {
  const next = withNextApp({ pathname: options.pathname });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      next.wrapper,
      null,
      React.createElement(SiteConfigProvider, null, React.createElement(AuthProvider, null, children))
    );
  }
  return { wrapper: Wrapper, router: next.router };
}
