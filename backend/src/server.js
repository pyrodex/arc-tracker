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

function parseParentId(value) {
  if (value === null || value === undefined || value === '') return null;
  const id = parseInt(value, 10);
  return id > 0 ? id : null;
}

function validateParentId(parentId, characterId) {
  if (parentId === null) return null;

  if (characterId && parentId === characterId) {
    return 'a character cannot be its own parent';
  }

  const parent = db.prepare('SELECT id, parent_id FROM characters WHERE id = ?').get(parentId);
  if (!parent) return 'parent character not found';
  if (parent.parent_id !== null) return 'parent must be a top-level character';

  if (characterId) {
    const hasChildren = db.prepare(
      'SELECT 1 FROM characters WHERE parent_id = ? LIMIT 1'
    ).get(characterId);
    if (hasChildren) return 'characters with children must remain top-level';
  }

  return null;
}

app.get('/api/characters', (req, res) => {
  const characters = db.prepare(
    'SELECT * FROM characters ORDER BY sort_order, created_at'
  ).all();
  res.json(characters);
});

app.post('/api/characters', (req, res) => {
  const { name, label, notes, color, sort_order, nomad_stash, parent_id } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const parsedParentId = parseParentId(parent_id);
  const parentError = validateParentId(parsedParentId, null);
  if (parentError) return res.status(400).json({ error: parentError });

  const result = db.prepare(`
    INSERT INTO characters (name, label, notes, color, sort_order, nomad_stash, parent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim().slice(0, 64),
    label ? label.trim().slice(0, 32) : null,
    notes ? notes.trim().slice(0, 512) : null,
    /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#3b82f6',
    typeof sort_order === 'number' ? sort_order : 0,
    Number.isInteger(nomad_stash) && nomad_stash >= 0 ? nomad_stash : 0,
    parsedParentId,
  );

  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(character);
});

app.put('/api/characters/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const existing = db.prepare('SELECT id FROM characters WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'character not found' });

  const { name, label, notes, color, sort_order, nomad_stash, parent_id } = req.body;
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }

  const current = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);

  const parsedParentId = parent_id !== undefined ? parseParentId(parent_id) : current.parent_id;
  const parentError = validateParentId(parsedParentId, id);
  if (parentError) return res.status(400).json({ error: parentError });

  db.prepare(`
    UPDATE characters SET
      name        = ?,
      label       = ?,
      notes       = ?,
      color       = ?,
      sort_order  = ?,
      nomad_stash = ?,
      parent_id   = ?
    WHERE id = ?
  `).run(
    name ? name.trim().slice(0, 64) : current.name,
    label !== undefined ? (label ? label.trim().slice(0, 32) : null) : current.label,
    notes !== undefined ? (notes ? notes.trim().slice(0, 512) : null) : current.notes,
    /^#[0-9a-fA-F]{6}$/.test(color) ? color : current.color,
    typeof sort_order === 'number' ? sort_order : current.sort_order,
    Number.isInteger(nomad_stash) && nomad_stash >= 0 ? nomad_stash : current.nomad_stash ?? 0,
    parsedParentId,
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

  // Attach ARC parts totals + value per character
  const arcPartTotals = db.prepare(`
    SELECT
      apt.character_id,
      COALESCE(SUM(apt.count), 0)                       as total_arc_parts,
      COALESCE(SUM(apt.count * ap.sell_value), 0)       as arc_parts_value
    FROM arc_parts_tracking apt
    JOIN arc_parts ap ON ap.id = apt.part_id
    GROUP BY apt.character_id
  `).all();
  const arcByChar = Object.fromEntries(
    arcPartTotals.map(r => [r.character_id, { total_arc_parts: r.total_arc_parts, arc_parts_value: r.arc_parts_value }])
  );

  const characters = characterStats.map(c => ({
    ...c,
    total_arc_parts:  arcByChar[c.id]?.total_arc_parts  ?? 0,
    arc_parts_value:  arcByChar[c.id]?.arc_parts_value  ?? 0,
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
      ap.id         as part_id,
      ap.name       as part_name,
      ap.slug,
      ap.rarity,
      ap.source,
      ap.sell_value,
      SUM(apt.count)                     as total_count,
      SUM(apt.count) * ap.sell_value     as total_value,
      JSON_GROUP_ARRAY(
        JSON_OBJECT(
          'character_id',    c.id,
          'character_name',  c.name,
          'character_label', c.label,
          'character_color', c.color,
          'count',           apt.count,
          'value',           apt.count * ap.sell_value
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

// ── Workshop ───────────────────────────────────────────────────────────────────

app.get('/api/workshop/stations', (req, res) => {
  const stations = db.prepare('SELECT * FROM workshop_stations ORDER BY sort_order, name COLLATE NOCASE').all();

  const requirements = db.prepare(`
    SELECT
      r.station_id, r.level, r.item_type, r.item_id, r.qty_required, r.sort_order,
      CASE WHEN r.item_type = 'arc_part' THEN ap.name ELSE wm.name END as item_name,
      CASE WHEN r.item_type = 'arc_part' THEN ap.slug ELSE wm.slug END as item_slug,
      ap.rarity as item_rarity,
      ap.source as item_source
    FROM workshop_requirements r
    LEFT JOIN arc_parts ap ON r.item_type = 'arc_part' AND ap.id = r.item_id
    LEFT JOIN workshop_materials wm ON r.item_type = 'material' AND wm.id = r.item_id
    ORDER BY r.station_id, r.level, r.sort_order
  `).all();

  const result = stations.map(station => {
    const stationReqs = requirements.filter(r => r.station_id === station.id);
    const levels = [...new Set(stationReqs.map(r => r.level))]
      .sort((a, b) => a - b)
      .map(level => ({
        level,
        requirements: stationReqs
          .filter(r => r.level === level)
          .map(r => ({
            item_type: r.item_type,
            item_id: r.item_id,
            name: r.item_name,
            slug: r.item_slug,
            rarity: r.item_rarity,
            source: r.item_source,
            qty_required: r.qty_required,
          })),
      }));
    return { ...station, levels };
  });

  res.json(result);
});

app.get('/api/workshop/progress/:characterId', (req, res) => {
  const characterId = parseInt(req.params.characterId, 10);
  if (!characterId) return res.status(400).json({ error: 'invalid characterId' });

  const rows = db.prepare(
    'SELECT station_id, level FROM workshop_station_progress WHERE character_id = ?'
  ).all(characterId);

  res.json(rows);
});

app.post('/api/workshop/progress', (req, res) => {
  const { character_id, station_id, level } = req.body;

  if (!Number.isInteger(character_id) || !Number.isInteger(station_id)) {
    return res.status(400).json({ error: 'character_id and station_id must be integers' });
  }
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    return res.status(400).json({ error: 'level must be an integer between 0 and 3' });
  }

  db.prepare(`
    INSERT INTO workshop_station_progress (character_id, station_id, level, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(character_id, station_id) DO UPDATE SET
      level      = excluded.level,
      updated_at = excluded.updated_at
  `).run(character_id, station_id, level);

  const row = db.prepare(
    'SELECT * FROM workshop_station_progress WHERE character_id = ? AND station_id = ?'
  ).get(character_id, station_id);

  res.json(row);
});

app.get('/api/workshop/materials/tracking/:characterId', (req, res) => {
  const characterId = parseInt(req.params.characterId, 10);
  if (!characterId) return res.status(400).json({ error: 'invalid characterId' });

  const rows = db.prepare(`
    SELECT wmt.*, wm.name as material_name, wm.slug
    FROM workshop_material_tracking wmt
    JOIN workshop_materials wm ON wm.id = wmt.material_id
    WHERE wmt.character_id = ?
  `).all(characterId);

  res.json(rows);
});

app.post('/api/workshop/materials/tracking', (req, res) => {
  const { character_id, material_id, count } = req.body;

  if (!Number.isInteger(character_id) || !Number.isInteger(material_id)) {
    return res.status(400).json({ error: 'character_id and material_id must be integers' });
  }
  if (!Number.isInteger(count) || count < 0) {
    return res.status(400).json({ error: 'count must be a non-negative integer' });
  }

  const countVal = Math.min(Math.max(0, count), 9999);

  db.prepare(`
    INSERT INTO workshop_material_tracking (character_id, material_id, count, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(character_id, material_id) DO UPDATE SET
      count      = excluded.count,
      updated_at = excluded.updated_at
  `).run(character_id, material_id, countVal);

  const row = db.prepare(
    'SELECT * FROM workshop_material_tracking WHERE character_id = ? AND material_id = ?'
  ).get(character_id, material_id);

  res.json(row);
});

app.get('/api/reports/workshop-materials', (req, res) => {
  const rows = db.prepare(`
    SELECT
      wm.id as material_id,
      wm.name as material_name,
      wm.slug,
      SUM(wmt.count) as total_count,
      JSON_GROUP_ARRAY(
        JSON_OBJECT(
          'character_id',    c.id,
          'character_name',  c.name,
          'character_label', c.label,
          'character_color', c.color,
          'count',           wmt.count
        )
      ) as character_breakdown
    FROM workshop_material_tracking wmt
    JOIN workshop_materials wm ON wm.id = wmt.material_id
    JOIN characters c ON c.id = wmt.character_id
    WHERE wmt.count > 0
    GROUP BY wm.id
    ORDER BY wm.name COLLATE NOCASE
  `).all();

  const result = rows.map(row => ({
    ...row,
    character_breakdown: JSON.parse(row.character_breakdown).filter(cb => cb.count > 0),
  }));

  res.json(result);
});

// ── Gun configurations ─────────────────────────────────────────────────────────

const { MOD_SLOTS } = require('./weapon-mods');
const VALID_SLOTS = new Set(MOD_SLOTS.map(s => s.slot));

// Mod catalog. Craftable mods carry their blueprint id so the UI can link a mod
// back to the blueprint page; loot-only mods have blueprint_id = null.
app.get('/api/weapon-mods', (req, res) => {
  const mods = db.prepare(`
    SELECT wm.*, b.slug as blueprint_slug
    FROM weapon_mods wm
    LEFT JOIN blueprints b ON b.id = wm.blueprint_id
    ORDER BY wm.sort_order, wm.name COLLATE NOCASE
  `).all();

  res.json({ slots: MOD_SLOTS, mods });
});

// Mod prices are user-entered — no published source lists them.
app.put('/api/weapon-mods/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const { sell_value } = req.body;
  if (!Number.isInteger(sell_value) || sell_value < 0) {
    return res.status(400).json({ error: 'sell_value must be a non-negative integer' });
  }

  const result = db.prepare('UPDATE weapon_mods SET sell_value = ? WHERE id = ?')
    .run(Math.min(sell_value, 9_999_999), id);
  if (result.changes === 0) return res.status(404).json({ error: 'mod not found' });

  res.json(db.prepare('SELECT * FROM weapon_mods WHERE id = ?').get(id));
});

// Assembles a config with its mods and the derived value figures. unit_value is
// the weapon plus its mods; total_value multiplies that by the quantity held.
function loadConfig(id) {
  const config = db.prepare(`
    SELECT gc.*, b.name as weapon_name, b.slug as weapon_slug
    FROM gun_configs gc
    JOIN blueprints b ON b.id = gc.blueprint_id
    WHERE gc.id = ?
  `).get(id);
  if (!config) return null;

  const mods = db.prepare(`
    SELECT wm.id, wm.name, wm.slug, wm.slot, wm.variant, wm.craftable, wm.sell_value
    FROM gun_config_mods gcm
    JOIN weapon_mods wm ON wm.id = gcm.mod_id
    WHERE gcm.config_id = ?
    ORDER BY wm.sort_order
  `).all(id);

  const modsValue = mods.reduce((sum, m) => sum + (m.sell_value || 0), 0);
  const unitValue = (config.weapon_value || 0) + modsValue;

  return {
    ...config,
    mods,
    mods_value: modsValue,
    unit_value: unitValue,
    total_value: unitValue * (config.quantity || 0),
    // What the wiki says this weapon sells for at this tier, so the UI can
    // show when a build's stored value has been overridden. null when the
    // wiki has no figure (Canto).
    catalog_weapon_value: seededWeaponValue(config.blueprint_id, config.tier),
  };
}

// Validates a requested mod set: every id must exist, and no two mods may
// occupy the same slot. Returns { error } or { rows } ready to insert.
function resolveMods(modIds) {
  if (modIds === undefined) return { rows: null };
  if (!Array.isArray(modIds)) return { error: 'mod_ids must be an array' };
  if (modIds.length > VALID_SLOTS.size) {
    return { error: `a gun has ${VALID_SLOTS.size} mod slots, got ${modIds.length} mods` };
  }

  const rows = [];
  const seenSlots = new Map();

  for (const rawId of modIds) {
    if (!Number.isInteger(rawId)) return { error: 'mod_ids must contain integers' };

    const mod = db.prepare('SELECT id, name, slot FROM weapon_mods WHERE id = ?').get(rawId);
    if (!mod) return { error: `mod ${rawId} not found` };

    if (seenSlots.has(mod.slot)) {
      return { error: `two mods in the ${mod.slot} slot: ${seenSlots.get(mod.slot)} and ${mod.name}` };
    }
    seenSlots.set(mod.slot, mod.name);
    rows.push({ mod_id: mod.id, slot: mod.slot });
  }

  return { rows };
}

// Seeded weapon prices, keyed for the UI as { [blueprintId]: { [tier]: value } }
// with tier 0 meaning the weapon cannot be upgraded.
app.get('/api/weapon-prices', (req, res) => {
  const rows = db.prepare(`
    SELECT wp.blueprint_id, wp.tier, wp.sell_value, b.name as weapon_name
    FROM weapon_prices wp
    JOIN blueprints b ON b.id = wp.blueprint_id
    ORDER BY b.name COLLATE NOCASE, wp.tier
  `).all();

  const byWeapon = {};
  for (const row of rows) {
    (byWeapon[row.blueprint_id] ??= {})[row.tier] = row.sell_value;
  }

  res.json({ prices: byWeapon, rows });
});

// The seeded price for a weapon at a tier, or null when unknown (Canto has no
// per-tier breakdown on the wiki, so it has no rows).
function seededWeaponValue(blueprintId, tier) {
  const row = db.prepare(
    'SELECT sell_value FROM weapon_prices WHERE blueprint_id = ? AND tier = ?'
  ).get(blueprintId, tier ?? 0);
  return row ? row.sell_value : null;
}

function validateWeapon(blueprintId) {
  const weapon = db.prepare("SELECT id FROM blueprints WHERE id = ? AND category = 'weapons'").get(blueprintId);
  return weapon ? null : 'blueprint_id must reference a weapon blueprint';
}

app.get('/api/gun-configs/:characterId', (req, res) => {
  const characterId = parseInt(req.params.characterId, 10);
  if (!characterId) return res.status(400).json({ error: 'invalid characterId' });

  const ids = db.prepare(
    'SELECT id FROM gun_configs WHERE character_id = ? ORDER BY created_at, id'
  ).all(characterId);

  res.json(ids.map(r => loadConfig(r.id)));
});

app.post('/api/gun-configs', (req, res) => {
  const { character_id, blueprint_id, name, tier, quantity, weapon_value, notes, mod_ids } = req.body;

  if (!Number.isInteger(character_id) || !Number.isInteger(blueprint_id)) {
    return res.status(400).json({ error: 'character_id and blueprint_id must be integers' });
  }
  if (!db.prepare('SELECT 1 FROM characters WHERE id = ?').get(character_id)) {
    return res.status(404).json({ error: 'character not found' });
  }

  const weaponError = validateWeapon(blueprint_id);
  if (weaponError) return res.status(400).json({ error: weaponError });

  if (tier !== undefined && tier !== null && (!Number.isInteger(tier) || tier < 1 || tier > 4)) {
    return res.status(400).json({ error: 'tier must be null or an integer between 1 and 4' });
  }

  const { rows: modRows, error: modError } = resolveMods(mod_ids);
  if (modError) return res.status(400).json({ error: modError });

  // Omitting weapon_value falls back to the seeded price for this weapon and
  // tier; passing one (including 0) is an explicit override and is kept as-is.
  const resolvedWeaponValue = weapon_value !== undefined
    ? weapon_value
    : (seededWeaponValue(blueprint_id, tier) ?? 0);

  const insertConfig = db.prepare(`
    INSERT INTO gun_configs (character_id, blueprint_id, name, tier, quantity, weapon_value, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMod = db.prepare('INSERT INTO gun_config_mods (config_id, mod_id, slot) VALUES (?, ?, ?)');

  const create = db.transaction(() => {
    const result = insertConfig.run(
      character_id,
      blueprint_id,
      name ? String(name).trim().slice(0, 64) : null,
      tier ?? null,
      Math.min(Math.max(0, quantity ?? 0), 9999),
      Math.min(Math.max(0, resolvedWeaponValue), 9_999_999),
      notes ? String(notes).trim().slice(0, 512) : null,
    );
    const configId = result.lastInsertRowid;
    for (const row of modRows ?? []) insertMod.run(configId, row.mod_id, row.slot);
    return configId;
  });

  res.status(201).json(loadConfig(create()));
});

app.put('/api/gun-configs/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const current = db.prepare('SELECT * FROM gun_configs WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'gun config not found' });

  const { blueprint_id, name, tier, quantity, weapon_value, notes, mod_ids } = req.body;

  if (blueprint_id !== undefined) {
    if (!Number.isInteger(blueprint_id)) {
      return res.status(400).json({ error: 'blueprint_id must be an integer' });
    }
    const weaponError = validateWeapon(blueprint_id);
    if (weaponError) return res.status(400).json({ error: weaponError });
  }
  if (tier !== undefined && tier !== null && (!Number.isInteger(tier) || tier < 1 || tier > 4)) {
    return res.status(400).json({ error: 'tier must be null or an integer between 1 and 4' });
  }

  const { rows: modRows, error: modError } = resolveMods(mod_ids);
  if (modError) return res.status(400).json({ error: modError });

  const updateConfig = db.prepare(`
    UPDATE gun_configs SET
      blueprint_id = ?, name = ?, tier = ?, quantity = ?, weapon_value = ?, notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `);
  const clearMods = db.prepare('DELETE FROM gun_config_mods WHERE config_id = ?');
  const insertMod = db.prepare('INSERT INTO gun_config_mods (config_id, mod_id, slot) VALUES (?, ?, ?)');

  const update = db.transaction(() => {
    updateConfig.run(
      blueprint_id ?? current.blueprint_id,
      name !== undefined ? (name ? String(name).trim().slice(0, 64) : null) : current.name,
      tier !== undefined ? (tier ?? null) : current.tier,
      quantity !== undefined ? Math.min(Math.max(0, quantity), 9999) : current.quantity,
      weapon_value !== undefined ? Math.min(Math.max(0, weapon_value), 9_999_999) : current.weapon_value,
      notes !== undefined ? (notes ? String(notes).trim().slice(0, 512) : null) : current.notes,
      id,
    );
    // mod_ids omitted means "leave the mods alone"; an empty array strips them.
    if (modRows !== null) {
      clearMods.run(id);
      for (const row of modRows) insertMod.run(id, row.mod_id, row.slot);
    }
  });

  update();
  res.json(loadConfig(id));
});

// Dedicated counter endpoint so the +/- steppers don't have to round-trip the
// whole config. `delta` nudges, `quantity` sets outright.
app.patch('/api/gun-configs/:id/quantity', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const current = db.prepare('SELECT quantity FROM gun_configs WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'gun config not found' });

  const { delta, quantity } = req.body;
  let next;

  if (delta !== undefined) {
    if (!Number.isInteger(delta)) return res.status(400).json({ error: 'delta must be an integer' });
    next = (current.quantity || 0) + delta;
  } else if (quantity !== undefined) {
    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'quantity must be a non-negative integer' });
    }
    next = quantity;
  } else {
    return res.status(400).json({ error: 'provide delta or quantity' });
  }

  db.prepare("UPDATE gun_configs SET quantity = ?, updated_at = datetime('now') WHERE id = ?")
    .run(Math.min(Math.max(0, next), 9999), id);

  res.json(loadConfig(id));
});

