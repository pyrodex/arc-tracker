# ARC Tracker

A self-hosted web tool for tracking blueprints, stencils, ARC parts and amplification components across multiple characters in [ARC Raiders](https://arcraiders.com/).

## Features

### Blueprint Tracking
- **91 blueprints** seeded from [arcraiders.wiki](https://arcraiders.wiki/wiki/Blueprints) and [Arc Blueprint Tracker](https://arcblueprinttracker.io/data/blueprints-grid) across 8 categories: Weapons, Mods, Explosives, Medicine, Augments, Utility, Keys, and Crafting
- **Per-character tracking** — mark each blueprint as Learned/Consumed and track extra copies with +/– controls or direct input
- **Quick learn/unlearn all** — bulk-toggle all visible blueprints for a character in one click
- **Blueprint icons** — downloaded from arcraiders.wiki on first startup using an explicit name→file mapping; SVG category-icon placeholders generated for any not found
- **Alphabetical ordering** — all blueprint lists are sorted A→Z regardless of category filter

### Stencil Tracking *(new in v1.6.0)*
- **14 weapon stencils** seeded from [Arc Blueprint Tracker](https://arcblueprinttracker.io/data/blueprints-grid) (names, rarity) and [arcraiders.wiki](https://arcraiders.wiki/wiki/Stencils) (compatible weapons), across Legendary, Epic, Rare and Uncommon
- **Per-character tracking** — stencils are found, then learned and crafted, so they work like blueprints: mark each as learned and track extra copies
- **Filter by rarity, weapon and status** — or search by stencil or weapon name; each card lists the weapons the stencil fits
- **Stencil icons** — downloaded from arcraiders.wiki; stencils without their own icon yet use the wiki's generic stencil icon (re-download icons to pick up new ones)

### ARC Parts Tracking *(new in v1.1.0)*
- **10 Epic & Legendary ARC parts** seeded from [arcraiders.wiki](https://arcraiders.wiki/wiki/ARC): Queen Reactor, Matriarch Reactor, Bastion Cell, Bombardier Cell, Leaper Pulse Unit, Rocketeer Driver, Vaporizer Regulator, Turbine Compressor, Assessor Matrix, and Bully Fragmenter
- **Per-character count tracking** — increment or decrement how many of each part a character holds, with click-to-edit direct input
- **In-game icons** — all 10 part icons downloaded from arcraiders.wiki; rarity-colored fallbacks (amber for Legendary, purple for Epic)
- **Grouped display** — Legendary parts shown above Epic parts with distinct color coding

### Amplification Tracking
- **10 amplification components** from the Frozen Trail update, seeded from [arcraiders.wiki](https://arcraiders.wiki/wiki/Amplified_Weapons): Amplification Modules Mk. I–V (one takes a weapon to Level 5; the Mk. matches the weapon's base rarity, Common → Legendary) and five materials spent on individual amplifications: Fluted Rotor Core, Fossilized Lightning, Pneumatic Actuator, Pressure Regulator and Propellant Valve Assembly
- **Per-character counts** with click-to-edit input and value totals, grouped into Modules and Materials, with drop sources where the wiki lists them
- **Item details** — value, rarity, drop source, weight and stack size per component. Propellant Valve Assembly's rarity and value come from [RaidersData](https://raidersdata.com/items/propellant-valve-assembly/), since the wiki has no page for it yet. Drop sources the wiki doesn't give (Fluted Rotor Core, Propellant Valve Assembly) show as unknown rather than guessed
- **ARC parts not duplicated** — amplifications that cost Queen/Matriarch Reactors, Assessor Matrix or Turbine Compressors use the ARC Parts counts
- **Icons** downloaded from arcraiders.wiki; Propellant Valve Assembly falls back to its RaidersData/MetaForge image until the wiki has one

### Characters
- **Multi-character support** — add as many characters as you need
- **Parent/child hierarchy** *(new in v1.2.0)* — link alts and mules under a main character; the Characters page groups parents with nested children sorted A→Z
- **Multi-select labels** — assign one or more labels per character from presets (Wipe, Non-Wipe, Mule, PvP, PvE, HC, Leveling, Trade) or create custom labels
- **Color coding** — pick from preset colors or a custom color picker; colors appear throughout the UI
- **Notes** — optional free-text notes per character
- **Stash space** *(new in v1.6.0)* — per-character +/– counters for stash upgrades (up to 11, 24 slots each), Nomad expansions (up to 2, 12 slots each) and expeditions (up to 5, 12 slots each), with the character's total stash shown on top of the 64-slot base (max 412)
- **At-a-glance stats** — each character card shows learned blueprint count, unlearned count, spare/extra copies, and total ARC parts collected
- **Delete confirmation** — a prominent confirmation prompt (with warning) is shown before a character and all its data are permanently removed

### Blueprints Page
- **Filter by category** — Weapons, Mods, Explosives, Medicine, Augments, Utility, Keys, Crafting, or All
- **Filter by status** — All, Learned, or Not Learned
- **Full-text search** — filter blueprints by name in real time
- **Character switcher** — switch between characters without leaving the page

### ARC Parts Page *(new in v1.1.0)*
- **Filter by rarity** — All, Legendary, or Epic
- **Full-text search** — filter by part name or source enemy
- **Character switcher** — per-character counts, switching without leaving the page
- **Grouped sections** — Legendary parts at the top, Epic parts below

### Workshop *(new in v1.3.0)*
- **7 upgradable stations** seeded from [arcraiders.wiki](https://arcraiders.wiki/wiki/Workshop) — Gunsmith, Gear Bench, Medical Lab, Explosives Station, Utility Station, Refiner, and Research Station (the free, non-upgradable Workbench is intentionally excluded)
- **Per-level requirements** — exact material lists for every level: 1–3 for most stations, 1–4 for the Gunsmith (level 4 requires the Outpost and unlocks Weapon Amplification) and the Research Station
- **Per-character station levels** — mark each station's current level for a character with one click; completed levels are badged "Built", the next one is badged "Next"
- **Material stockpile tracking** — track how many of each required material a character currently holds, with +/– controls or direct input
- **Acquired vs. required progress** — every requirement shows total acquired across *all* characters against the amount needed, turning green once you have enough
- **Quick "which character has it" reference** — each material lists every character currently holding a nonzero amount, so you know where to pull materials from before upgrading
- **Shared ARC part counts** — requirements that are also Epic ARC parts (Bastion Cell, Bombardier Cell, Leaper Pulse Unit, Rocketeer Driver, Bully Fragmenter) reuse the same count tracked on the ARC Parts page instead of double-counting
- **Search** — filter stations/materials by name

### Loadouts *(new in v1.4.0)*
- **Gun builds per character** — define a build as a weapon at a tier (I–IV) plus the mods bolted onto it, then track how many of that exact build a character holds
- **All 24 weapons** *(v1.5.0)* — including the seven unlocked by levelling the Gunsmith rather than by finding a blueprint (Hairpin, Ferro, Stitcher, Kettle, Rattler, Arpeggio, Renegade), grouped by weapon class in the picker
- **Copy to new** *(v1.5.0)* — duplicate a build and adjust what differs, instead of rebuilding a similar loadout from scratch
- **39-mod catalog** seeded from [arcraiders.wiki](https://arcraiders.wiki/wiki/Weapon_Mods) — a deliberate superset of the 25 craftable `mods` blueprints, adding the tier I mods (craftable at Gunsmith 1 but never seeded as blueprints) and the 4 loot-only mods that have no blueprint at all: Silencer III, Horizontal Grip, Kinetic Converter, Anvil Splitter
- **One mod per slot** — muzzle, underbarrel, magazine, stock and tech; enforced by a `UNIQUE(config_id, slot)` index so the API cannot drift from the rule. Shotgun chokes share the muzzle slot and the three magazine sizes share the magazine slot, exactly as the game treats them
- **Seeded prices** — mod sale prices and weapon sale prices (per tier) are seeded from the individual item pages on [arcraiders.wiki](https://arcraiders.wiki); picking a weapon and tier auto-fills its value, and any figure can be overridden per build. Entered prices are never overwritten by re-seeding
- **Value tracking** — a build shows `weapon + mods` as a unit value and `unit × quantity` as a total
- **Unpriced-item warning** — a build whose weapon or mods still have no price is flagged, so a total is never quietly understated
- **Quantity steppers** — +/– controls or direct entry for how many of a build you hold
- **Craftable vs. loot-only** — loot-only mods are marked ◆ throughout, since they can't be produced at the Gunsmith
- **Amplified builds (Level 5)** — the 15 weapons that can be amplified (Hairpin, Kettle, Rattler, Burletta, Il Toro, Anvil, Canto, Osprey, Rascal, Renegade, Bettina, Hullcracker, Aphelion, Equalizer, Jupiter) can be marked Amplified and given any of their 44 amplification options, seeded from [arcraiders.wiki](https://arcraiders.wiki/wiki/Amplified_Weapons) with effects, research and material cost. The editor and API enforce the game's rules: options that require another, options that conflict with each other, and options that rule out a magazine or stock mod. Each build shows its per-gun cost (the matching Amplification Module Mk. plus materials). The wiki doesn't price Level 5 weapons, so the value is entered by hand

> **Note on prices:** the wiki's *index* pages carry no prices — only the individual weapon and mod pages do, so values are seeded from those. Two gaps are left deliberately blank rather than guessed: **Canto** (its page states it has upgrade tiers but shows a single untiered figure, and every weapon's price ladder differs, so the tiers can't be inferred) and **Extended Medium Mag I** (no coin value anywhere on its page). Both are entered by hand; unpriced items count as zero and are flagged in the UI.
>
> **Bettina** is worth spot-checking against the game. Every other weapon draws from one shared ladder (2,900 → 5,000 → 7,000 → 10,000 → 13,000 → 17,000 → 22,000 → 27,000); Bettina alone uses 8,000/11,000/14,000/18,000. The figures are what the page says, but a lone outlier in a rigid pattern is what a wiki typo looks like.

### Reports
- **Amplification** — modules and materials held per component type, grouped Modules/Materials; expand to see per-character counts and value
- **Navigation** *(new in v1.6.0)* — one row of report tabs, an Unlearned / Extras switch for blueprints and stencils, and the selected report, view and character kept in the URL
- **Unlearned Blueprints** — collapsible rows showing which blueprints are missing for at least one character; expand any row to see each character's ✓/✗ status with name and labels
- **Extras Inventory** — total extras per blueprint sorted by count; expand to drill down into which characters hold extras and how many
- **Unlearned Stencils** / **Stencil Extras** — the same two views for stencils, with rarity badges
- **ARC Parts Inventory** *(new in v1.1.0)* — total ARC parts collected per part type; expand to see per-character counts with rarity badges and source enemy info; sorted Legendary-first
- **Workshop Materials** *(new in v1.3.0)* — total workshop materials collected per material type; expand to see per-character counts
- **Loadouts** *(new in v1.4.0)* — builds, guns held and total value per character; expand a character to see every build with its mods and value, plus most-built-weapons and mod-usage breakdowns across all characters

### UI & Themes
- **Dark, Light, and System/Auto** color schemes — toggle between dark (default), light, or follow the OS preference; choice persisted in `localStorage`
- **Responsive layout** — sidebar navigation with the official ARC Raiders icon; on phones it becomes a slide-out menu behind a top bar, and pages scroll as a whole
- **One character choice everywhere** — pick the character once from the switcher on any tracking page; Blueprints, Stencils, ARC Parts, Amplification, Workshop and Loadouts all follow it, and it's remembered between visits. `?character=<id>` links select a character on arrival
- **Quick entry** — `Ctrl+K` / `⌘K` or `/` from anywhere: type an item name, press Enter, type a count, press Enter. Covers blueprints and stencils (extras and learned), ARC parts, amplification components and workshop materials
- **Counters** — hold − or + to repeat (it speeds up), saving once on release; rapid clicks all count
- **Feedback** — failed saves show an error toast; deleting a build offers Undo
- **What's next** — the Dashboard shows the current character's closest workshop upgrades (ready / ready if pooled / short), builds it could amplify, blueprints no character has learned, and spares one character holds that another still needs
- **Readable** — 11px minimum for labels, 12px for text, and a dim text colour that meets WCAG AA contrast on every surface in both themes
- **Modern design** — built with Tailwind CSS 4, smooth transitions, and consistent arc-themed color tokens

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

Missing icons are retried automatically on every container start: anything still showing a placeholder, or a generic stand-in such as the wiki's plain stencil icon, is looked up again and replaced once its own image is available. Each item's sources are tried in order (the wiki first, then fallback URLs such as MetaForge, then any generic stand-in), and images are saved in their real format (`.png` or `.webp`). A forced re-download is only needed to replace icons that already downloaded.

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
│       ├── blueprints.js      Seed data (91 blueprints)
│       ├── stencils.js        Seed data (14 weapon stencils)
│       ├── amplification.js   Seed data (10 amplification modules and materials)
│       ├── arc-parts.js       Seed data (10 Epic/Legendary ARC parts)
│       ├── workshop.js        Seed data (7 stations, 3–4 levels each, of material requirements)
│       ├── weapon-mods.js     Seed data (39 gun mods across 5 slots, incl. loot-only)
│       ├── weapon-prices.js   Seed data (weapon sale prices per tier)
│       └── weapons.js        Seed data (24 weapons incl. 7 Gunsmith-unlocked)
├── frontend/
│   └── src/
│       ├── pages/             Dashboard, Characters, Blueprints, Stencils, ArcParts, Workshop,
│       │                      Loadouts, Reports
│       ├── components/        BlueprintCard, BlueprintIcon, StencilCard, StencilIcon, ArcPartCard, ArcPartIcon,
│       │                      GunConfigCard, GunConfigEditor, LastUpdated,
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
| GET | `/api/characters/activity` | Last-updated per character per tracked area (UTC) |
| POST | `/api/characters` | Create a character (supports `parent_id`) |
| PUT | `/api/characters/:id` | Update a character (supports `parent_id`, `normal_stash` 0–11, `nomad_stash` 0–2, `expedition_stash` 0–5) |
| DELETE | `/api/characters/:id` | Delete a character and all its tracking data |
| GET | `/api/tracking/:characterId` | All blueprint tracking records for a character |
| POST | `/api/tracking` | Upsert a single blueprint tracking record |
| POST | `/api/tracking/batch` | Upsert up to 500 blueprint records at once |
| GET | `/api/stencils` | All stencils (query: `?rarity=epic`) |
| GET | `/api/stencils/tracking/:characterId` | All stencil tracking records for a character |
| POST | `/api/stencils/tracking` | Upsert a stencil tracking record (`learned`, `extras`) |
| GET | `/api/amplification` | Amplification components (query: `?kind=module` or `?kind=material`) |
| GET | `/api/amplification/tracking/:characterId` | Amplification counts for a character |
| POST | `/api/amplification/tracking` | Set a character's count for a component |
| GET | `/api/arc-parts` | All ARC parts (query: `?rarity=epic\|legendary`) |
| GET | `/api/arc-parts/tracking/:characterId` | ARC parts counts for a character |
| POST | `/api/arc-parts/tracking` | Upsert an ARC part count for a character |
| GET | `/api/workshop/stations` | All workshop stations with per-level material requirements |
| GET | `/api/workshop/progress/:characterId` | Current station levels for a character |
| POST | `/api/workshop/progress` | Upsert a station's current level for a character (0 up to that station's max level) |
| GET | `/api/workshop/materials/tracking/:characterId` | Workshop material counts for a character |
| POST | `/api/workshop/materials/tracking` | Upsert a workshop material count for a character |
| GET | `/api/weapon-mods` | Gun mod catalog with slot metadata and seeded prices |
| PUT | `/api/weapon-mods/:id` | Override a mod's sell value |
| GET | `/api/weapons` | Weapon catalog (all 24, incl. Gunsmith-unlocked) with class metadata and each weapon's amplification options |
| GET | `/api/weapon-prices` | Seeded weapon sale prices by weapon and tier |
| GET | `/api/gun-configs/:characterId` | Gun builds for a character, with derived value totals |
| POST | `/api/gun-configs` | Create a build (validates weapon, tier 1–4, one mod per slot, and `amplified` + `amplification_ids` against the weapon's amplification rules) |
| PUT | `/api/gun-configs/:id` | Update a build; omitting `mod_ids` leaves mods untouched, `[]` strips them. Changing to a weapon that can't be amplified drops its amplification |
| PATCH | `/api/gun-configs/:id/quantity` | Adjust quantity by `delta` or set it outright |
| DELETE | `/api/gun-configs/:id` | Delete a build and its mods |
| GET | `/api/reports/gun-configs` | Builds per character with counts, values, and weapon/mod breakdowns |
| GET | `/api/reports/summary` | Dashboard summary stats (per-character learned, extras, stencils, ARC parts, and loadout counts/value) |
| GET | `/api/reports/unlearned` | Unlearned blueprints with per-character status |
| GET | `/api/reports/extras` | Extras by blueprint with character breakdown |
| GET | `/api/reports/stencils/unlearned` | Unlearned stencils with per-character status |
| GET | `/api/reports/stencils/extras` | Extras by stencil with character breakdown |
| GET | `/api/reports/amplification` | Amplification components held with per-character breakdown and value |
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

Blueprint, stencil and ARC parts data sourced from [arcraiders.wiki](https://arcraiders.wiki/) and [Arc Blueprint Tracker](https://arcblueprinttracker.io/).
This project is not affiliated with Embark Studios or ARC Raiders.

## Changelog

### Unreleased
- **Stencil icons** — Bulwark, Dragon's Breath, Serac, Empyrean, Fortuna and Sacrifice now have their own icons, from MetaForge's stencil images, since the wiki hasn't uploaded them yet. Existing installs re-check stencil icons once on startup, so the generic stand-ins are replaced without `--force`, and stencil icon URLs carry a version so browsers don't keep the cached generic image for the 7-day icon cache
- **Icon downloader** — saves WebP images as `.webp` (the frontend already tries `.png`, then `.webp`); tries each source in turn, so a fallback URL that's down falls through to the next instead of an SVG placeholder; and marks generic stand-ins so they keep being retried until the real image appears
- **UX overhaul** — one shared character choice across every tracking page (replacing six separate selector rows); a mobile layout with a slide-out menu; Quick entry (`Ctrl+K`, `⌘K` or `/`); hold-to-repeat counters shared by every page; Undo for deleted builds and an error toast whenever a save fails (previously silent); "Held only" filters on ARC Parts and Amplification and "Has extras" on Blueprints and Stencils; and a Dashboard "What's next" panel in place of the shortcut tiles that repeated the sidebar
- **Have vs. need** — Workshop requirement rows lead with the current character's count against the requirement ("need 3 more", or how many all characters hold between them), and each unbuilt level is marked Ready to build, Ready if pooled, or Short N items. The amplified-build editor shows how many of the module and of each option's materials (including ARC parts such as Assessor Matrix) the character holds
- **Readability** — the dim text colour is lightened to meet WCAG AA (4.5:1) on every background in both themes (it was 3.4–4.1:1 in dark), and 9–10px text is raised to 11px for labels and 12px elsewhere
- **Fix: lost clicks** — clicking + quickly sent "current + 1" from a value that hadn't refreshed yet, so some clicks were dropped. Counters now keep their own value until the server catches up
- **Fix: stray "0" on build cards** — builds that aren't amplified showed a lone `0` (the API sends `amplified` as 0/1), on Loadouts cards and in the Loadouts report
- **Workshop** — already-built levels no longer say "need N more" for materials that were spent; Research Station gets its own icon
- **Tailwind CSS 4** — the frontend moves from Tailwind 3.4 to 4.3 (replaces Dependabot #134, which couldn't build on its own). The theme now lives in `index.css` (`@theme`) instead of `tailwind.config.js`, PostCSS uses `@tailwindcss/postcss`, and `autoprefixer` is dropped since v4 handles prefixing. Every page was compared against the v3 build in light and dark themes and looks the same: v3's line heights, default border colour, button cursor and placeholder colour are kept, and a few classes that v3 silently ignored (`/8` and `/12` opacities, `w-4.5`, `w-13`, a conflicting `text-[11px]`) are removed so they don't start applying now. `braces` is no longer in the dependency tree, so its `npm audit` exception is removed. Tailwind 4 targets current browsers (Chrome/Edge 111+, Safari 16.4+, Firefox 128+)
- **Amplified loadouts** — Loadouts builds can be amplified to Level 5 on the 15 weapons that support it, with the weapon's amplification options (44 in all, from arcraiders.wiki) picked in the build editor. Requirements and conflicts are enforced in the editor and the API, including options that block the magazine or stock mod slot. Cards show an Amplified badge, the chosen options and the per-gun module and material cost; the Loadouts report adds an Amplified guns tile, the options on each build and an amplification-usage breakdown. New `weapon_amplifications` and `gun_config_amplifications` tables plus `weapons.amp_module` and `gun_configs.amplified` columns are added on startup
- **Bully Fragmenter on ARC Parts** — added as an Epic ARC part (5,000; from the Bully and ARC Courier). It's also a Research Station level 3 requirement, which now shares the ARC Parts count. Existing databases that tracked it as a Workshop material have those counts moved to ARC Parts on startup
- **Workshop: Research Station and Gunsmith level 4** — the Frozen Trail Research Station (levels 1–4) and Gunsmith level 4 (3× Radial Press, 3× Magnetic Accelerator, 1× Emperor Modulator; requires the Outpost) are added with their material requirements and icons. Levels can now carry a note such as "Requires the Outpost", and the progress API checks each station's own max level instead of a fixed 3. Existing databases pick these up on startup
- **Icon retries** — items that got a placeholder icon are now retried on every startup instead of keeping the placeholder forever; the placeholder is removed once a real icon downloads. Previously an item whose image appeared later (e.g. Propellant Valve Assembly) kept its placeholder until a forced re-download
- **Amplification item data** — Propellant Valve Assembly is now Epic, valued at 5,000 and counted in value totals (from RaidersData). Every component shows its weight and stack size. Existing databases gain `weight` and `stack_size` columns on startup
- **Icon fallbacks by URL** — the icon downloader can fall back to a direct image URL when the wiki has no image; Propellant Valve Assembly uses this
- **Amplification** — new sidebar section for the Frozen Trail amplification components: Amplification Modules Mk. I–V and five materials (Fluted Rotor Core, Fossilized Lightning, Pneumatic Actuator, Pressure Regulator, Propellant Valve Assembly), counted per character with value totals. Also an Amplification report tab, a Dashboard card, an amplification count on each character, and an Amplification "last updated" area. New `amplification_components` and `amplification_tracking` tables are created on startup
- **Dashboard** — the separate Blueprint Extras card is folded into the Blueprints card ("in-game · N extras held") to make room for Amplification

### v1.6.0
- **Stencils** *(new)* — sidebar section for the 14 weapon stencils (Legendary to Uncommon). Stencils are found, then learned and crafted, so they're tracked like blueprints: learned + extras per character. Filter by rarity, weapon and status, search by stencil or weapon name, and see which weapons each one fits. Icons come from arcraiders.wiki, falling back to the wiki's generic stencil icon until a stencil's own is uploaded. New `stencils` and `stencil_tracking` tables are created on startup
- **Stencils everywhere else** — Unlearned and Extras reports, a Stencils card and per-character progress on the Dashboard, stencil counts on each character, and a Stencils "last updated" area
- **8 new blueprints** — Bantam, Stiletto (weapons), Yank Grenade (explosives), Advanced Camera, Banjo, Grappling Hook, Tether Launcher (utility) and Emperor Gateway Conduit, under a new **Keys** category. 91 blueprints in total, matching [Arc Blueprint Tracker](https://arcblueprinttracker.io/data/blueprints-grid). Spawn details are `Unknown` where neither source publishes them yet. Existing databases pick them up on startup
- **Stash space per character** — the Characters page tracks stash upgrades (0–11, 24 slots each), Nomad expansions (0–2, 12 each) and expeditions (0–5, 12 each), and shows the character's total stash on top of the 64-slot base (max 412). The API enforces each range. New `normal_stash` and `expedition_stash` columns are added on startup
- **Reports navigation** — seven tabs that wrapped onto two rows become one row of five (Blueprints, Stencils, ARC Parts, Workshop, Loadouts), with an Unlearned / Extras switch for blueprints and stencils and a one-line description of each report. The selected report, view and character are kept in the URL, so refreshes and bookmarks keep your place
- **Last updated per area** — each character shows when it last had activity in Blueprints, Stencils, ARC Parts, Workshop and Loadouts, as "24 Sep 2026 (2 days ago)": beside the character selector on each page, and all together on the Characters page. Derived from the `updated_at` each tracking table already stamps, so it reflects history from before this release. Deletes are the known gap: removing a build leaves no row to stamp, so that area's date doesn't move. Timestamps are served as explicit UTC so the browser doesn't shift them by the viewer's offset
- **Icon downloader** — a mapping can now list several wiki files, using the first that exists

**Security**
- **zlib CVE-2026-85091** (heap buffer overflow) — the production image now runs `apk upgrade` on top of the Node Alpine base, picking up zlib 1.3.2-r1 and any later OS fixes without waiting for a new base image
- **npm audit fixes** — `proxy-addr` (critical, IP spoofing) and `brace-expansion` patched in the backend, `source-map-js` in the frontend. The backend audit now checks production dependencies only, since that's all the image ships; `braces` (GHSA-vfj7-8cjw-p6xm, no patched release, build-time only via Tailwind) is ignored in the frontend audit until a fix ships

**Dependencies**
- Frontend: `@tanstack/react-query` 5.102.8 → 5.104.2, `postcss` 8.5.28 → 8.5.30, `vite` 6.4.3 → 6.4.4
- Lock files refreshed to keep resolved versions in sync with `package.json`

### v1.5.2
- **Readable build cards** — the value block on a Loadouts card read as a sentence fragment ("Weapon 27,000 + mods 22,000 / 49,000 each") with labels and figures at the same weight, next to a properly labelled Total. Each and Total are now parallel labelled figures on one baseline, with the weapon/mod breakdown as a caption beneath. Mod names go from 11px to 14px and slot labels from 9px to 10px, and the build name, empty state and unpriced warning all step up a size

### v1.5.1
- **Build ordering** — builds now sort by weapon name, then by per-gun value high to low, so every build of a weapon sits together with the best one first. Previously they appeared in creation order, which scattered builds of the same weapon as soon as you had a few. Quantity deliberately doesn't affect the order: a one-off top-tier build outranks a stack of base guns worth more in total. The Loadouts page and the Loadouts report use the same ordering

### v1.5.0
- **All 24 weapons** — the weapon list came from the `weapons` blueprints, which covers only the 17 guns that have a blueprint to find. Seven more are unlocked purely by levelling the Gunsmith and had no way into a loadout at all: Hairpin, Ferro, Stitcher, Kettle and Rattler (Gunsmith 1), Arpeggio (Gunsmith 2) and Renegade (Gunsmith 3). All seven now appear, with their wiki sale prices
- **Weapon catalog** — a new `weapons` table holding all 24 with class, rarity and Gunsmith level, cross-referencing a blueprint where one exists. The Blueprints page is unchanged: the seven Gunsmith weapons have no blueprint to learn, so they stay off it
- **Copy to new build** — duplicate an existing build from its card, prefilled with the same weapon, tier, mods and value, then change what differs. Quantity starts at zero and the original is untouched
- **Weapon picker grouped by class** — assault rifles, battle rifles, SMGs, shotguns, pistols, hand cannons, LMGs, snipers and specials, with Gunsmith-unlocked guns labelled
- **Tier disabled for legendaries** — Aphelion, Dolabra, Equalizer and Jupiter can't be upgraded, so the tier field greys out and explains why instead of accepting a meaningless value
- **Database migration** — `gun_configs` and `weapon_prices` move from `blueprint_id` to `weapon_id`. Existing builds are remapped through the catalog, keeping their ids so attached mods follow

### v1.4.1
- **Dashboard: Loadouts** — a Guns stat tile (guns held, with build count and total value), per-character gun counts on the progress cards alongside extras and ARC parts, and a Loadouts quick-nav tile so all five pages are reachable from the Dashboard
- **Reports: mod usage** — which mods are actually in use, grouped by slot and ranked by guns carried rather than builds, so a mod on one build you hold 14 of outranks one on three builds you hold once. Loot-only mods marked ◆, per-slot bars scaled within their slot
- **Summary endpoint** — `/api/reports/summary` now carries per-character `config_count`, `total_guns` and `loadout_value`, so the Dashboard still loads from a single call

### v1.4.0
- **Loadouts** — new side-nav section for tracking specific gun builds per character: a weapon at a tier (I–IV) plus one mod per slot, with a quantity counter and value totals
- **Weapon mod catalog** — 39 mods seeded from [arcraiders.wiki](https://arcraiders.wiki/wiki/Weapon_Mods), a superset of the 25 craftable `mods` blueprints. Adds the tier I mods (craftable at Gunsmith 1, never seeded as blueprints) and the 4 loot-only mods with no blueprint: Silencer III, Horizontal Grip, Kinetic Converter, Anvil Splitter. Craftable mods cross-reference their blueprint row by name, the same way workshop requirements reference ARC parts
- **Slot enforcement** — one mod per muzzle / underbarrel / magazine / stock / tech slot, enforced by a `UNIQUE(config_id, slot)` index rather than in application code. Shotgun chokes occupy the muzzle slot and the three magazine sizes share the magazine slot
- **Seeded prices** — mod sale prices and per-tier weapon sale prices seeded from the individual item pages on [arcraiders.wiki](https://arcraiders.wiki) (the index pages carry none). Choosing a weapon and tier auto-fills its value; any figure can be overridden per build, and re-seeding never overwrites an entered price. Canto's tiers and Extended Medium Mag I are left blank rather than guessed — the wiki has no figures for them
- **Value tracking** — builds show unit value (`weapon + mods`) and `unit × quantity`. Builds with unpriced items are flagged so totals aren't silently understated
- **Reports: Loadouts tab** — builds, guns held and total value per character, with a most-built-weapons breakdown
- **Database migration** — existing databases gain the `weapon_mods`, `gun_configs` and `gun_config_mods` tables on startup; re-seeding preserves user-entered mod prices

**Security**
- **`qs` advisories patched** — `body-parser` 1.20.6 → 1.20.8, which moves to `qs` ~6.16.0 and resolves [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) (array-limit bypass) and [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) (DoS via attacker-controlled `isBuffer`). Both were reachable — `express.json()` and the query parser run on every request. `express@4.22.3` already required the patched `qs`, but `body-parser` pinned the vulnerable one and kept it hoisted
- **Container CVEs cleared** — Node base image bumped to 22.23.2-alpine (undici 6.28.0, patching CVE-2026-15157, CVE-2026-16728 and CVE-2026-16729), and npm removed from the production runner stage, since it is never invoked at runtime but its bundled dependencies (`ip-address`, `brace-expansion`, `tar`) were raising HIGH/MEDIUM Trivy findings with no exploitable surface. Stale `.trivyignore` suppressions dropped

**Dependencies**
- Backend: `compression` 1.7.4 → 1.8.2, `express` 4.22.2 → 4.22.3, `morgan` 1.10.0 → 1.12.0
- Frontend: `@tanstack/react-query` 5.101.4 → 5.102.8, `react-router-dom` 7.18.2 → 7.18.3, `postcss` 8.5.25 → 8.5.28, `autoprefixer` 10.5.4 → 10.5.5
- Lock files refreshed to keep resolved versions in sync with `package.json`

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
