'use strict';

/**
 * Vision sync API — used by the arc-vision desktop agent (agent/ in this repo),
 * which reads the in-game stash with screen capture + computer vision.
 *
 *   GET  /api/vision/catalog             every trackable item with its icon URL
 *   POST /api/vision/sync                preview or apply observed counts
 *   GET  /api/vision/syncs               history of applied syncs
 *   POST /api/vision/syncs/:id/revert    put a sync's values back
 *
 * Counts map onto the existing tracking tables. Blueprints and stencils write
 * the held-copy count to `extras` and never touch `learned`; everything else
 * writes `count`. Items the agent did not see are left alone, so a partial
 * scan never zeroes anything.
 */

const fs = require('fs');
const path = require('path');

const MAX_COUNT = 9999;
const MAX_ITEMS = 1000;
const ICON_EXTS = ['png', 'webp'];

// type → where the item lives and which column holds its count
const TYPES = {
  blueprint: {
    table: 'blueprints', tracking: 'blueprint_tracking', fk: 'blueprint_id', field: 'extras',
    extraCols: 'category, NULL AS rarity', where: 'WHERE in_game = 1',
  },
  stencil: {
    table: 'stencils', tracking: 'stencil_tracking', fk: 'stencil_id', field: 'extras',
    extraCols: "'stencils' AS category, rarity", where: '',
  },
  arc_part: {
    table: 'arc_parts', tracking: 'arc_parts_tracking', fk: 'part_id', field: 'count',
    extraCols: "'arc_parts' AS category, rarity", where: '',
  },
  amplification: {
    table: 'amplification_components', tracking: 'amplification_tracking', fk: 'component_id', field: 'count',
    extraCols: "kind AS category, rarity", where: '',
  },
  workshop_material: {
    table: 'workshop_materials', tracking: 'workshop_material_tracking', fk: 'material_id', field: 'count',
    extraCols: "'workshop' AS category, NULL AS rarity", where: '',
  },
};

function iconInfo(iconsDir, slug) {
  const ext = ICON_EXTS.find(e => fs.existsSync(path.join(iconsDir, `${slug}.${e}`)));
  return {
    icon_url: ext ? `/icons/${slug}.${ext}` : null,
    // Stand-ins are a shared generic image (see scripts/download-icons.js), so
    // they can't tell items apart; the agent relies on taught templates instead.
    icon_standin: fs.existsSync(path.join(iconsDir, `${slug}.standin`)),
  };
}

