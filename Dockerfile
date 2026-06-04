# Production API image (monorepo: backend + shared src/lib layers)
FROM node:22-alpine AS base
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

COPY backend ./backend
COPY src/lib ./src/lib
COPY supabase/migrations ./supabase/migrations

WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health/live || exit 1

CMD ["npx", "tsx", "src/index.ts"]
