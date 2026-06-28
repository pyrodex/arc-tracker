'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const ICONS_DIR = path.join(DATA_DIR, 'icons');
const STATIC_DIR = path.join(__dirname, '../../frontend/dist');

fs.mkdirSync(ICONS_DIR, { recursive: true });

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet({
  // HSTS is handled by the reverse proxy — setting it on a plain HTTP server
  // causes browsers to upgrade asset requests to HTTPS, breaking the page.
  hsts: false,
  contentSecurityPolicy: {
    // Helmet v7 merges upgrade-insecure-requests into the CSP by default,
    // which forces all assets to HTTPS even on a plain HTTP server.
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      workerSrc: ["'self'", 'blob:'],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
}));

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));

// Disable X-Powered-By (helmet already does this, but explicit)
app.disable('x-powered-by');

// ── Rate limiting ──────────────────────────────────────────────────────────────
// Global limiter — covers every route including /icons and the SPA catch-all.
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// Tighter limit applied on top for mutating API calls.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests, please slow down.' },
});

app.use(readLimiter);
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    writeLimiter(req, res, next);
  } else {
    next();
  }
});

// ── Icons ──────────────────────────────────────────────────────────────────────
app.use('/icons', express.static(ICONS_DIR, {
  maxAge: '7d',
  etag: true,
  fallthrough: true,
}));

// ── API Routes ─────────────────────────────────────────────────────────────────

// Blueprints
app.get('/api/blueprints', (req, res) => {
  const { category, in_game } = req.query;
  let query = 'SELECT * FROM blueprints';
  const params = [];
  const conditions = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (in_game !== undefined) {
    conditions.push('in_game = ?');
    params.push(in_game === 'true' || in_game === '1' ? 1 : 0);
  }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY name COLLATE NOCASE';

  const blueprints = db.prepare(query).all(...params);
  res.json(blueprints);
});

app.get('/api/blueprints/categories', (req, res) => {
  const rows = db.prepare(
    'SELECT category, COUNT(*) as count FROM blueprints GROUP BY category ORDER BY MIN(sort_order)'
  ).all();
  res.json(rows);
});

// Characters
app.get('/api/characters', (req, res) => {
  const characters = db.prepare(
    'SELECT * FROM characters ORDER BY sort_order, created_at'
  ).all();
  res.json(characters);
});

