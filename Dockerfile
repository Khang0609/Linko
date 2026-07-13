# ============================================================
# Linko Web App — Multi-stage Docker Build
# Monorepo: pnpm workspace · Next.js standalone output
# ============================================================

# ---- base ----
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web-app/package.json apps/web-app/
COPY packages/core-utils/package.json packages/core-utils/
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web-app/node_modules ./apps/web-app/node_modules
COPY --from=deps /app/packages/core-utils/node_modules ./packages/core-utils/node_modules 2>/dev/null || true
COPY . .

# Generate Prisma Client
RUN pnpm --filter @linko/web-app exec prisma generate

# Build Next.js (standalone output)
RUN pnpm --filter @linko/web-app build

# ---- runner ----
FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=build /app/apps/web-app/public ./apps/web-app/public

# Copy standalone server (includes node_modules subset)
COPY --from=build --chown=nextjs:nodejs /app/apps/web-app/.next/standalone ./
# Copy static assets
COPY --from=build --chown=nextjs:nodejs /app/apps/web-app/.next/static ./apps/web-app/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web-app/server.js"]
