#!/usr/bin/env node
'use strict';

/**
 * Downloads blueprint icons from arcraiders.wiki (the canonical ARC Raiders wiki).
 *
 * Strategy:
 * 1. Use an explicit name→file mapping derived from the Blueprints page on arcraiders.wiki,
 *    so every icon points to the exact file the wiki uses.
 * 2. Batch-resolve image URLs via the arcraiders.wiki MediaWiki API (50 titles per call).
 * 3. Download to DATA_DIR/icons/<slug>.png
 * 4. SVG placeholder for any not found.
 *
 * Usage:
 *   DATA_DIR=/data node scripts/download-icons.js [--force]
 */

const https   = require('https');
const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const { URL } = require('url');

const DATA_DIR  = process.env.DATA_DIR || path.join(__dirname, '../data');
const ICONS_DIR = path.join(DATA_DIR, 'icons');
const FORCE     = process.argv.includes('--force');

const WIKI_API = 'https://arcraiders.wiki/w/api.php';

fs.mkdirSync(ICONS_DIR, { recursive: true });

// ── Explicit blueprint name → wiki File: title mapping ───────────────────────
// Derived from https://arcraiders.wiki/wiki/Blueprints (grid section, June 2026).
// Weapons link to their tier-I item image; everything else matches name exactly.
const NAME_TO_FILE = {
  // Weapons (tiered — wiki uses the first tier image)
  'Anvil':          'File:Anvil I.png',
  'Aphelion':       'File:Aphelion.png',
  'Bettina':        'File:Bettina I.png',
  'Bobcat':         'File:Bobcat I.png',
  'Burletta':       'File:Burletta I.png',
  'Canto':          'File:Canto I.png',
  'Deadline':       'File:Deadline.png',
  'Dolabra':        'File:Dolabra.png',
  'Equalizer':      'File:Equalizer.png',
  'Hullcracker':    'File:Hullcracker I.png',
  'Il Toro':        'File:Il Toro I.png',
  'Jupiter':        'File:Jupiter.png',
  'Osprey':         'File:Osprey I.png',
  'Rascal':         'File:Rascal II.png',       // wiki starts at II for Rascal
  'Tempest':        'File:Tempest I.png',
  'Torrente':       'File:Torrente I.png',
  'Trailblazer':    'File:Trailblazer.png',
  'Venator':        'File:Venator I.png',
  'Vulcano':        'File:Vulcano I.png',
  // Mods
  'Angled Grip II':           'File:Angled Grip II.png',
  'Angled Grip III':          'File:Angled Grip III.png',
  'Compensator II':           'File:Compensator II.png',
  'Compensator III':          'File:Compensator III.png',
  'Extended Barrel II':       'File:Extended Barrel II.png',
  'Extended Barrel III':      'File:Extended Barrel III.png',
  'Extended Light Mag II':    'File:Extended Light Mag II.png',
  'Extended Light Mag III':   'File:Extended Light Mag III.png',
  'Extended Medium Mag II':   'File:Extended Medium Mag II.png',
  'Extended Medium Mag III':  'File:Extended Medium Mag III.png',
  'Extended Shotgun Mag II':  'File:Extended Shotgun Mag II.png',
  'Extended Shotgun Mag III': 'File:Extended Shotgun Mag III.png',
  'Lightweight Stock':        'File:Lightweight Stock.png',
  'Muzzle Brake II':          'File:Muzzle Brake II.png',
  'Muzzle Brake III':         'File:Muzzle Brake III.png',
  'Padded Stock':             'File:Padded Stock.png',
  'Shotgun Choke II':         'File:Shotgun Choke II.png',
  'Shotgun Choke III':        'File:Shotgun Choke III.png',
  'Shotgun Silencer':         'File:Shotgun Silencer.png',
  'Silencer I':               'File:Silencer I.png',
  'Silencer II':              'File:Silencer II.png',
  'Stable Stock II':          'File:Stable Stock II.png',
  'Stable Stock III':         'File:Stable Stock III.png',
  'Vertical Grip II':         'File:Vertical Grip II.png',
  'Vertical Grip III':        'File:Vertical Grip III.png',
  // Explosives
  'Blaze Grenade':   'File:Blaze Grenade.png',
  'Explosive Mine':  'File:Explosive Mine.png',
  'Gas Mine':        'File:Gas Mine.png',
  'Jolt Mine':       'File:Jolt Mine.png',
  'Lure Grenade':    'File:Lure Grenade.png',
  'Pulse Mine':      'File:Pulse Mine.png',
  'Seeker Grenade':  'File:Seeker Grenade.png',
  'Showstopper':     'File:Showstopper.png',
  'Smoke Grenade':   'File:Smoke Grenade.png',
  "Trigger 'Nade":   "File:Trigger 'Nade.png",
  'Wolfpack':        'File:Wolfpack.png',
  // Medicine
  'Defibrillator':  'File:Defibrillator.png',
  'Vita Shot':      'File:Vita Shot.png',
  'Vita Spray':     'File:Vita Spray.png',
  // Augments
  'Combat Mk. 3 (Aggressive)':   'File:Combat Mk. 3 (Aggressive).png',
  'Combat Mk. 3 (Flanking)':     'File:Combat Mk. 3 (Flanking).png',
  'Looting Mk. 3 (Safekeeper)':  'File:Looting Mk. 3 (Safekeeper).png',
  'Looting Mk. 3 (Survivor)':    'File:Looting Mk. 3 (Survivor).png',
  'Tactical Mk. 3 (Defensive)':  'File:Tactical Mk. 3 (Defensive).png',
  'Tactical Mk. 3 (Healing)':    'File:Tactical Mk. 3 (Healing).png',
  'Tactical Mk. 3 (Revival)':    'File:Tactical Mk. 3 (Revival).png',
  'Tactical Mk. 3 (Smoke)':      'File:Tactical Mk. 3 (Smoke).png',
  // Utility
  'Barricade Kit':       'File:Barricade Kit.png',
  'Blue Light Stick':    'File:Blue Light Stick.png',
  'Crash Mat':           'File:Crash Mat.png',
  'Fireworks Box':       'File:Fireworks Box.png',
  'Green Light Stick':   'File:Green Light Stick.png',
  'Powered Descender':   'File:Powered Descender.png',
  'Red Light Stick':     'File:Red Light Stick.png',
  'Remote Raider Flare': 'File:Remote Raider Flare.png',
  'Snap Hook':           'File:Snap Hook.png',
  'Surge Coil':          'File:Surge Coil.png',
  'Tagging Grenade':     'File:Tagging Grenade.png',
  'White Flag':          'File:White Flag.png',
  'Yellow Light Stick':  'File:Yellow Light Stick.png',
  // Crafting components
  'Complex Gun Parts': 'File:Complex Gun Parts.png',
  'Heavy Gun Parts':   'File:Heavy Gun Parts.png',
  'Light Gun Parts':   'File:Light Gun Parts.png',
  'Medium Gun Parts':  'File:Medium Gun Parts.png',

  // ── ARC Parts (Epic / Legendary drops) ──────────────────────────────────────
  'Queen Reactor':       'File:Queen Reactor.png',
  'Matriarch Reactor':   'File:Matriarch Reactor.png',
  'Bastion Cell':        'File:Bastion Cell.png',
  'Bombardier Cell':     'File:Bombardier Cell.png',
  'Leaper Pulse Unit':   'File:Leaper Pulse Unit.png',
  'Rocketeer Driver':    'File:Rocketeer Driver.png',
  'Vaporizer Regulator': 'File:Vaporizer Regulator.png',
  'Turbine Compressor':  'File:Turbine Compressor.png',
  'Assessor Matrix':     'File:Assessor Matrix.png',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function fetchUrl(urlStr, retries = 2) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(urlStr);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      headers:  {
        'User-Agent': 'ARC-Tracker/1.1 (icon downloader; https://github.com/pyrodex/arc-tracker)',
        Accept: 'application/json,image/*,*/*',
      },
      timeout: 20000,
    };

    const req = lib.request(options, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, retries).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks), headers: res.headers }));
    });

    req.on('error', err => {
      if (retries > 0) fetchUrl(urlStr, retries - 1).then(resolve).catch(reject);
      else reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      if (retries > 0) fetchUrl(urlStr, retries - 1).then(resolve).catch(reject);
      else reject(new Error('Request timed out'));
    });
    req.end();
  });
}