app.delete('/api/gun-configs/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const result = db.prepare('DELETE FROM gun_configs WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'gun config not found' });

  res.status(204).end();
});

app.get('/api/reports/gun-configs', (req, res) => {
  const characters = db.prepare('SELECT * FROM characters ORDER BY sort_order, created_at').all();
  const configIds = db.prepare('SELECT id, character_id FROM gun_configs ORDER BY created_at, id').all();

  const byCharacter = new Map(characters.map(c => [c.id, []]));
  for (const { id, character_id } of configIds) {
    const config = loadConfig(id);
    if (byCharacter.has(character_id)) byCharacter.get(character_id).push(config);
  }

  const rows = characters.map(c => {
    const configs = byCharacter.get(c.id) ?? [];
    return {
      character_id: c.id,
      character_name: c.name,
      character_label: c.label,
      character_color: c.color,
      config_count: configs.length,
      total_guns: configs.reduce((sum, cfg) => sum + (cfg.quantity || 0), 0),
      total_value: configs.reduce((sum, cfg) => sum + cfg.total_value, 0),
      configs,
    };
  });

  // Which weapons are built most often, across every character.
  const weaponBreakdown = db.prepare(`
    SELECT
      b.id as blueprint_id, b.name as weapon_name, b.slug as weapon_slug,
      COUNT(gc.id)                        as config_count,
      COALESCE(SUM(gc.quantity), 0)       as total_guns
    FROM gun_configs gc
    JOIN blueprints b ON b.id = gc.blueprint_id
    GROUP BY b.id
    ORDER BY total_guns DESC, b.name COLLATE NOCASE
  `).all();

  res.json({
    characters: rows,
    weapons: weaponBreakdown,
    totals: {
      config_count: rows.reduce((s, r) => s + r.config_count, 0),
      total_guns: rows.reduce((s, r) => s + r.total_guns, 0),
      total_value: rows.reduce((s, r) => s + r.total_value, 0),
    },
  });
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