app.post('/api/characters', (req, res) => {
  const { name, label, notes, color, sort_order, nomad_stash } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const result = db.prepare(`
    INSERT INTO characters (name, label, notes, color, sort_order, nomad_stash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    name.trim().slice(0, 64),
    label ? label.trim().slice(0, 32) : null,
    notes ? notes.trim().slice(0, 512) : null,
    /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#3b82f6',
    typeof sort_order === 'number' ? sort_order : 0,
    Number.isInteger(nomad_stash) && nomad_stash >= 0 ? nomad_stash : 0,
  );

  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(character);
});

app.put('/api/characters/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const existing = db.prepare('SELECT id FROM characters WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'character not found' });

  const { name, label, notes, color, sort_order, nomad_stash } = req.body;
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }

  const current = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);

  db.prepare(`
    UPDATE characters SET
      name        = ?,
      label       = ?,
      notes       = ?,
      color       = ?,
      sort_order  = ?,
      nomad_stash = ?
    WHERE id = ?
  `).run(
    name ? name.trim().slice(0, 64) : current.name,
    label !== undefined ? (label ? label.trim().slice(0, 32) : null) : current.label,
    notes !== undefined ? (notes ? notes.trim().slice(0, 512) : null) : current.notes,
    /^#[0-9a-fA-F]{6}$/.test(color) ? color : current.color,
    typeof sort_order === 'number' ? sort_order : current.sort_order,
    Number.isInteger(nomad_stash) && nomad_stash >= 0 ? nomad_stash : current.nomad_stash ?? 0,
    id,
  );

  res.json(db.prepare('SELECT * FROM characters WHERE id = ?').get(id));
});

app.delete('/api/characters/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const result = db.prepare('DELETE FROM characters WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'character not found' });

  res.status(204).end();
});

// Blueprint tracking
app.get('/api/tracking/:characterId', (req, res) => {
  const characterId = parseInt(req.params.characterId, 10);
  if (!characterId) return res.status(400).json({ error: 'invalid characterId' });

  const rows = db.prepare(`
    SELECT bt.*, b.name as blueprint_name, b.slug, b.category
    FROM blueprint_tracking bt
    JOIN blueprints b ON b.id = bt.blueprint_id
    WHERE bt.character_id = ?
  `).all(characterId);

  res.json(rows);
});

app.post('/api/tracking', (req, res) => {
  const { character_id, blueprint_id, learned, extras } = req.body;

  if (!Number.isInteger(character_id) || !Number.isInteger(blueprint_id)) {
    return res.status(400).json({ error: 'character_id and blueprint_id must be integers' });
  }
  if (typeof learned !== 'undefined' && typeof learned !== 'boolean' && learned !== 0 && learned !== 1) {
    return res.status(400).json({ error: 'learned must be boolean or 0/1' });
  }
  if (typeof extras !== 'undefined' && (!Number.isInteger(extras) || extras < 0)) {
    return res.status(400).json({ error: 'extras must be a non-negative integer' });
  }

  const learnedVal = learned ? 1 : 0;
  const extrasVal = Math.min(Math.max(0, extras || 0), 9999);

  db.prepare(`
    INSERT INTO blueprint_tracking (character_id, blueprint_id, learned, extras, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(character_id, blueprint_id) DO UPDATE SET
      learned    = excluded.learned,
      extras     = excluded.extras,
      updated_at = excluded.updated_at
  `).run(character_id, blueprint_id, learnedVal, extrasVal);

  const row = db.prepare(
    'SELECT * FROM blueprint_tracking WHERE character_id = ? AND blueprint_id = ?'
  ).get(character_id, blueprint_id);

  res.json(row);
});

app.post('/api/tracking/batch', (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'updates must be a non-empty array' });
  }
  if (updates.length > 500) {
    return res.status(400).json({ error: 'too many updates (max 500 per batch)' });
  }

  const upsert = db.prepare(`
    INSERT INTO blueprint_tracking (character_id, blueprint_id, learned, extras, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(character_id, blueprint_id) DO UPDATE SET
      learned    = excluded.learned,
      extras     = excluded.extras,
      updated_at = excluded.updated_at
  `);

  const batchUpsert = db.transaction((items) => {
    for (const u of items) {
      if (!Number.isInteger(u.character_id) || !Number.isInteger(u.blueprint_id)) continue;
      upsert.run(
        u.character_id,
        u.blueprint_id,
        u.learned ? 1 : 0,
        Math.min(Math.max(0, u.extras || 0), 9999),
      );
    }
  });

  batchUpsert(updates);
  res.json({ updated: updates.length });
});

// ── Reports ────────────────────────────────────────────────────────────────────
app.get('/api/reports/summary', (req, res) => {
  const totalBlueprints = db.prepare('SELECT COUNT(*) as c FROM blueprints WHERE in_game = 1').get().c;
  const totalCharacters = db.prepare('SELECT COUNT(*) as c FROM characters').get().c;

  const characterStats = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.label,
      c.color,
      COUNT(CASE WHEN bt.learned = 1 THEN 1 END) as learned_count,
      COALESCE(SUM(bt.extras), 0) as total_extras,
      ? as total_blueprints
    FROM characters c
    LEFT JOIN blueprint_tracking bt ON bt.character_id = c.id
    LEFT JOIN blueprints b ON b.id = bt.blueprint_id AND b.in_game = 1
    GROUP BY c.id
    ORDER BY c.sort_order, c.created_at
  `).all(totalBlueprints);

  // Attach ARC parts totals per character
  const arcPartTotals = db.prepare(`
    SELECT character_id, COALESCE(SUM(count), 0) as total_arc_parts
    FROM arc_parts_tracking
    GROUP BY character_id
  `).all();
  const arcByChar = Object.fromEntries(arcPartTotals.map(r => [r.character_id, r.total_arc_parts]));

  const characters = characterStats.map(c => ({
    ...c,
    total_arc_parts: arcByChar[c.id] ?? 0,
  }));

  res.json({ totalBlueprints, totalCharacters, characters });
});

app.get('/api/reports/unlearned', (req, res) => {
  const characters = db.prepare('SELECT * FROM characters ORDER BY sort_order, created_at').all();

  const blueprints = db.prepare(`
    SELECT b.id, b.name, b.slug, b.category, b.map, b.condition
    FROM blueprints b
    WHERE b.in_game = 1
    ORDER BY b.name COLLATE NOCASE
  `).all();

  const allTracking = db.prepare(`
    SELECT character_id, blueprint_id, learned
    FROM blueprint_tracking
    WHERE learned = 1
  `).all();

  const learnedSet = new Set(allTracking.map(t => `${t.character_id}:${t.blueprint_id}`));

  const result = blueprints.map(bp => {
    const charStatus = characters.map(c => ({
      character_id: c.id,
      character_name: c.name,
      character_label: c.label,
      character_color: c.color,
      learned: learnedSet.has(`${c.id}:${bp.id}`),
    }));

    const unlearnedByAny = charStatus.some(cs => !cs.learned);
    const unlearnedCount = charStatus.filter(cs => !cs.learned).length;

    return { ...bp, characters: charStatus, unlearned_count: unlearnedCount, unlearned_by_any: unlearnedByAny };
  });

  res.json(result.filter(bp => bp.unlearned_by_any));
});

app.get('/api/reports/extras', (req, res) => {
  const rows = db.prepare(`
    SELECT
      b.id as blueprint_id,
      b.name as blueprint_name,
      b.slug,
      b.category,
      SUM(bt.extras) as total_extras,
      JSON_GROUP_ARRAY(
        JSON_OBJECT(
          'character_id', c.id,
          'character_name', c.name,
          'character_label', c.label,
          'character_color', c.color,
          'extras', bt.extras
        )
      ) as character_breakdown
    FROM blueprint_tracking bt
    JOIN blueprints b ON b.id = bt.blueprint_id
    JOIN characters c ON c.id = bt.character_id
    WHERE bt.extras > 0
    GROUP BY b.id
    ORDER BY total_extras DESC, b.name
  `).all();

  const result = rows.map(row => ({
    ...row,
    character_breakdown: JSON.parse(row.character_breakdown).filter(c => c.extras > 0),
  }));

  res.json(result);
});

// ── ARC Parts ──────────────────────────────────────────────────────────────────

app.get('/api/arc-parts', (req, res) => {
  const { rarity } = req.query;
  let query = 'SELECT * FROM arc_parts';
  const params = [];

  if (rarity) {
    query += ' WHERE rarity = ?';
    params.push(rarity);
  }
  query += ' ORDER BY sort_order, name COLLATE NOCASE';

  res.json(db.prepare(query).all(...params));
});

app.get('/api/arc-parts/tracking/:characterId', (req, res) => {
  const characterId = parseInt(req.params.characterId, 10);
  if (!characterId) return res.status(400).json({ error: 'invalid characterId' });

  const rows = db.prepare(`
    SELECT apt.*, ap.name as part_name, ap.slug, ap.rarity, ap.source
    FROM arc_parts_tracking apt
    JOIN arc_parts ap ON ap.id = apt.part_id
    WHERE apt.character_id = ?
  `).all(characterId);

  res.json(rows);
});

app.get('/api/reports/arc-parts', (req, res) => {
  const rows = db.prepare(`
    SELECT
      ap.id   as part_id,
      ap.name as part_name,
      ap.slug,
      ap.rarity,
      ap.source,
      SUM(apt.count) as total_count,
      JSON_GROUP_ARRAY(
        JSON_OBJECT(
          'character_id',    c.id,
          'character_name',  c.name,
          'character_label', c.label,
          'character_color', c.color,
          'count',           apt.count
        )
      ) as character_breakdown
    FROM arc_parts_tracking apt
    JOIN arc_parts ap ON ap.id = apt.part_id
    JOIN characters c  ON c.id = apt.character_id
    WHERE apt.count > 0
    GROUP BY ap.id
    ORDER BY ap.sort_order, ap.name
  `).all();

  const result = rows.map(row => ({
    ...row,
    character_breakdown: JSON.parse(row.character_breakdown).filter(cb => cb.count > 0),
  }));

  res.json(result);
});

app.post('/api/arc-parts/tracking', (req, res) => {
  const { character_id, part_id, count } = req.body;

  if (!Number.isInteger(character_id) || !Number.isInteger(part_id)) {
    return res.status(400).json({ error: 'character_id and part_id must be integers' });
  }
  if (!Number.isInteger(count) || count < 0) {
    return res.status(400).json({ error: 'count must be a non-negative integer' });
  }

  const countVal = Math.min(Math.max(0, count), 9999);

  db.prepare(`
    INSERT INTO arc_parts_tracking (character_id, part_id, count, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(character_id, part_id) DO UPDATE SET
      count      = excluded.count,
      updated_at = excluded.updated_at
  `).run(character_id, part_id, countVal);

  const row = db.prepare(
    'SELECT * FROM arc_parts_tracking WHERE character_id = ? AND part_id = ?'
  ).get(character_id, part_id);

  res.json(row);
});

// ── Health / debug ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const bpCount = db.prepare('SELECT COUNT(*) as c FROM blueprints').get().c;
  const charCount = db.prepare('SELECT COUNT(*) as c FROM characters').get().c;
  res.json({
    status: 'ok',
    frontend: fs.existsSync(STATIC_DIR) ? 'present' : 'MISSING',
    static_dir: STATIC_DIR,
    blueprints: bpCount,
    characters: charCount,
    node: process.version,
    uptime_s: Math.floor(process.uptime()),
  });
});

// Trigger a background icon re-download (non-blocking)
let iconDownloadRunning = false;
app.post('/api/icons/refresh', (req, res) => {
  if (iconDownloadRunning) {
    return res.json({ status: 'already_running', message: 'Icon download already in progress.' });
  }
  iconDownloadRunning = true;
  const { spawn } = require('child_process');
  const scriptPath = path.join(__dirname, '../../scripts/download-icons.js');
  const child = spawn(process.execPath, [scriptPath, '--force'], {
    env: { ...process.env, DATA_DIR },
    detached: true,
    stdio: 'inherit',
  });
  child.on('exit', () => { iconDownloadRunning = false; });
  child.unref();
  res.json({ status: 'started', message: 'Icon download started in background.' });
});

// ── Serve frontend ─────────────────────────────────────────────────────────────
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR, { maxAge: '1d', etag: true }));
  app.get('*', (req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ status: 'API running', note: 'Frontend not built yet. Run: cd frontend && npm run build' });
  });
}

// ── Error handling ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ARC Tracker listening on port ${PORT}`);
});
