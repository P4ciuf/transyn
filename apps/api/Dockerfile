FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastify

COPY --from=build --chown=fastify:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=fastify:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=fastify:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=build --chown=fastify:nodejs /app/node_modules ./node_modules

WORKDIR /app/apps/api

USER fastify:nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/app.js"]
