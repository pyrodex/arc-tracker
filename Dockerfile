# ── Stage 1: Build frontend ────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Install deps first (layer cache)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --prefer-offline

# Build
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: don't run as root
RUN addgroup -g 1001 -S arcapp && adduser -u 1001 -S arcapp -G arcapp

WORKDIR /app

# Install backend production dependencies
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm ci --omit=dev --prefer-offline

# Copy application code
COPY backend/  ./backend/
COPY scripts/  ./scripts/

# Copy built frontend
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Data volume (SQLite DB + icons)
RUN mkdir -p /data/icons && chown -R arcapp:arcapp /data

# Drop to non-root
USER arcapp

# Runtime env defaults (override via docker-compose or -e flags)
ENV NODE_ENV=production \
    PORT=3001 \
    DATA_DIR=/data

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/blueprints/categories || exit 1

# Entrypoint: download icons (only missing ones) then start server
CMD ["sh", "-c", "node /app/scripts/download-icons.js && node /app/backend/src/server.js"]
