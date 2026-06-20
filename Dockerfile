# ── Stage 1: Build frontend ────────────────────────────────────────────────────
# node:22.23.0 includes undici 6.27.0 which patches CVE-2026-11525, CVE-2026-6733,
# CVE-2026-9679, and CVE-2026-12151 (June 2026 Node.js security release).
FROM node:22.23.0-alpine AS frontend-builder

WORKDIR /build/frontend

# Install deps first (layer cache)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --prefer-offline

# Build
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Build backend deps (needs python3/make/g++ for better-sqlite3) ───
FROM node:22.23.0-alpine AS backend-builder

# Build tools required to compile better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

WORKDIR /build/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev --prefer-offline


# ── Stage 3: Production image ──────────────────────────────────────────────────
FROM node:22.23.0-alpine AS runner

# Security: don't run as root
RUN addgroup -g 1001 -S arcapp && adduser -u 1001 -S arcapp -G arcapp

WORKDIR /app

# Copy application code
COPY backend/  ./backend/
COPY scripts/  ./scripts/

# Overlay pre-compiled backend node_modules (built with python3/make/g++)
COPY --from=backend-builder /build/backend/node_modules ./backend/node_modules

# Copy built frontend
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Pre-create data dirs with correct ownership so the volume mount inherits them
RUN mkdir -p /data/icons && chown -R arcapp:arcapp /data

# Drop to non-root
USER arcapp

# Runtime env defaults (override via docker-compose or -e flags)
ENV NODE_ENV=production \
    PORT=3001 \
    DATA_DIR=/data

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/blueprints/categories || exit 1

# Ensure data dir exists, start icon download in background, then start server.
# Using exec so the Node process receives SIGTERM directly from Docker.
CMD ["sh", "-c", "mkdir -p ${DATA_DIR}/icons && node /app/scripts/download-icons.js & exec node /app/backend/src/server.js"]
