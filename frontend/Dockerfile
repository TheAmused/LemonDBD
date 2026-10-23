# frontend/Dockerfile
# Stage 1: Base Alpine Setup
# Node LTS on a fixed Alpine release: `node:alpine` followed whatever "current" Node was.
FROM node:24-alpine3.24 AS base
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Stage 2: Dependencies Installation (Includes devDependencies needed for build)
FROM base AS deps
WORKDIR /app

# The lockfile is required and must match package.json: `npm install` as a fallback would
# silently resolve new versions instead of failing the build.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Stage 3: Next.js Production Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL=https://localhost
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_UMAMI_URL=""
ENV NEXT_PUBLIC_UMAMI_URL=${NEXT_PUBLIC_UMAMI_URL}
ARG NEXT_PUBLIC_SITE_URL=""
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ARG NEXT_PUBLIC_PGADMIN_URL=""
ENV NEXT_PUBLIC_PGADMIN_URL=${NEXT_PUBLIC_PGADMIN_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 4: Standalone Production Runner (Zero devDependencies footprint)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]