# ============================================================
# Real Estate Token — Production Multi-Stage Dockerfile
# Produces a single image serving both API (Express :3001) and
# the React SPA (via mountFrontend.ts).
# ============================================================

# ── Stage 1: Install backend production dependencies ────────
FROM node:22-alpine AS deps

RUN apk add --no-cache dumb-init

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Build Vite / React frontend ────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /app

# Install root (frontend) dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source files needed for the Vite build
COPY index.html ./
COPY src ./src
COPY public ./public
COPY vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY postcss.config.js tailwind.config.js ./

RUN npm run build

# ── Stage 3: Production image ──────────────────────────────
FROM node:22-alpine AS production

# dumb-init for proper PID 1 signal handling (graceful shutdown)
COPY --from=deps /usr/bin/dumb-init /usr/bin/dumb-init

# Non-root user for security
RUN addgroup -S rwa && adduser -S rwa -G rwa

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy backend source
COPY backend/package.json ./backend/
COPY backend/src ./backend/src

# Copy shared library layers that backend imports via ../../src/lib/*
COPY src/lib ./src/lib

# Copy Supabase migrations (referenced at startup)
COPY supabase/migrations ./supabase/migrations

# Copy compiled frontend build from stage 2
COPY --from=frontend-build /app/dist ./dist

# Set ownership to non-root user
RUN chown -R rwa:rwa /app

USER rwa

WORKDIR /app/backend

ENV NODE_ENV=production
ENV SERVE_FRONTEND=true
ENV FRONTEND_DIST=/app/dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health/live || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "src/index.ts"]
