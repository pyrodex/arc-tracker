#!/usr/bin/env node
'use strict';

/**
 * Downloads blueprint icons from arcraiders.wiki (the canonical ARC Raiders wiki).
 *
 * Strategy:
 * 1. Use an explicit name→file mapping derived from the Blueprints page on arcraiders.wiki,
 *    so every icon points to the exact file the wiki uses.
 * 2. Batch-resolve image URLs via the arcraiders.wiki MediaWiki API (50 titles per call).
 * 3. Download to DATA_DIR/icons/<slug>.png (or .webp when that's the format)
 * 4. SVG placeholder for any not found.
 *
 * A mapping may list several File: titles; the first one the wiki has is used.
 * A candidate can also be a direct https:// image URL, for items the wiki has
 * no image for yet; list it after the wiki title so the wiki wins once added.
 * Stencils rely on this to fall back to the wiki's generic stencil icon until
 * their own icon is uploaded; those stand-ins are retried on every run.
 *
 * Usage:
 *   DATA_DIR=/data node scripts/download-icons.js [--force]
 *
 * --force, or FORCE_ICON_DOWNLOAD=true in the environment, re-downloads every
 * icon instead of only the missing ones.
 */

const https   = require('https');
const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const { URL } = require('url');

const DATA_DIR  = process.env.DATA_DIR || path.join(__dirname, '../data');
const ICONS_DIR = path.join(DATA_DIR, 'icons');
const FORCE_FROM_ENV = /^(1|true|yes|on)$/i.test((process.env.FORCE_ICON_DOWNLOAD ?? '').trim());
const FORCE     = process.argv.includes('--force') || FORCE_FROM_ENV;

const WIKI_API = 'https://arcraiders.wiki/w/api.php';

fs.mkdirSync(ICONS_DIR, { recursive: true });

