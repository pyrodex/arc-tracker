'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const BLUEPRINTS = require('./blueprints');

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

function runMigrations() {
  const cols = db.pragma('table_info(characters)').map(c => c.name);
  if (!cols.includes('nomad_stash')) {
    db.exec('ALTER TABLE characters ADD COLUMN nomad_stash INTEGER DEFAULT 0');
  }
}

initSchema();
runMigrations();
seedBlueprints();

module.exports = db;