async function fetchJson(url) {
  const { statusCode, body } = await fetchUrl(url);
  if (statusCode !== 200) throw new Error(`HTTP ${statusCode} for ${url}`);
  return JSON.parse(body.toString());
}

async function downloadImage(url, destPath) {
  const { statusCode, body, headers } = await fetchUrl(url);
  if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
  const ct = headers['content-type'] ?? '';
  if (!ct.startsWith('image/')) throw new Error(`Not an image: ${ct}`);
  if (body.length < 200) throw new Error(`Suspiciously small (${body.length} bytes)`);
  fs.writeFileSync(destPath, body);
}

// ── MediaWiki batch image resolution ──────────────────────────────────────────
// Returns map: normalised file title → direct image URL
async function batchResolveImages(titles) {
  const params = new URLSearchParams({
    action: 'query',
    prop:   'imageinfo',
    iiprop: 'url',
    format: 'json',
    titles: titles.join('|'),
  });

  const data     = await fetchJson(`${WIKI_API}?${params}`);
  const resolved = {};

  for (const page of Object.values(data?.query?.pages ?? {})) {
    if (page.missing === undefined && page.imageinfo?.[0]?.url) {
      resolved[page.title] = page.imageinfo[0].url;
    }
  }

  // Apply title normalisations (spaces ↔ underscores, capitalisation)
  for (const norm of (data?.query?.normalized ?? [])) {
    if (resolved[norm.to] && !resolved[norm.from]) {
      resolved[norm.from] = resolved[norm.to];
    }
  }

  return resolved;
}

