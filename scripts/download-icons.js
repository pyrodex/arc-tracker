#!/usr/bin/env node
'use strict';

/**
 * Downloads blueprint icons from ARC Raiders wiki sources.
 *
 * Strategy:
 * 1. Query the MediaWiki API on arcraiders.wiki for each blueprint image
 * 2. Download found images to DATA_DIR/icons/<slug>.png
 * 3. For any not found, generate a clean SVG placeholder
 *
 * Usage:
 *   DATA_DIR=/data node scripts/download-icons.js [--force]
 */

const https = require('https');
const http  = require('http');
const path  = require('path');
const fs    = require('fs');
const { URL } = require('url');

const DATA_DIR  = process.env.DATA_DIR || path.join(__dirname, '../data');
const ICONS_DIR = path.join(DATA_DIR, 'icons');
const FORCE     = process.argv.includes('--force');

fs.mkdirSync(ICONS_DIR, { recursive: true });

// ── Helpers ────────────────────────────────────────────────────────────────────
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function fetchUrl(urlStr) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'ARC-Blueprint-Tracker/1.0 (icon downloader; https://github.com/user/arc-blueprint-tracker)',
        Accept: 'application/json,image/*,*/*',
      },
      timeout: 15000,
    };

    const req = lib.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks), headers: res.headers }));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end();
  });
}

async function fetchJson(url) {
  const { statusCode, body } = await fetchUrl(url);
  if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
  return JSON.parse(body.toString());
}

// ── Wiki API image resolution ──────────────────────────────────────────────────
// MediaWiki API: get the direct image URL for a file page title
async function resolveWikiImageUrl(wikiBase, fileTitle) {
  const apiUrl = `${wikiBase}/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&format=json&redirects=1`;
  try {
    const data = await fetchJson(apiUrl);
    const pages = data?.query?.pages ?? {};
    for (const page of Object.values(pages)) {
      const url = page?.imageinfo?.[0]?.url;
      if (url) return url;
    }
  } catch {
    // fall through
  }
  return null;
}

// Various file name patterns the wiki might use
function guessFileNames(name) {
  const titleCase = name.replace(/\b\w/g, c => c.toUpperCase());
  const candidates = [
    `File:Blueprint ${titleCase}.png`,
    `File:Blueprint_${titleCase.replace(/ /g, '_')}.png`,
    `File:${titleCase} Blueprint.png`,
    `File:${titleCase}.png`,
    `File:${titleCase.replace(/ /g, '_')}.png`,
  ];
  return [...new Set(candidates)];
}

async function downloadImage(url, destPath) {
  const { statusCode, body, headers } = await fetchUrl(url);
  if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
  const ct = headers['content-type'] ?? '';
  if (!ct.startsWith('image/')) throw new Error(`Unexpected content-type: ${ct}`);
  fs.writeFileSync(destPath, body);
}

// ── SVG Placeholder ────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  weapons:    { bg: '#1a0a0a', border: '#ef4444', text: '#ef4444', emoji: '🔫' },
  mods:       { bg: '#0a0f1a', border: '#3b82f6', text: '#3b82f6', emoji: '🔧' },
  explosives: { bg: '#1a0d00', border: '#f97316', text: '#f97316', emoji: '💣' },
  medicine:   { bg: '#001a0a', border: '#22c55e', text: '#22c55e', emoji: '💊' },
  augments:   { bg: '#0d001a', border: '#a855f7', text: '#a855f7', emoji: '🧠' },
  utility:    { bg: '#001a1a', border: '#06b6d4', text: '#06b6d4', emoji: '⚡' },
  crafting:   { bg: '#1a1a00', border: '#eab308', text: '#eab308', emoji: '⚙' },
};

function generateSvgPlaceholder(name, category) {
  const c = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.crafting;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="8" fill="${c.bg}" stroke="${c.border}" stroke-width="1.5" stroke-opacity="0.6"/>
  <text x="32" y="26" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="${c.text}" opacity="0.9">${c.emoji}</text>
  <text x="32" y="52" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="${c.text}" opacity="0.8">${initials}</text>
</svg>`;
}

// ── Main ───────────────────────────────────────────────────────────────────────
const WIKI_BASE = 'https://arcraiders.wiki';

// All blueprints (duplicated here so the script runs standalone without DB)
const BLUEPRINTS = require('../backend/src/blueprints');

async function processBlueprint(bp) {
  const slug = slugify(bp.name);
  const destPng = path.join(ICONS_DIR, `${slug}.png`);
  const destSvg = path.join(ICONS_DIR, `${slug}.svg`);

  if (!FORCE && (fs.existsSync(destPng) || fs.existsSync(destSvg))) {
    return { name: bp.name, status: 'skip' };
  }

  const fileNames = guessFileNames(bp.name);
  let downloaded = false;

  for (const fileName of fileNames) {
    try {
      const imgUrl = await resolveWikiImageUrl(WIKI_BASE, fileName);
      if (imgUrl) {
        await downloadImage(imgUrl, destPng);
        downloaded = true;
        return { name: bp.name, status: 'downloaded', url: imgUrl };
      }
    } catch {
      // try next
    }
  }

  if (!downloaded) {
    const svg = generateSvgPlaceholder(bp.name, bp.category);
    fs.writeFileSync(destSvg, svg, 'utf8');
    return { name: bp.name, status: 'placeholder' };
  }
}

async function main() {
  console.log(`\n🎮 ARC Blueprint Tracker — Icon Download\n`);
  console.log(`Icons directory: ${ICONS_DIR}`);
  console.log(`Force re-download: ${FORCE}\n`);

  const CONCURRENCY = 3;
  const results = { downloaded: 0, placeholder: 0, skip: 0, error: 0 };

  // Process in chunks to avoid hammering the wiki
  for (let i = 0; i < BLUEPRINTS.length; i += CONCURRENCY) {
    const chunk = BLUEPRINTS.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map(bp => processBlueprint(bp)));

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const r = result.value;
        results[r.status]++;
        const icon = r.status === 'downloaded' ? '⬇️' : r.status === 'placeholder' ? '🎨' : '⏭️';
        console.log(`  ${icon}  ${r.name}`);
      } else {
        results.error++;
        console.error(`  ❌  Error: ${result.reason?.message}`);
      }
    }

    // Small delay between batches to be polite to the wiki
    if (i + CONCURRENCY < BLUEPRINTS.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Downloaded: ${results.downloaded}`);
  console.log(`   Placeholder SVGs: ${results.placeholder}`);
  console.log(`   Skipped: ${results.skip}`);
  if (results.error > 0) console.log(`   Errors: ${results.error}`);
  console.log();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
