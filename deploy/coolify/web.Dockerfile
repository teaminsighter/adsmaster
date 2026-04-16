# AdsMaster Frontend Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app

# Copy deps
COPY --from=deps /app/node_modules ./node_modules

# Cache bust - change this to force rebuild
ARG CACHE_BUST=2

# Copy source code
COPY apps/web ./apps/web
COPY package.json package-lock.json ./

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
WORKDIR /app/apps/web
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application (monorepo structure)
# Standalone output contains: /app/apps/web/.next/standalone/apps/web/server.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Copy public folder to the correct nested location
COPY --from=builder /app/apps/web/public ./apps/web/public
# Copy static files to the correct nested location
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

# Work from the nested app directory
WORKDIR /app/apps/web

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check (use 127.0.0.1 instead of localhost to force IPv4)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000 || exit 1

CMD ["node", "server.js"]
