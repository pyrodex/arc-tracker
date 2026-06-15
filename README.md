# ARC Blueprint Tracker

A self-hosted web tool for tracking learned and extra blueprints across multiple characters in ARC Raiders.

## Features

- **83 blueprints** seeded from [arcraiders.wiki](https://arcraiders.wiki/wiki/Blueprints) across 7 categories (Weapons, Mods, Explosives, Medicine, Augments, Utility, Crafting)
- **Multiple characters** with labels (Wipe, Non-Wipe, Mule, PvP, etc.) and custom colors
- **Per-character tracking** — mark blueprints as Learned/Consumed and track extra copies with +/– controls
- **Reports**:
  - *Unlearned* — which blueprints aren't learned by which characters
  - *Extras Inventory* — total extras by blueprint with per-character drill-down
- **Blueprint icons** — auto-downloaded from the wiki on first startup; SVG placeholders generated for any not found
- **Single Docker container** — frontend (React + Tailwind) served by the same Node.js/Express backend
- Persistent SQLite database in a named Docker volume

## Quick Start

### Docker — pre-built image from GitHub Container Registry (easiest)

```bash
# Pull and run the latest image (no build required)
docker compose -f docker-compose.ghcr.yml up -d
```

Pin to a specific release:

```bash
IMAGE_TAG=v1.0.0 docker compose -f docker-compose.ghcr.yml up -d
```

Open http://localhost:3001

### Docker — build locally from source

```bash
docker compose up -d
```

### Override the host port

```bash
HOST_PORT=8080 docker compose up -d
```

### Development

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev       # starts on :3001

# Terminal 2 — frontend (proxies /api → :3001)
cd frontend
npm install
npm run dev       # starts on :5173
```

### Re-download icons

```bash
# Inside the running container
docker compose exec arc-tracker node /app/scripts/download-icons.js --force

# Or locally (downloads to ./data/icons/)
DATA_DIR=./data node scripts/download-icons.js
```

## Architecture

```
arc-blueprint-tracker/
├── backend/
│   └── src/
│       ├── server.js       Express API + static file serving
│       ├── db.js           better-sqlite3 setup + schema + seed
│       └── blueprints.js   Seed data (83 blueprints)
├── frontend/
│   └── src/
│       ├── pages/          Dashboard, Characters, Blueprints, Reports
│       ├── components/     BlueprintCard, Modal, CategoryIcon, …
│       ├── hooks/useApi.ts TanStack Query hooks for all API calls
│       └── types/          TypeScript types
├── scripts/
│   └── download-icons.js   Wiki icon downloader with SVG fallback
├── Dockerfile              Multi-stage build
└── docker-compose.yml      Production deployment
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/blueprints` | All blueprints (filter: `?category=weapons&in_game=true`) |
| GET | `/api/blueprints/categories` | Category counts |
| GET | `/api/characters` | All characters |
| POST | `/api/characters` | Create character |
| PUT | `/api/characters/:id` | Update character |
| DELETE | `/api/characters/:id` | Delete character |
| GET | `/api/tracking/:characterId` | Tracking for a character |
| POST | `/api/tracking` | Upsert single tracking record |
| POST | `/api/tracking/batch` | Upsert up to 500 records |
| GET | `/api/reports/summary` | Dashboard summary stats |
| GET | `/api/reports/unlearned` | Unlearned blueprints with per-character status |
| GET | `/api/reports/extras` | Extras by blueprint with character breakdown |
| GET | `/icons/:slug.png` | Blueprint icon (or 404 → falls back to SVG) |

## Security

- **Helmet.js** — CSP, HSTS, X-Frame-Options, and other HTTP security headers
- **Rate limiting** — 300 req/min reads, 120 req/min writes per IP
- **Parameterized SQL** — no SQL injection risk (better-sqlite3)
- **Non-root container user** — runs as `arcapp` (uid 1001)
- **Read-only root filesystem** — only `/data` and `/tmp` are writable
- **All capabilities dropped** — `cap_drop: ALL`
- **No authentication** — designed to sit behind a reverse proxy (nginx, Caddy, Traefik) that handles auth

## CI/CD

A GitHub Actions workflow (`.github/workflows/docker-build.yml`) automatically builds and publishes the image to GitHub Container Registry on every push to `main`:

| Event | What happens |
|-------|-------------|
| Push to `main` | Build for `linux/amd64` + `linux/arm64`, push `latest` + `sha-<short>` tags |
| Push a `v*.*.*` tag | Also publish semver tags (`1.2.3`, `1.2`, `1`) |
| Pull request | Build only (no push) to validate the Dockerfile |

Layer caching via GitHub Actions cache keeps builds fast after the first run.

The image is published at:
```
ghcr.io/pyrodex/arc-blueprint-tracker
```

## Reverse Proxy Example (Caddy)

```
blueprint.yourdomain.com {
    basicauth * {
        youruser JDJhJDE0...
    }
    reverse_proxy localhost:3001
}
```
