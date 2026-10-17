// frontend/src/constants/externalTools.ts
// Where the side tools live when no NEXT_PUBLIC_*_URL says otherwise: the site's own host on the tool's
// port. The ports are the `listen` ports of nginx/default.conf; __tests__/unit/externalToolPorts.test.ts
// fails when the two drift apart.

export const EXTERNAL_TOOL_PORTS = { umami: 8117, pgAdmin: 5050 } as const;

/** Host to assume when the code runs where there is no window (server render). */
export const FALLBACK_TOOL_HOST = 'localhost';
