// frontend/src/app/api/healthz/route.ts
//
// Liveness for the frontend container's healthcheck (docker-compose.base.yml). It is only ever
// called on 127.0.0.1:3000 inside the container: nginx sends every public /api/ path to the
// backend, so this route is not reachable from outside.
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
