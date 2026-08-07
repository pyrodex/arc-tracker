# ARC Tracker

A self-hosted web tool for tracking blueprints and ARC parts across multiple characters in [ARC Raiders](https://arcraiders.com/).

## Features

### Blueprint Tracking
- **83 blueprints** seeded from [arcraiders.wiki](https://arcraiders.wiki/wiki/Blueprints) across 7 categories: Weapons, Mods, Explosives, Medicine, Augments, Utility, and Crafting
- **Per-character tracking** — mark each blueprint as Learned/Consumed and track extra copies with +/– controls or direct input
- **Quick learn/unlearn all** — bulk-toggle all visible blueprints for a character in one click
- **Blueprint icons** — downloaded from arcraiders.wiki on first startup using an explicit name→file mapping; SVG category-icon placeholders generated for any not found
- **Alphabetical ordering** — all blueprint lists are sorted A→Z regardless of category filter

### ARC Parts Tracking *(new in v1.1.0)*
- **9 Epic & Legendary ARC parts** seeded from [arcraiders.wiki](https://arcraiders.wiki/wiki/ARC): Queen Reactor, Matriarch Reactor, Bastion Cell, Bombardier Cell, Leaper Pulse Unit, Rocketeer Driver, Vaporizer Regulator, Turbine Compressor, and Assessor Matrix
- **Per-character count tracking** — increment or decrement how many of each part a character holds, with click-to-edit direct input
- **In-game icons** — all 9 part icons downloaded from arcraiders.wiki; rarity-colored fallbacks (amber for Legendary, purple for Epic)
- **Grouped display** — Legendary parts shown above Epic parts with distinct color coding

### Characters
- **Multi-character support** — add as many characters as you need
- **Parent/child hierarchy** *(new in v1.2.0)* — link alts and mules under a main character; the Characters page groups parents with nested children sorted A→Z
- **Multi-select labels** — assign one or more labels per character from presets (Wipe, Non-Wipe, Mule, PvP, PvE, HC, Leveling, Trade) or create custom labels
- **Color coding** — pick from preset colors or a custom color picker; colors appear throughout the UI
- **Notes** — optional free-text notes per character
- **Nomad Stash** — per-character +/– counter for tracking your stash count, starting at zero
- **At-a-glance stats** — each character card shows learned blueprint count, unlearned count, spare/extra copies, and total ARC parts collected
- **Delete confirmation** — a prominent confirmation prompt (with warning) is shown before a character and all its data are permanently removed

### Blueprints Page
- **Filter by category** — Weapons, Mods, Explosives, Medicine, Augments, Utility, Crafting, or All
- **Filter by status** — All, Learned, or Not Learned
- **Full-text search** — filter blueprints by name in real time
- **Character switcher** — switch between characters without leaving the page

### ARC Parts Page *(new in v1.1.0)*
- **Filter by rarity** — All, Legendary, or Epic
- **Full-text search** — filter by part name or source enemy
- **Character switcher** — per-character counts, switching without leaving the page
- **Grouped sections** — Legendary parts at the top, Epic parts below

### Workshop *(new in v1.3.0)*
- **6 upgradable stations** seeded from [arcraiders.wiki](https://arcraiders.wiki/wiki/Workshop) — Gunsmith, Gear Bench, Medical Lab, Explosives Station, Utility Station, and Refiner (the free, non-upgradable Workbench is intentionally excluded)
- **Per-level requirements** — exact material lists for levels 1–3 of every station
- **Per-character station levels** — mark each station's current level for a character with one click; completed levels are badged "Built", the next one is badged "Next"
- **Material stockpile tracking** — track how many of each required material a character currently holds, with +/– controls or direct input
- **Acquired vs. required progress** — every requirement shows total acquired across *all* characters against the amount needed, turning green once you have enough
- **Quick "which character has it" reference** — each material lists every character currently holding a nonzero amount, so you know where to pull materials from before upgrading
- **Shared ARC part counts** — requirements that are also Epic ARC parts (Bastion Cell, Bombardier Cell, Leaper Pulse Unit, Rocketeer Driver) reuse the same count tracked on the ARC Parts page instead of double-counting
- **Search** — filter stations/materials by name

### Reports
- **Unlearned Blueprints** — collapsible rows showing which blueprints are missing for at least one character; expand any row to see each character's ✓/✗ status with name and labels
- **Extras Inventory** — total extras per blueprint sorted by count; expand to drill down into which characters hold extras and how many
- **ARC Parts Inventory** *(new in v1.1.0)* — total ARC parts collected per part type; expand to see per-character counts with rarity badges and source enemy info; sorted Legendary-first
- **Workshop Materials** *(new in v1.3.0)* — total workshop materials collected per material type; expand to see per-character counts

### UI & Themes
- **Dark, Light, and System/Auto** color schemes — toggle between dark (default), light, or follow the OS preference; choice persisted in `localStorage`
- **Responsive layout** — sidebar navigation with the official ARC Raiders icon
- **Modern design** — built with Tailwind CSS, smooth transitions, and consistent arc-themed color tokens

## Quick Start

### Docker — pre-built image from GitHub Container Registry (easiest)

```bash
# Pull and run the latest image (no build required)
docker compose -f docker-compose.ghcr.yml up -d
```

Pin to a specific release:

```bash
IMAGE_TAG=v1.2.0 docker compose -f docker-compose.ghcr.yml up -d
```

Open <http://localhost:3001>

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
# Terminal 1 — backend (starts on :3001)
cd backend && npm install && npm run dev

# Terminal 2 — frontend (proxies /api → :3001, starts on :5173)
cd frontend && npm install && npm run dev
```

### Re-download icons

```bash
# Trigger a re-download from a running container via the API
curl -X POST http://localhost:3001/api/icons/refresh

# Or exec into the container directly
docker compose exec arc-tracker node /app/scripts/download-icons.js --force

# Or run locally (downloads to ./data/icons/)
DATA_DIR=./data node scripts/download-icons.js
```

## Architecture

```
arc-tracker/
├── backend/
│   └── src/
│       ├── server.js          Express API + static file serving
│       ├── db.js              better-sqlite3 setup, schema, seed, and migrations
│       ├── blueprints.js      Seed data (83 blueprints)
│       ├── arc-parts.js       Seed data (9 Epic/Legendary ARC parts)
│       └── workshop.js        Seed data (6 stations × 3 levels of material requirements)
├── frontend/
│   └── src/
│       ├── pages/             Dashboard, Characters, Blueprints, ArcParts, Workshop, Reports
│       ├── components/        BlueprintCard, BlueprintIcon, ArcPartCard, ArcPartIcon,
│       │                      WorkshopStationCard, WorkshopMaterialIcon,
│       │                      CategoryIcon, CharacterForm, Layout, Modal, ThemeToggle, …
│       ├── hooks/
│       │   ├── useApi.ts      TanStack Query hooks for all API calls
│       │   └── useTheme.ts    Dark/light/system theme hook
│       └── types/             TypeScript interfaces
├── scripts/
│   └── download-icons.js      arcraiders.wiki icon downloader + SVG fallback
├── Dockerfile                 Multi-stage build (frontend → backend → runtime)
├── docker-compose.yml         Local build deployment
└── docker-compose.ghcr.yml    GHCR pre-built image deployment
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/blueprints` | All blueprints (query: `?category=weapons&in_game=true`) |
| GET | `/api/blueprints/categories` | Category list with counts |
| GET | `/api/characters` | All characters |
| POST | `/api/characters` | Create a character (supports `parent_id`) |
| PUT | `/api/characters/:id` | Update a character (supports `parent_id`, `nomad_stash`) |
| DELETE | `/api/characters/:id` | Delete a character and all its tracking data |
| GET | `/api/tracking/:characterId` | All blueprint tracking records for a character |
| POST | `/api/tracking` | Upsert a single blueprint tracking record |
| POST | `/api/tracking/batch` | Upsert up to 500 blueprint records at once |
| GET | `/api/arc-parts` | All ARC parts (query: `?rarity=epic\|legendary`) |
| GET | `/api/arc-parts/tracking/:characterId` | ARC parts counts for a character |
| POST | `/api/arc-parts/tracking` | Upsert an ARC part count for a character |
| GET | `/api/workshop/stations` | All workshop stations with per-level material requirements |
| GET | `/api/workshop/progress/:characterId` | Current station levels for a character |
| POST | `/api/workshop/progress` | Upsert a station's current level (0–3) for a character |
| GET | `/api/workshop/materials/tracking/:characterId` | Workshop material counts for a character |
| POST | `/api/workshop/materials/tracking` | Upsert a workshop material count for a character |
| GET | `/api/reports/summary` | Dashboard summary stats (per-character learned, extras, and ARC parts counts) |
| GET | `/api/reports/unlearned` | Unlearned blueprints with per-character status |
| GET | `/api/reports/extras` | Extras by blueprint with character breakdown |
| GET | `/api/reports/arc-parts` | ARC parts collected with per-character breakdown |
| GET | `/api/reports/workshop-materials` | Workshop materials collected with per-character breakdown |
| POST | `/api/icons/refresh` | Trigger a background icon re-download |
| GET | `/health` | Server health check (status, blueprint/character counts, uptime) |
| GET | `/icons/:slug.png` | Item icon PNG |
| GET | `/icons/:slug.svg` | Item icon SVG placeholder |

## Security

- **Helmet.js** — CSP, X-Frame-Options, and other HTTP security headers (HSTS intentionally disabled; handled by the reverse proxy)
- **Rate limiting** — 300 req/min reads, 120 req/min writes per IP via `express-rate-limit`
- **Parameterized SQL** — no SQL injection risk (`better-sqlite3` prepared statements)
- **Non-root container user** — runs as `arcapp` (uid 1001)
- **Read-only root filesystem** — only `/data` and `/tmp` are writable at runtime
- **All capabilities dropped** — `cap_drop: ALL` in Docker Compose
- **No built-in authentication** — designed to sit behind a reverse proxy (nginx, Caddy, Traefik) that handles auth

## CI/CD

A GitHub Actions workflow (`.github/workflows/docker-build.yml`) automatically builds and publishes multi-platform images to GitHub Container Registry on every push to `main`.

| Event | What happens |
|-------|-------------|
| Push to `main` | Build for `linux/amd64` + `linux/arm64` on native runners, push `latest` + `sha-<short>` tags |
| Push a `v*.*.*` tag | Also publish semver tags (`1.2.3`, `1.2`, `1`) |
| Pull request | Build only (no push) to validate the Dockerfile |

Builds use native ARM64 runners (no QEMU emulation) and GitHub Actions layer caching for fast rebuilds.

The image is published at:

```
ghcr.io/pyrodex/arc-tracker
```

## Reverse Proxy Example (Caddy)

```caddy
arc.yourdomain.com {
    basicauth * {
        youruser JDJhJDE0...
    }
    reverse_proxy localhost:3001
}
```

## Data Source

Blueprint and ARC parts data sourced from [arcraiders.wiki](https://arcraiders.wiki/).
This project is not affiliated with Embark Studios or ARC Raiders.

## Changelog

### v1.3.0
- **Workshop** — new side-nav section tracking upgrade requirements for the Workshop's 6 upgradable stations (Gunsmith, Gear Bench, Medical Lab, Explosives Station, Utility Station, Refiner), seeded from [arcraiders.wiki](https://arcraiders.wiki/wiki/Workshop); the free, non-upgradable Workbench is excluded
- **Per-level requirements** — exact material lists for levels 1–3 of every station, with per-character "current level" tracking (Built / Next badges)
- **Material stockpile tracking** — per-character counts for every required material, with acquired-vs-required progress shown across all characters combined
- **Quick character reference** — each material shows which characters currently hold it and how many, so you always know where to pull from
- **Shared ARC part counts** — the 4 requirement items that are also Epic ARC parts reuse the existing ARC Parts tracking instead of a duplicate counter
- **Reports: Workshop Materials tab** — cross-character inventory view for all tracked workshop materials

### v1.2.0
- **Character parent/child hierarchy** — link alts and mules under a top-level parent via a new `parent_id` field; Characters page shows parents with nested children sorted alphabetically
- **Character form** — parent dropdown to assign or change a character's parent
- **Database migration** — existing databases automatically gain the `parent_id` column on startup

### v1.1.2
- Dependency and lock file maintenance

### v1.1.1
- Fix browser tab title still showing "ARC Blueprint Tracker" (now "ARC Tracker")
- Fix remaining "blueprint tracker" references in Dashboard subtitle, Characters page description, empty-state messages, and delete confirmation dialog

### v1.1.0
- **ARC Parts tracking** — new section for Epic and Legendary drops (Queen Reactor, Matriarch Reactor, Bastion Cell, Bombardier Cell, Leaper Pulse Unit, Rocketeer Driver, Vaporizer Regulator, Turbine Compressor, Assessor Matrix)
- **ARC Parts page** — per-character count tracking with +/– controls, rarity filter, search, and grouped Legendary/Epic display
- **ARC Parts icons** — in-game item icons downloaded from arcraiders.wiki
- **Reports: ARC Parts tab** — collapsible inventory showing per-character counts, sorted Legendary-first
- **Characters: ARC parts stat** — each character row now shows total ARC parts collected alongside blueprints learned/missing/extras
- **Project rename** — project renamed from *ARC Blueprint Tracker* to *ARC Tracker* to reflect expanded scope; GitHub URL updated to `github.com/pyrodex/arc-tracker`
- **Sidebar footer** — "Data: arcraiders.wiki" link replaced with GitHub project link

### v1.0.3 and earlier
Initial release with blueprint tracking, multi-character support, Reports, dark/light/system themes, Docker deployment, and GHCR CI/CD.