// ── SVG placeholder ────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  weapons:         { bg: '#1a0a0a', border: '#ef4444', text: '#ef4444', emoji: '🔫' },
  mods:            { bg: '#0a0f1a', border: '#3b82f6', text: '#3b82f6', emoji: '🔧' },
  explosives:      { bg: '#1a0d00', border: '#f97316', text: '#f97316', emoji: '💣' },
  medicine:        { bg: '#001a0a', border: '#22c55e', text: '#22c55e', emoji: '💊' },
  augments:        { bg: '#0d001a', border: '#a855f7', text: '#a855f7', emoji: '🧠' },
  utility:         { bg: '#001a1a', border: '#06b6d4', text: '#06b6d4', emoji: '⚡' },
  crafting:        { bg: '#1a1a00', border: '#eab308', text: '#eab308', emoji: '⚙' },
  'arc-legendary': { bg: '#1a1000', border: '#f59e0b', text: '#f59e0b', emoji: '👑' },
  'arc-epic':      { bg: '#0d0a1a', border: '#a855f7', text: '#a855f7', emoji: '⚡' },
};

function generateSvgPlaceholder(name, category) {
  const c        = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.crafting;
  const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="8" fill="${c.bg}" stroke="${c.border}" stroke-width="1.5" stroke-opacity="0.6"/>
  <text x="32" y="26" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="${c.text}" opacity="0.9">${c.emoji}</text>
  <text x="32" y="52" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="${c.text}" opacity="0.8">${initials}</text>
</svg>`;
}

// ── Main ───────────────────────────────────────────────────────────────────────
const BLUEPRINTS = require('../backend/src/blueprints');
const ARC_PARTS  = require('../backend/src/arc-parts');

// Normalise ARC parts to same shape used by blueprint processing
const ARC_PART_ITEMS = ARC_PARTS.map(p => ({ name: p.name, category: `arc-${p.rarity}` }));

async function main() {
  console.log('\n🎮 ARC Tracker — Icon Download (arcraiders.wiki)\n');
  console.log(`Icons directory: ${ICONS_DIR}`);
  console.log(`Force re-download: ${FORCE}\n`);

  const allItems = [...BLUEPRINTS, ...ARC_PART_ITEMS];

  // Which items still need icons?
  const pending = FORCE
    ? allItems
    : allItems.filter(bp => {
        const slug = slugify(bp.name);
        return !fs.existsSync(path.join(ICONS_DIR, `${slug}.png`))
            && !fs.existsSync(path.join(ICONS_DIR, `${slug}.svg`));
      });

  if (pending.length === 0) {
    console.log('✅ All icons already present. Use --force to re-download.\n');
    return;
  }
  console.log(`Fetching icons for ${pending.length} item(s)…\n`);

  // Collect the unique File: titles we need to resolve
  const titlesNeeded = [...new Set(
    pending.map(bp => NAME_TO_FILE[bp.name]).filter(Boolean)
  )];

  const unmapped = pending.filter(bp => !NAME_TO_FILE[bp.name]);
  if (unmapped.length) {
    console.warn(`⚠️  No wiki mapping for: ${unmapped.map(b => b.name).join(', ')}\n`);
  }

  // Batch-resolve via MediaWiki API (50 per call)
  const resolvedMap = {};
  const BATCH = 50;
  for (let i = 0; i < titlesNeeded.length; i += BATCH) {
    const chunk = titlesNeeded.slice(i, i + BATCH);
    try {
      Object.assign(resolvedMap, await batchResolveImages(chunk));
    } catch (err) {
      console.error(`  ⚠️  API batch failed: ${err.message}`);
    }
    if (i + BATCH < titlesNeeded.length) await delay(400);
  }

  // Download images
  const results   = { downloaded: 0, placeholder: 0, error: 0 };
  const CONCURRENCY = 4;

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const chunk   = pending.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map(bp => processOne(bp, resolvedMap)));

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const r    = result.value;
        results[r.status]++;
        const icon = r.status === 'downloaded' ? '⬇️ ' : r.status === 'placeholder' ? '🎨' : '❌';
        console.log(`  ${icon}  ${r.name}`);
      } else {
        results.error++;
        console.error(`  ❌  ${result.reason?.message}`);
      }
    }

    if (i + CONCURRENCY < pending.length) await delay(150);
  }

  console.log('\n✅ Done!');
  console.log(`   Downloaded:       ${results.downloaded}`);
  console.log(`   Placeholder SVGs: ${results.placeholder}`);
  if (results.error) console.log(`   Errors:           ${results.error}`);
  console.log();
}

async function processOne(bp, resolvedMap) {
  const slug     = slugify(bp.name);
  const fileTitle = NAME_TO_FILE[bp.name];
  const imageUrl  = fileTitle ? resolvedMap[fileTitle] : null;

  if (imageUrl) {
    const dest = path.join(ICONS_DIR, `${slug}.png`);
    try {
      await downloadImage(imageUrl, dest);
      return { name: bp.name, status: 'downloaded' };
    } catch (err) {
      console.error(`    ⚠️  Download failed for ${bp.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(path.join(ICONS_DIR, `${slug}.svg`), generateSvgPlaceholder(bp.name, bp.category), 'utf8');
  return { name: bp.name, status: 'placeholder' };
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => {
  console.error('[icons] Download failed:', err?.message ?? err);
});