// ── Explicit blueprint name → wiki File: title mapping ───────────────────────
// Derived from https://arcraiders.wiki/wiki/Blueprints (grid section, June 2026).
// Weapons link to their tier-I item image; everything else matches name exactly.
const NAME_TO_FILE = {
  // Weapons (tiered — wiki uses the first tier image)
  'Anvil':          'File:Anvil I.png',
  'Aphelion':       'File:Aphelion.png',
  'Bantam':         'File:Bantam IV.png',       // wiki only has tier IV image
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
  'Stiletto':       'File:Stiletto IV.png',     // wiki only has tier IV image
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
  'Yank Grenade':    'File:Yank Grenade.png',
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
  'Advanced Camera':     'File:Advanced Camera.png',
  'Banjo':               'File:Banjo.png',
  'Grappling Hook':      'File:Grappling Hook.png',
  'Tether Launcher':     'File:Tether Launcher.png',
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
  // Keys
  'Emperor Gateway Conduit': 'File:Emperor Gateway Conduit.png',
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
  'Bully Fragmenter':    'File:Bully Fragmenter.png',

  // ── Workshop materials ──────────────────────────────────────────────────────
  'ARC Alloy':                        'File:ARC Alloy.png',
  'ARC Circuitry':                    'File:ARC Circuitry.png',
  'ARC Motion Core':                  'File:ARC Motion Core.png',
  'ARC Powercell':                    'File:ARC Powercell.png',
  'Advanced Electrical Components':   'File:Advanced Electrical Components.png',
  'Advanced Mechanical Components':   'File:Advanced Mechanical Components.png',
  'Antiseptic':                       'File:Antiseptic.png',
  'Chemicals':                        'File:Chemicals.png',
  'Cracked Bioscanner':               'File:Cracked Bioscanner.png',
  'Crude Explosives':                 'File:Crude Explosives.png',
  'Damaged Heat Sink':                'File:Damaged Heat Sink.png',
  'Durable Cloth':                    'File:Durable Cloth.png',
  'Electrical Components':            'File:Electrical Components.png',
  'Explosive Compound':               'File:Explosive Compound.png',
  'Fabric':                           'File:Fabric.png',
  'Fireball Burner':                  'File:Fireball Burner.png',
  'Fried Motherboard':                'File:Fried Motherboard.png',
  'Hornet Driver':                    'File:Hornet Driver.png',
  'Industrial Battery':               'File:Industrial Battery.png',
  'Laboratory Reagents':              'File:Laboratory Reagents.png',
  'Mechanical Components':            'File:Mechanical Components.png',
  'Metal Parts':                      'File:Metal Parts.png',
  'Motor':                            'File:Motor.png',
  'Plastic Parts':                    'File:Plastic Parts.png',
  'Pop Trigger':                      'File:Pop Trigger.png',
  'Power Cable':                      'File:Power Cable.png',
  'Rubber Parts':                     'File:Rubber Parts.png',
  'Rusted Gear':                      'File:Rusted Gear.png',
  'Rusted Shut Medical Kit':          'File:Rusted Shut Medical Kit.png',
  'Rusted Tools':                     'File:Rusted Tools.png',
  'Sentinel Firing Core':             'File:Sentinel Firing Core.png',
  'Snitch Scanner':                   'File:Snitch Scanner.png',
  'Surveyor Vault':                   'File:Surveyor Vault.png',
  'Synthesized Fuel':                 'File:Synthesized Fuel.png',
  'Tick Pod':                         'File:Tick Pod.png',
  'Toaster':                          'File:Toaster.png',
  'Wasp Driver':                      'File:Wasp Driver.png',
  // Gunsmith level 4 and Research Station (Frozen Trail)
  'Radial Press':                     'File:Radial Press.png',
  'Magnetic Accelerator':             'File:Magnetic Accelerator.png',
  'Emperor Modulator':                'File:Emperor Modulator.png',
  'Mini Pump':                        'File:Mini Pump.png',
  'Planks':                           'File:Planks.png',
  'Battered Paperback':               'File:Battered Paperback.png',
  'Calculator':                       'File:Calculator.png',
  'Raider Logbook':                   'File:Raider Logbook.png',
  'Skulker Targeter':                 'File:Skulker Targeter.png',
  'Differential Microphone':          'File:Differential Microphone.png',
  'Exodus Technical Handbook':        'File:Exodus Technical Handbook.png',
  'Thermal Shaker':                   'File:Thermal Shaker.png',
  'ARC Data Module':                  'File:ARC Data Module.png',
  'Frigate Inductor':                 'File:Frigate Inductor.png',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Limits for outbound fetches. Icons are small, and the wiki API answers in a
// few hundred KB at most, so anything far beyond that is not a real response.
const MAX_REDIRECTS      = 5;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

function fetchUrl(urlStr, retries = 2, redirectsLeft = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(urlStr);
    } catch (err) {
      return reject(new Error(`Invalid URL: ${urlStr}`));
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return reject(new Error(`Unsupported protocol: ${parsed.protocol}`));
    }
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
        res.resume(); // discard the redirect body so the socket is released
        if (redirectsLeft <= 0) {
          return reject(new Error(`Too many redirects for ${urlStr}`));
        }
        let next;
        try {
          // Location may be relative; resolve it against the current URL.
          next = new URL(res.headers.location, parsed);
        } catch (err) {
          return reject(new Error(`Invalid redirect location from ${urlStr}`));
        }
        if (parsed.protocol === 'https:' && next.protocol !== 'https:') {
          return reject(new Error(`Refusing HTTPS→${next.protocol} redirect from ${urlStr}`));
        }
        return fetchUrl(next.href, retries, redirectsLeft - 1).then(resolve).catch(reject);
      }

      const declared = parseInt(res.headers['content-length'], 10);
      if (declared > MAX_RESPONSE_BYTES) {
        res.destroy();
        return reject(new Error(`Response too large (${declared} bytes) for ${urlStr}`));
      }
      const chunks = [];
      let received = 0;
      res.on('data', c => {
        received += c.length;
        if (received > MAX_RESPONSE_BYTES) {
          res.destroy();
          reject(new Error(`Response exceeded ${MAX_RESPONSE_BYTES} bytes for ${urlStr}`));
          return;
        }
        chunks.push(c);
      });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks), headers: res.headers }));
      res.on('error', reject);
    });

    req.on('error', err => {
      if (retries > 0) fetchUrl(urlStr, retries - 1, redirectsLeft).then(resolve).catch(reject);
      else reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      if (retries > 0) fetchUrl(urlStr, retries - 1, redirectsLeft).then(resolve).catch(reject);
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

// Formats the frontend icon components try, in order.
const IMAGE_EXTS = ['png', 'webp'];

/** Saves the image as <destBase>.png or .webp to match its real format. */
async function downloadImage(url, destBase) {
  const { statusCode, body, headers } = await fetchUrl(url);
  if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
  const ct = headers['content-type'] ?? '';
  if (!ct.startsWith('image/')) throw new Error(`Not an image: ${ct}`);
  if (body.length < 200) throw new Error(`Suspiciously small (${body.length} bytes)`);
  const ext = ct.startsWith('image/webp') ? 'webp' : 'png';
  fs.writeFileSync(`${destBase}.${ext}`, body);
  return ext;
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
  keys:            { bg: '#1a1400', border: '#f59e0b', text: '#f59e0b', emoji: '🔑' },
  crafting:        { bg: '#1a1a00', border: '#eab308', text: '#eab308', emoji: '⚙' },
  'arc-legendary': { bg: '#1a1000', border: '#f59e0b', text: '#f59e0b', emoji: '👑' },
  'arc-epic':      { bg: '#0d0a1a', border: '#a855f7', text: '#a855f7', emoji: '⚡' },
  'workshop-material': { bg: '#001a1f', border: '#38bdf8', text: '#38bdf8', emoji: '⚙' },
  stencil:         { bg: '#1a001a', border: '#d946ef', text: '#d946ef', emoji: '🎨' },
  amplification:   { bg: '#1a1000', border: '#f59e0b', text: '#f59e0b', emoji: '⚡' },
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
const BLUEPRINTS       = require('../backend/src/blueprints');
const STENCILS         = require('../backend/src/stencils');
const AMPLIFICATION_COMPONENTS = require('../backend/src/amplification');
const ARC_PARTS        = require('../backend/src/arc-parts');
const WORKSHOP_STATIONS = require('../backend/src/workshop');

// Stencil icons on the wiki are named "Icon Stencil <Name>.png". Six weapon
// stencils have no wiki image yet, so MetaForge's stencil images (WebP) come
// next, and the wiki's generic stencil icon is the last resort.
const STENCIL_WIKI_NAMES = {
  'Milky Terracotta Stencil': 'Milky Terraccota', // wiki file name is misspelled
};
const METAFORGE_STENCILS = 'https://static.metaforge.app/arc-raiders/ui/stencils';
const STENCIL_IMAGE_FALLBACKS = {
  'Bulwark Stencil':         `${METAFORGE_STENCILS}/bulwark-stencil.webp`,
  "Dragon's Breath Stencil": `${METAFORGE_STENCILS}/dragons-breath-stencil.webp`,
  'Serac Stencil':           `${METAFORGE_STENCILS}/serac-stencil.webp`,
  'Empyrean Stencil':        `${METAFORGE_STENCILS}/empyrean-stencil.webp`,
  'Fortuna Stencil':         `${METAFORGE_STENCILS}/fortuna-stencil.webp`,
  'Sacrifice Stencil':       `${METAFORGE_STENCILS}/sacrifice-stencil.webp`,
};
const GENERIC_STENCIL = 'File:Icon Stencil.png';
for (const s of STENCILS) {
  const base = STENCIL_WIKI_NAMES[s.name] ?? s.name.replace(/\s+Stencil$/i, '');
  const fallback = STENCIL_IMAGE_FALLBACKS[s.name];
  NAME_TO_FILE[s.name] = [`File:Icon Stencil ${base}.png`, ...(fallback ? [fallback] : []), GENERIC_STENCIL];
}

// Generic images used in place of an item's own. An icon saved from one of
// these is marked so later runs keep looking for the real image.
const STAND_INS = new Set([GENERIC_STENCIL]);

// Bump to make existing installs re-check stencil icons once. v2: earlier
// runs saved the generic stencil icon for six stencils without marking it as
// a stand-in, so they'd never have been retried.
const STENCIL_REFRESH_STAMP = '.stencil-icons-v2';
const STENCIL_ITEMS = STENCILS.map(s => ({ name: s.name, category: 'stencil' }));

// Amplification components use their wiki item image, e.g.
// "Amplification Module Mk. III.png". Where the wiki has no image yet, a
// direct URL to the item image used by RaidersData (MetaForge CDN) follows
// as a fallback.
const AMPLIFICATION_IMAGE_FALLBACKS = {
  'Propellant Valve Assembly':
    'https://static.metaforge.app/arc-raiders/preview/20261007/03481be900d013112a858dd034a4cb49a352f30078b505736a387061e72a78a1.png',
};
for (const c of AMPLIFICATION_COMPONENTS) {
  const fallback = AMPLIFICATION_IMAGE_FALLBACKS[c.name];
  NAME_TO_FILE[c.name] = fallback ? [`File:${c.name}.png`, fallback] : `File:${c.name}.png`;
}
const AMPLIFICATION_ITEMS = AMPLIFICATION_COMPONENTS.map(c => ({ name: c.name, category: 'amplification' }));

const isDirectUrl = candidate => candidate.startsWith('https://');

/** File: titles (or direct image URLs) to try for an item, best first. */
function fileCandidates(name) {
  const mapped = NAME_TO_FILE[name];
  if (!mapped) return [];
  return Array.isArray(mapped) ? mapped : [mapped];
}

// Normalise ARC parts to same shape used by blueprint processing
const ARC_PART_ITEMS = ARC_PARTS.map(p => ({ name: p.name, category: `arc-${p.rarity}` }));

// Workshop materials, excluding any that are already Epic ARC parts (e.g.
// Bastion Cell) — those already have an entry above via ARC_PART_ITEMS.
const arcPartNames = new Set(ARC_PARTS.map(p => p.name));
const workshopMaterialNames = new Set();
for (const station of WORKSHOP_STATIONS) {
  for (const { materials } of station.levels) {
    for (const mat of materials) {
      if (!arcPartNames.has(mat.name)) workshopMaterialNames.add(mat.name);
    }
  }
}
const WORKSHOP_MATERIAL_ITEMS = [...workshopMaterialNames].map(name => ({ name, category: 'workshop-material' }));

async function main() {
  console.log('\n🎮 ARC Tracker — Icon Download (arcraiders.wiki)\n');
  console.log(`Icons directory: ${ICONS_DIR}`);
  console.log(`Force re-download: ${FORCE}${FORCE_FROM_ENV ? ' (FORCE_ICON_DOWNLOAD)' : ''}\n`);

  const allItems = [...BLUEPRINTS, ...STENCIL_ITEMS, ...AMPLIFICATION_ITEMS, ...ARC_PART_ITEMS, ...WORKSHOP_MATERIAL_ITEMS];

  // Which items still need icons? Only a downloaded image counts as done: an
  // SVG placeholder means the image wasn't available last time, and a
  // stand-in marker means a generic image is filling in, so both are retried
  // in case the wiki (or a fallback URL) has the real one now. That's one
  // batched API call per startup for whatever is still missing.
  const stampPath = path.join(ICONS_DIR, STENCIL_REFRESH_STAMP);
  const refreshStencils = !fs.existsSync(stampPath);
  const stencilNames = new Set(STENCILS.map(s => s.name));
  const needsIcon = bp => {
    const slug = slugify(bp.name);
    if (refreshStencils && stencilNames.has(bp.name)) return true;
    if (fs.existsSync(path.join(ICONS_DIR, `${slug}.standin`))) return true;
    return !IMAGE_EXTS.some(ext => fs.existsSync(path.join(ICONS_DIR, `${slug}.${ext}`)));
  };
  const pending = FORCE ? allItems : allItems.filter(needsIcon);

  if (pending.length === 0) {
    console.log('✅ All icons already present. Use --force or FORCE_ICON_DOWNLOAD=true to re-download.\n');
    return;
  }

  console.log(`Fetching icons for ${pending.length} item(s)…\n`);

  // Collect the unique File: titles we need to resolve
  const titlesNeeded = [...new Set(
    pending.flatMap(bp => fileCandidates(bp.name)).filter(c => !isDirectUrl(c))
  )];

  const unmapped = pending.filter(bp => fileCandidates(bp.name).length === 0);
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

  fs.writeFileSync(stampPath, new Date().toISOString());

  console.log('\n✅ Done!');
  console.log(`   Downloaded:       ${results.downloaded}`);
  console.log(`   Placeholders:     ${results.placeholder}`);
  if (results.error) console.log(`   Errors:           ${results.error}`);
  console.log();
}

async function processOne(bp, resolvedMap) {
  const slug = slugify(bp.name);
  // Try each available source in order, so a fallback URL that's down falls
  // through to the next one (e.g. the generic stencil icon) instead of
  // straight to an SVG placeholder.
  const sources = fileCandidates(bp.name).filter(c => resolvedMap[c] || isDirectUrl(c));

  for (const fileTitle of sources) {
    const imageUrl = resolvedMap[fileTitle] ?? fileTitle;
    try {
      const ext = await downloadImage(imageUrl, path.join(ICONS_DIR, slug));
      // One icon per item: drop the placeholder and any copy in another format
      // from an earlier run (e.g. a generic .png replaced by a real .webp).
      for (const other of [...IMAGE_EXTS.filter(e => e !== ext), 'svg']) {
        fs.rmSync(path.join(ICONS_DIR, `${slug}.${other}`), { force: true });
      }
      const marker = path.join(ICONS_DIR, `${slug}.standin`);
      if (STAND_INS.has(fileTitle)) {
        fs.writeFileSync(marker, fileTitle);
        return { name: bp.name, status: 'placeholder' };
      }
      fs.rmSync(marker, { force: true });
      return { name: bp.name, status: 'downloaded' };
    } catch (err) {
      console.error(`    ⚠️  Download failed for ${bp.name} (${imageUrl}): ${err.message}`);
    }
  }

  fs.writeFileSync(path.join(ICONS_DIR, `${slug}.svg`), generateSvgPlaceholder(bp.name, bp.category), 'utf8');
  return { name: bp.name, status: 'placeholder' };
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => {
  console.error('[icons] Download failed:', err?.message ?? err);
});
