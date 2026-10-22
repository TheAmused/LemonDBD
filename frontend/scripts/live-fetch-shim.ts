// frontend/scripts/live-fetch-shim.ts
// Preloaded (node --import) into every live test process by run-live-tests.ts.
// The API only puts the session token in the JSON body of /auth/login and /auth/register when the
// request sends `X-Return-Token: 1` (browsers get an HttpOnly cookie instead). The live tests are
// API clients that read `.token`, so ask for it on every API call.
const originalFetch = globalThis.fetch;

globalThis.fetch = (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.includes("/api/")) return originalFetch(input, init);
  const headers = new Headers(init?.headers ?? (typeof input === "object" && "headers" in input ? input.headers : undefined));
  if (!headers.has("X-Return-Token")) headers.set("X-Return-Token", "1");
  return originalFetch(input, { ...init, headers });
};