module.exports = function registerVisionRoutes(app, db, { iconsDir }) {
  const lookups = {};
  const readers = {};
  const writers = {};
  for (const [type, t] of Object.entries(TYPES)) {
    lookups[type] = db.prepare(`SELECT id, name FROM ${t.table} WHERE id = ?`);
    readers[type] = db.prepare(
      `SELECT ${t.field} AS value FROM ${t.tracking} WHERE character_id = ? AND ${t.fk} = ?`
    );
    // Upserts touch only the count column, so `learned` survives on blueprints/stencils.
    writers[type] = db.prepare(`
      INSERT INTO ${t.tracking} (character_id, ${t.fk}, ${t.field}, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(character_id, ${t.fk}) DO UPDATE SET
        ${t.field} = excluded.${t.field},
        updated_at = excluded.updated_at
    `);
  }
  const characterExists = db.prepare('SELECT id FROM characters WHERE id = ?');
  const insertSync = db.prepare(
    'INSERT INTO vision_syncs (character_id, source, changes) VALUES (?, ?, ?)'
  );

  // ── Catalog ────────────────────────────────────────────────────────────────
  app.get('/api/vision/catalog', (req, res) => {
    const items = [];
    for (const [type, t] of Object.entries(TYPES)) {
      const rows = db.prepare(
        `SELECT id, name, slug, ${t.extraCols} FROM ${t.table} ${t.where} ORDER BY sort_order, name`
      ).all();
      for (const r of rows) {
        items.push({ type, id: r.id, name: r.name, slug: r.slug, category: r.category, rarity: r.rarity, ...iconInfo(iconsDir, r.slug) });
      }
    }
    res.json({ types: Object.keys(TYPES), items });
  });

  // ── Sync (preview or apply) ────────────────────────────────────────────────
  app.post('/api/vision/sync', (req, res) => {
    const { character_id, items, apply, source } = req.body || {};

    if (!Number.isInteger(character_id)) {
      return res.status(400).json({ error: 'character_id must be an integer' });
    }
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }
    if (items.length > MAX_ITEMS) {
      return res.status(400).json({ error: `too many items (max ${MAX_ITEMS})` });
    }
    if (source !== undefined && (typeof source !== 'string' || source.length > 100)) {
      return res.status(400).json({ error: 'source must be a string of at most 100 characters' });
    }
    if (!characterExists.get(character_id)) {
      return res.status(404).json({ error: 'character not found' });
    }

    // Several stacks of one item arrive as separate entries; they add up.
    const totals = new Map();
    const unknown = [];
    for (const [i, it] of items.entries()) {
      if (!it || !TYPES[it.type] || !Number.isInteger(it.id)) {
        return res.status(400).json({ error: `items[${i}] needs a valid type and integer id` });
      }
      if (!Number.isInteger(it.count) || it.count < 0) {
        return res.status(400).json({ error: `items[${i}].count must be a non-negative integer` });
      }
      const row = lookups[it.type].get(it.id);
      if (!row) { unknown.push({ type: it.type, id: it.id }); continue; }
      const key = `${it.type}:${it.id}`;
      const prev = totals.get(key);
      totals.set(key, { type: it.type, id: it.id, name: row.name, count: (prev ? prev.count : 0) + it.count });
    }

    const changes = [];
    let unchanged = 0;
    for (const t of totals.values()) {
      const cur = readers[t.type].get(character_id, t.id);
      const before = cur ? cur.value : 0;
      const after = Math.min(t.count, MAX_COUNT);
      if (before === after) { unchanged++; continue; }
      changes.push({ type: t.type, id: t.id, name: t.name, field: TYPES[t.type].field, before, after });
    }

    if (!apply || changes.length === 0) {
      return res.json({ applied: false, sync_id: null, changes, unchanged, unknown });
    }

    const syncId = db.transaction(() => {
      for (const c of changes) writers[c.type].run(character_id, c.id, c.after);
      return insertSync.run(character_id, source || 'arc-vision', JSON.stringify(changes)).lastInsertRowid;
    })();

    res.json({ applied: true, sync_id: Number(syncId), changes, unchanged, unknown });
  });

  // ── History ────────────────────────────────────────────────────────────────
  app.get('/api/vision/syncs', (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const characterId = req.query.character_id ? parseInt(req.query.character_id, 10) : null;
    if (req.query.character_id && !characterId) {
      return res.status(400).json({ error: 'invalid character_id' });
    }
    const rows = db.prepare(`
      SELECT vs.*, c.name AS character_name
      FROM vision_syncs vs
      JOIN characters c ON c.id = vs.character_id
      ${characterId ? 'WHERE vs.character_id = ?' : ''}
      ORDER BY vs.id DESC
      LIMIT ?
    `).all(...(characterId ? [characterId, limit] : [limit]));
    res.json(rows.map(r => ({ ...r, changes: JSON.parse(r.changes) })));
  });

  // ── Revert ─────────────────────────────────────────────────────────────────
  // Restores `before` only where the value still equals what the sync wrote,
  // so edits made after the sync (by hand or by a later sync) are kept.
  app.post('/api/vision/syncs/:id/revert', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'invalid sync id' });
    const sync = db.prepare('SELECT * FROM vision_syncs WHERE id = ?').get(id);
    if (!sync) return res.status(404).json({ error: 'sync not found' });
    if (sync.reverted_at) return res.status(409).json({ error: 'sync already reverted' });

    const result = db.transaction(() => {
      const reverted = [];
      const skipped = [];
      for (const c of JSON.parse(sync.changes)) {
        if (!TYPES[c.type]) continue;
        const cur = readers[c.type].get(sync.character_id, c.id);
        const value = cur ? cur.value : 0;
        if (value !== c.after) { skipped.push({ ...c, current: value }); continue; }
        writers[c.type].run(sync.character_id, c.id, c.before);
        reverted.push(c);
      }
      db.prepare("UPDATE vision_syncs SET reverted_at = datetime('now') WHERE id = ?").run(id);
      return { reverted, skipped };
    })();

    res.json({ sync_id: id, ...result });
  });
};

module.exports.TYPES = TYPES;
