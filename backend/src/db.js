'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const BLUEPRINTS = require('./blueprints');
const ARC_PARTS = require('./arc-parts');
const WORKSHOP_STATIONS = require('./workshop');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'arc-tracker.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS blueprints (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL UNIQUE,
      slug          TEXT    NOT NULL UNIQUE,
      category      TEXT    NOT NULL,
      map           TEXT,
      condition     TEXT,
      containers    TEXT,
      quest_reward  TEXT,
      trials_reward INTEGER DEFAULT 0,
      in_game       INTEGER DEFAULT 1,
      sort_order    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS characters (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      label        TEXT,
      notes        TEXT,
      color        TEXT    NOT NULL DEFAULT '#3b82f6',
      sort_order   INTEGER DEFAULT 0,
      nomad_stash  INTEGER DEFAULT 0,
      parent_id    INTEGER REFERENCES characters(id) ON DELETE SET NULL,
      created_at   TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blueprint_tracking (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      blueprint_id INTEGER NOT NULL,
      learned      INTEGER DEFAULT 0,
      extras       INTEGER DEFAULT 0,
      updated_at   TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (blueprint_id) REFERENCES blueprints(id),
      UNIQUE(character_id, blueprint_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tracking_char   ON blueprint_tracking(character_id);
    CREATE INDEX IF NOT EXISTS idx_tracking_bp     ON blueprint_tracking(blueprint_id);
    CREATE INDEX IF NOT EXISTS idx_blueprints_cat  ON blueprints(category);

    CREATE TABLE IF NOT EXISTS arc_parts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      slug       TEXT    NOT NULL UNIQUE,
      rarity     TEXT    NOT NULL,
      source     TEXT    NOT NULL,
      sell_value INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS arc_parts_tracking (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      part_id      INTEGER NOT NULL,
      count        INTEGER DEFAULT 0,
      updated_at   TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (part_id)      REFERENCES arc_parts(id),
      UNIQUE(character_id, part_id)
    );

    CREATE INDEX IF NOT EXISTS idx_arc_tracking_char ON arc_parts_tracking(character_id);
    CREATE INDEX IF NOT EXISTS idx_arc_tracking_part ON arc_parts_tracking(part_id);

    CREATE TABLE IF NOT EXISTS workshop_stations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      slug       TEXT    NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workshop_materials (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      slug       TEXT    NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    );

    -- item_type/item_id is a lightweight polymorphic reference: 'material' points
    -- at workshop_materials, 'arc_part' points at the existing arc_parts table so
    -- items tracked in both places (e.g. Bastion Cell) share one count.
    CREATE TABLE IF NOT EXISTS workshop_requirements (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id   INTEGER NOT NULL,
      level        INTEGER NOT NULL,
      item_type    TEXT    NOT NULL CHECK (item_type IN ('material', 'arc_part')),
      item_id      INTEGER NOT NULL,
      qty_required INTEGER NOT NULL,
      sort_order   INTEGER DEFAULT 0,
      FOREIGN KEY (station_id) REFERENCES workshop_stations(id),
      UNIQUE(station_id, level, item_type, item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workshop_req_station ON workshop_requirements(station_id);

    CREATE TABLE IF NOT EXISTS workshop_material_tracking (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      material_id  INTEGER NOT NULL,
      count        INTEGER DEFAULT 0,
      updated_at   TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES workshop_materials(id),
      UNIQUE(character_id, material_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workshop_mat_tracking_char ON workshop_material_tracking(character_id);
    CREATE INDEX IF NOT EXISTS idx_workshop_mat_tracking_mat  ON workshop_material_tracking(material_id);

    CREATE TABLE IF NOT EXISTS workshop_station_progress (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      station_id   INTEGER NOT NULL,
      level        INTEGER DEFAULT 0,
      updated_at   TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (station_id) REFERENCES workshop_stations(id),
      UNIQUE(character_id, station_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workshop_progress_char ON workshop_station_progress(character_id);
  `);
}

function seedBlueprints() {
  const categoryOrder = ['weapons', 'mods', 'explosives', 'medicine', 'augments', 'utility', 'crafting'];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO blueprints
      (name, slug, category, map, condition, containers, quest_reward, trials_reward, in_game, sort_order)
    VALUES
      (@name, @slug, @category, @map, @condition, @containers, @quest_reward, @trials_reward, @in_game, @sort_order)
  `);

  // Sync mutable fields so seed corrections are reflected in existing databases.
  const syncFields = db.prepare(`
    UPDATE blueprints
    SET category = @category, in_game = @in_game
    WHERE name = @name AND (category != @category OR in_game != @in_game)
  `);

  const upsertMany = db.transaction((blueprints) => {
    blueprints.forEach((bp, i) => {
      const in_game = bp.in_game === false ? 0 : 1;
      insert.run({
        name: bp.name,
        slug: slugify(bp.name),
        category: bp.category,
        map: bp.map || 'All',
        condition: bp.condition || 'Any',
        containers: bp.containers || null,
        quest_reward: bp.quest_reward || null,
        trials_reward: bp.trials_reward ? 1 : 0,
        in_game,
        sort_order: categoryOrder.indexOf(bp.category) * 100 + i,
      });
      syncFields.run({ name: bp.name, category: bp.category, in_game });
    });
  });

  const before = db.prepare('SELECT COUNT(*) as c FROM blueprints').get().c;
  upsertMany(BLUEPRINTS);
  const after = db.prepare('SELECT COUNT(*) as c FROM blueprints').get().c;
  if (after > before) console.log(`Seeded ${after - before} new blueprint(s) (total: ${after})`);
}

function seedArcParts() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO arc_parts (name, slug, rarity, source, sell_value, sort_order)
    VALUES (@name, @slug, @rarity, @source, @sell_value, @sort_order)
  `);

  const syncFields = db.prepare(`
    UPDATE arc_parts
    SET rarity = @rarity, source = @source, sell_value = @sell_value
    WHERE name = @name AND (rarity != @rarity OR source != @source OR sell_value != @sell_value)
  `);

  const upsertMany = db.transaction((parts) => {
    parts.forEach((p) => {
      insert.run({
        name: p.name,
        slug: slugify(p.name),
        rarity: p.rarity,
        source: p.source,
        sell_value: p.sell_value ?? 0,
        sort_order: p.sort_order,
      });
      syncFields.run({ name: p.name, rarity: p.rarity, source: p.source, sell_value: p.sell_value ?? 0 });
    });
  });

  const before = db.prepare('SELECT COUNT(*) as c FROM arc_parts').get().c;
  upsertMany(ARC_PARTS);
  const after = db.prepare('SELECT COUNT(*) as c FROM arc_parts').get().c;
  if (after > before) console.log(`Seeded ${after - before} new ARC part(s) (total: ${after})`);
}

function seedWorkshop() {
  const insertStation = db.prepare(`
    INSERT OR IGNORE INTO workshop_stations (name, slug, sort_order)
    VALUES (@name, @slug, @sort_order)
  `);
  const getStationByName = db.prepare('SELECT id FROM workshop_stations WHERE name = ?');

  const insertMaterial = db.prepare(`
    INSERT OR IGNORE INTO workshop_materials (name, slug, sort_order)
    VALUES (@name, @slug, @sort_order)
  `);
  const getMaterialByName = db.prepare('SELECT id FROM workshop_materials WHERE name = ?');
  const getArcPartByName = db.prepare('SELECT id FROM arc_parts WHERE name = ?');

  const insertRequirement = db.prepare(`
    INSERT OR IGNORE INTO workshop_requirements
      (station_id, level, item_type, item_id, qty_required, sort_order)
    VALUES (@station_id, @level, @item_type, @item_id, @qty_required, @sort_order)
  `);
  const syncRequirement = db.prepare(`
    UPDATE workshop_requirements SET qty_required = @qty_required
    WHERE station_id = @station_id AND level = @level AND item_type = @item_type AND item_id = @item_id
      AND qty_required != @qty_required
  `);

  let materialSortOrder = 0;

  const seedAll = db.transaction((stations) => {
    stations.forEach((station, sIdx) => {
      insertStation.run({ name: station.name, slug: slugify(station.name), sort_order: station.sort_order ?? sIdx * 10 });
      const stationRow = getStationByName.get(station.name);

      station.levels.forEach(({ level, materials }) => {
        materials.forEach((mat, mIdx) => {
          const arcPart = getArcPartByName.get(mat.name);
          let itemType;
          let itemId;

          if (arcPart) {
            itemType = 'arc_part';
            itemId = arcPart.id;
          } else {
            let materialRow = getMaterialByName.get(mat.name);
            if (!materialRow) {
              insertMaterial.run({ name: mat.name, slug: slugify(mat.name), sort_order: materialSortOrder++ });
              materialRow = getMaterialByName.get(mat.name);
            }
            itemType = 'material';
            itemId = materialRow.id;
          }

          const reqData = {
            station_id: stationRow.id,
            level,
            item_type: itemType,
            item_id: itemId,
            qty_required: mat.qty,
            sort_order: mIdx,
          };
          insertRequirement.run(reqData);
          syncRequirement.run(reqData);
        });
      });
    });
  });

  const before = db.prepare('SELECT COUNT(*) as c FROM workshop_requirements').get().c;
  seedAll(WORKSHOP_STATIONS);
  const after = db.prepare('SELECT COUNT(*) as c FROM workshop_requirements').get().c;
  if (after > before) console.log(`Seeded ${after - before} workshop requirement row(s)`);
}

function runMigrations() {
  const charCols = db.pragma('table_info(characters)').map(c => c.name);
  if (!charCols.includes('nomad_stash')) {
    db.exec('ALTER TABLE characters ADD COLUMN nomad_stash INTEGER DEFAULT 0');
  }

  const arcCols = db.pragma('table_info(arc_parts)').map(c => c.name);
  if (!arcCols.includes('sell_value')) {
    db.exec('ALTER TABLE arc_parts ADD COLUMN sell_value INTEGER DEFAULT 0');
  }

  if (!charCols.includes('parent_id')) {
    db.exec('ALTER TABLE characters ADD COLUMN parent_id INTEGER REFERENCES characters(id) ON DELETE SET NULL');
  }

  const updatedCharCols = db.pragma('table_info(characters)').map(c => c.name);
  if (updatedCharCols.includes('parent_id')) {
    db.exec('CREATE INDEX IF NOT EXISTS idx_characters_parent ON characters(parent_id)');
  }
}

initSchema();
runMigrations();
seedBlueprints();
seedArcParts();
seedWorkshop();

module.exports = db;
