# ── Stage 1: Build frontend ────────────────────────────────────────────────────
# node:22.23.2 includes undici 6.28.0 which patches CVE-2026-15157, CVE-2026-16728,
# CVE-2026-16729, and other July 2026 Node.js security release advisories.
FROM node:22.23.2-alpine AS frontend-builder

# Upgrade npm to 11.18.0 which bundles @sigstore/core@3.2.1, fixing CVE-2026-48758.
# npm 10.9.x (shipped with Node 22) bundles @sigstore/core@3.1.0 (vulnerable).
RUN npm install -g npm@11.18.0

WORKDIR /build/frontend

# Install deps first (layer cache)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --prefer-offline

# Build
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Build backend deps (needs python3/make/g++ for better-sqlite3) ───
FROM node:22.23.2-alpine AS backend-builder

# Build tools required to compile better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

# Upgrade npm to 11.18.0 — fixes CVE-2026-48758 (@sigstore/core@3.1.0 → 3.2.1).
RUN npm install -g npm@11.18.0

WORKDIR /build/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev --prefer-offline


# ── Stage 3: Production image ──────────────────────────────────────────────────
FROM node:22.23.2-alpine AS runner

# npm ships with the Node base image but is never invoked at runtime — the app
# runs purely as a `node` process. Removing npm eliminates Trivy findings for
# npm-internal dependencies (ip-address, brace-expansion, tar, undici) that have
# no attack surface in this container.
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

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
