# syntax=docker/dockerfile:1.7
FROM node:22.18.0-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:22.18.0-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG APP_VERSION=2.0.0
ARG BUILD_ID=local
ENV APP_VERSION=$APP_VERSION BUILD_ID=$BUILD_ID
RUN npm run build

FROM node:22.18.0-alpine AS runtime
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs \
    && mkdir -p /var/lib/mission-control \
    && chown nextjs:nodejs /var/lib/mission-control
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    MISSION_CONTROL_MODE=live \
    ADOS_CONTROL_PLANE_ROOT=/data/ados \
    MISSION_CONTROL_PERSISTENCE=sqlite \
    MISSION_CONTROL_DATA_ROOT=/var/lib/mission-control \
    MISSION_CONTROL_AUTH_MODE=basic
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER 1001:1001
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=4 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
